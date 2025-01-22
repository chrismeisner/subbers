require('dotenv').config();
const express = require("express");
const path = require("path");
const admin = require("firebase-admin");
const Airtable = require("airtable");
const Stripe = require("stripe");

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
	console.log("No Firebase token found in request headers.");
	return res.status(401).json({ error: "Unauthorized" });
  }
  try {
	const decoded = await admin.auth().verifyIdToken(token);
	req.firebaseUser = decoded;
	console.log("Firebase token verified! UID:", decoded.uid, "Email:", decoded.email);
	next();
  } catch (err) {
	console.log("Invalid Firebase token:", err);
	return res.status(401).json({ error: "Unauthorized" });
  }
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

/**
 * We assume you have a "Users" table with a field "UserID" (a string),
 * and you're either storing it or creating it on the fly. 
 * For simplicity, we’ll do an auto-create approach here.
 */
async function getOrCreateUserByEmail(email) {
  console.log("getOrCreateUserByEmail called with:", email);
  const tableName = "Users"; // ensure this matches your actual table name

  const records = await base(tableName)
	.select({
	  filterByFormula: `{Email} = "${email}"`,
	  maxRecords: 1
	})
	.firstPage();

  if (records && records.length > 0) {
	console.log("Found existing Airtable user record ID:", records[0].id);
	return records[0];
  }

  console.log("No user record found. Creating new record for:", email);
  const newRecords = await base(tableName).create([
	{
	  fields: {
		Email: email,
		// If you store your own custom user ID, generate it here or 
		// rely on a formula field in Airtable, etc.
		// For example: UserID: "usr_" + nanoid() (just an example).
	  }
	}
  ]);
  const newRec = newRecords[0];
  console.log("New user record created with ID:", newRec.id);
  return newRec;
}

/**
 * GET /get-events
 *   - Verifies the user's Firebase token
 *   - Looks up the user or creates them
 *   - Reads the user’s "UserID" field
 *   - Fetches matching events from the "Events" table
 */
async function getEventsForUser(userRecord) {
  // We assume the userRecord has a field named "UserID".
  // If you only rely on Airtable's record ID, you might do something else,
  // but we'll assume a real "UserID" field in the table.
  const userID = userRecord.get("UserID");

  if (!userID) {
	// In case your user doesn't have a UserID yet, you might
	// handle that or create one. For now, return an empty array or an error.
	return [];
  }

  console.log("Fetching events for userID:", userID);

  const eventsTableName = "Events"; // ensure this matches your actual table name
  const records = await base(eventsTableName)
	.select({
	  filterByFormula: `{UserID} = "${userID}"`
	})
	.firstPage();

  // Map to a plain array of event objects
  const events = records.map((rec) => {
	return {
	  id: rec.id,
	  EventID: rec.get("EventID") || "",
	  UserID: rec.get("UserID") || "",
	  StartDate: rec.get("StartDate") || "",
	  Cadence: rec.get("Cadence") || ""
	};
  });

  return events;
}

const app = express();
app.use(express.json());

// GET /get-events route
app.get("/get-events", verifyFirebaseToken, async (req, res) => {
  try {
	const userEmail = req.firebaseUser.email;
	if (!userEmail) {
	  return res.status(400).json({ error: "No email found in token" });
	}

	const userRecord = await getOrCreateUserByEmail(userEmail);
	const events = await getEventsForUser(userRecord);

	return res.json({ events });
  } catch (error) {
	console.error("Error fetching events:", error);
	return res.status(500).json({ error: "Unable to fetch events" });
  }
});

// GET /get-subscribers route (unchanged, except we also call getOrCreateUserByEmail)
app.get("/get-subscribers", verifyFirebaseToken, async (req, res) => {
  try {
	const userEmail = req.firebaseUser.email;
	if (!userEmail) {
	  return res.status(400).json({ error: "No email found in token" });
	}
	const userRecord = await getOrCreateUserByEmail(userEmail);

	const userStripeKey = userRecord.get("StripeKey");
	if (!userStripeKey) {
	  return res.status(400).json({ error: "No StripeKey in Airtable record" });
	}

	const stripe = new Stripe(userStripeKey);

	let allSubscribers = [];
	let hasMore = true;
	let lastSubscriptionId = null;

	while (hasMore) {
	  const params = {
		status: "active",
		limit: 100,
		expand: ["data.customer", "data.discount", "data.plan.product"]
	  };
	  if (lastSubscriptionId) {
		params.starting_after = lastSubscriptionId;
	  }
	  const subscriptions = await stripe.subscriptions.list(params);
	  const subscribers = subscriptions.data.map((subscription) => ({
		id: subscription.customer.id,
		email: subscription.customer.email || "N/A",
		name: subscription.customer.name || "N/A",
		phone: subscription.customer.phone || "N/A",
		subscription_status: subscription.status,
		plan_name: subscription.plan.nickname || "N/A",
		product_name: subscription.plan.product.name || "N/A",
		amount_charged: (subscription.plan.amount / 100).toFixed(2),
		currency: subscription.plan.currency.toUpperCase(),
		current_period_end: new Date(subscription.current_period_end * 1000).toLocaleDateString(),
		trial_end: subscription.trial_end
		  ? new Date(subscription.trial_end * 1000).toLocaleDateString()
		  : "N/A",
		subscription_start: new Date(subscription.start_date * 1000).toLocaleDateString(),
		billing_interval: subscription.plan.interval,
		discount: subscription.discount
		  ? `${subscription.discount.coupon.percent_off}% off`
		  : "None"
	  }));

	  allSubscribers.push(...subscribers);
	  hasMore = subscriptions.has_more;
	  if (hasMore) {
		lastSubscriptionId = subscriptions.data[subscriptions.data.length - 1].id;
	  }
	}

	return res.json({ subscribers: allSubscribers });
  } catch (error) {
	console.error("Error fetching subscribers:", error);
	return res.status(500).json({ error: "Unable to fetch subscribers" });
  }
});

// (Optional) Save Stripe Key route, etc., remain the same
// app.post("/save-stripe-key", ...)

// Serve React build in production
app.use(express.static(path.join(__dirname, "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const PORT = process.env.SERVER_PORT || 5000;
app.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
