require("dotenv").config();
const express = require("express");
const path = require("path");
const admin = require("firebase-admin");
const Airtable = require("airtable");
const Stripe = require("stripe");

/************************************************************
 * 1) FIREBASE ADMIN SETUP
 ************************************************************/
console.log("Initializing Firebase Admin...");
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY
	? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
	: undefined,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};
console.log("Firebase Admin credentials loaded.");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
console.log("Firebase Admin initialized.");

/************************************************************
 * 2) AIRTABLE SETUP
 ************************************************************/
console.log("Setting up Airtable...");
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);
console.log("Airtable setup complete.");

/************************************************************
 * 3) EXPRESS APP SETUP
 ************************************************************/
const app = express();
app.use(express.json());

// Middleware to verify the Firebase token
async function verifyFirebaseToken(req, res, next) {
  console.log("Verifying Firebase token...");
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
	console.log("No Firebase token found in request headers.");
	return res.status(401).json({ error: "Unauthorized" });
  }
  try {
	const decoded = await admin.auth().verifyIdToken(token);
	console.log("Firebase token verified successfully:", {
	  uid: decoded.uid,
	  email: decoded.email,
	});
	req.firebaseUser = decoded;
	next();
  } catch (err) {
	console.error("Error verifying Firebase token:", err);
	return res.status(401).json({ error: "Unauthorized" });
  }
}

/************************************************************
 * 4) HELPERS: GET/CREATE USER + FETCH EVENTS
 ************************************************************/
async function getOrCreateUserByEmail(email) {
  console.log(`Fetching or creating user by email: ${email}`);
  const tableName = "Users";

  try {
	console.log(`Looking up user in Airtable table "${tableName}" by email...`);
	const records = await base(tableName)
	  .select({ filterByFormula: `{Email} = "${email}"`, maxRecords: 1 })
	  .firstPage();

	if (records.length > 0) {
	  console.log("Found existing user in Airtable:", records[0].id);
	  return records[0];
	}

	console.log("No user found. Creating new user in Airtable...");
	const newRecord = await base(tableName).create([{ fields: { Email: email } }]);
	console.log("New user created successfully:", newRecord[0].id);
	return newRecord[0];
  } catch (error) {
	console.error("Error interacting with Airtable (Users table):", error);
	throw new Error("Airtable interaction failed");
  }
}

async function getEventsForUser(userRecord) {
  const userID = userRecord.get("UserID");
  console.log(`Fetching events for user with UserID: ${userID}`);

  if (!userID) {
	console.log("No UserID found in user record. Returning empty events array.");
	return [];
  }

  const tableName = "Events";

  try {
	console.log(`Fetching events from Airtable table "${tableName}"...`);
	const records = await base(tableName)
	  .select({ filterByFormula: `{UserID} = "${userID}"` })
	  .firstPage();

	console.log(`Fetched ${records.length} events for UserID: ${userID}`);
	return records.map((rec) => ({
	  id: rec.id,
	  EventID: rec.get("EventID") || "",
	  UserID: rec.get("UserID") || "",
	  StartDate: rec.get("StartDate") || "",
	  Cadence: rec.get("Cadence") || "",
	}));
  } catch (error) {
	console.error("Error interacting with Airtable (Events table):", error);
	throw new Error("Airtable interaction failed");
  }
}

/************************************************************
 * 5) ROUTES
 ************************************************************/

/**
 * GET /get-events
 */
app.get("/get-events", verifyFirebaseToken, async (req, res) => {
  console.log("GET /get-events hit.");
  try {
	const userEmail = req.firebaseUser.email;
	console.log("User email from Firebase token:", userEmail);

	const userRecord = await getOrCreateUserByEmail(userEmail);
	const events = await getEventsForUser(userRecord);

	console.log(`Returning ${events.length} events.`);
	return res.json({ events });
  } catch (error) {
	console.error("Error in GET /get-events:", error);
	return res.status(500).json({ error: "Unable to fetch events" });
  }
});

/**
 * GET /get-subscribers
 */
app.get("/get-subscribers", verifyFirebaseToken, async (req, res) => {
  console.log("GET /get-subscribers hit.");
  try {
	const userEmail = req.firebaseUser.email;
	console.log("User email from Firebase token:", userEmail);

	const userRecord = await getOrCreateUserByEmail(userEmail);
	const userStripeKey = userRecord.get("StripeKey");
	if (!userStripeKey) {
	  console.log("No StripeKey found for this user in Airtable.");
	  return res.status(400).json({ error: "No StripeKey in Airtable record" });
	}

	console.log("Using StripeKey to fetch subscribers...");
	const stripe = new Stripe(userStripeKey);
	let allSubscribers = [];
	let hasMore = true;
	let lastSubscriptionId = null;

	while (hasMore) {
	  console.log("Fetching subscribers batch...");
	  const params = {
		limit: 100,
		expand: ["data.customer", "data.discount", "data.plan.product"],
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
		  : "None",
	  }));

	  allSubscribers = [...allSubscribers, ...subscribers];
	  hasMore = subscriptions.has_more;
	  if (hasMore) {
		lastSubscriptionId = subscriptions.data[subscriptions.data.length - 1].id;
	  }
	}
	console.log(`Fetched ${allSubscribers.length} subscribers.`);
	return res.json({ subscribers: allSubscribers });
  } catch (error) {
	console.error("Error in GET /get-subscribers:", error);
	return res.status(500).json({ error: "Unable to fetch subscribers" });
  }
});

/**
 * GET /get-user
 */
app.get("/get-user", verifyFirebaseToken, async (req, res) => {
  console.log("GET /get-user hit.");
  try {
	const userEmail = req.firebaseUser.email;
	console.log("User email from Firebase token:", userEmail);
	const userRecord = await getOrCreateUserByEmail(userEmail);
	const stripeKey = userRecord.get("StripeKey");
	const userID = userRecord.get("UserID");
	console.log("Returning user info:", { stripeKey, userID });
	res.json({ stripeKey, userID });
  } catch (error) {
	console.error("Error in GET /get-user:", error);
	res.status(500).json({ error: "Failed to fetch user info" });
  }
});

/**
 * POST /save-stripe-key
 */
app.post("/save-stripe-key", verifyFirebaseToken, async (req, res) => {
  console.log("POST /save-stripe-key hit.");
  try {
	const { stripeKey } = req.body;
	if (!stripeKey) {
	  console.log("Missing Stripe Key in request body.");
	  return res.status(400).json({ error: "Missing Stripe Key" });
	}
	const userEmail = req.firebaseUser.email;
	console.log("User email from Firebase token:", userEmail);
	const userRecord = await getOrCreateUserByEmail(userEmail);
	console.log("Saving StripeKey to Airtable...");
	await base("Users").update(userRecord.id, { StripeKey: stripeKey });
	console.log("StripeKey saved successfully.");
	return res.json({ message: "Stripe Key saved successfully" });
  } catch (error) {
	console.error("Error in POST /save-stripe-key:", error);
	return res.status(500).json({ error: "Unable to save Stripe Key" });
  }
});

/**
 * GET /stripe/callback
 * Handles the OAuth callback from Stripe Connect.
 * Exchanges the authorization code for an access token and updates the user's Airtable record.
 */
app.get("/stripe/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
	console.error("Missing code or state in Stripe OAuth callback");
	return res.status(400).send("Missing required parameters.");
  }
  try {
	const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
	const tokenResponse = await stripe.oauth.token({
	  grant_type: 'authorization_code',
	  code: code,
	});
	const stripeKey = tokenResponse.access_token;
	console.log("Stripe OAuth token response received:", tokenResponse);
	const userEmail = state; // In production, validate this state value securely.
	const userRecord = await getOrCreateUserByEmail(userEmail);
	await base("Users").update(userRecord.id, { StripeKey: stripeKey });
	console.log(`Stripe key updated for user ${userEmail}`);
	res.redirect("/");
  } catch (error) {
	console.error("Error during Stripe OAuth callback:", error);
	res.status(500).send("Stripe OAuth failed");
  }
});

/************************************************************
 * 6) SERVE REACT BUILD IN PRODUCTION
 ************************************************************/
if (process.env.NODE_ENV === "production") {
  console.log("Serving static files from build directory...");
  app.use(express.static(path.join(__dirname, "build")));
  app.get("*", (req, res) => {
	console.log("Serving index.html for:", req.url);
	res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

/************************************************************
 * 7) START SERVER
 ************************************************************/
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
