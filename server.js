// server.js

require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const admin = require("firebase-admin");
const Airtable = require("airtable");
const Stripe = require("stripe");
const cron = require("node-cron");
// If your Node version doesn’t have global fetch, uncomment the next line:
// const fetch = require("node-fetch");

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
app.use(
  cors({
	origin: "http://localhost:3000",
	credentials: true,
  })
);
app.use(express.json());

// Middleware to verify Firebase ID token
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.replace("Bearer ", "");
  if (!idToken) {
	return res.status(401).json({ error: "Unauthorized" });
  }
  try {
	const decoded = await admin.auth().verifyIdToken(idToken);
	req.firebaseUser = decoded;
	next();
  } catch (err) {
	console.error("Firebase auth error:", err);
	return res.status(401).json({ error: "Unauthorized" });
  }
}

/************************************************************
 * 4) HELPER: CALCULATE NEXT OCCURRENCE
 ************************************************************/
function calculateNextOccurrence(
  startDate,
  recurrenceType,
  interval,
  recurrenceEnd,
  timeZone
) {
  let next = new Date(startDate);
  const now = new Date();

  if (recurrenceType === "weekly") {
	while (next <= now) {
	  next.setDate(next.getDate() + 7 * interval);
	}
  }

  if (recurrenceEnd && next > new Date(recurrenceEnd)) {
	return null;
  }
  return next.toISOString();
}

/************************************************************
 * 5) HELPER: GET OR CREATE USER
 ************************************************************/
async function getOrCreateUserByEmail(email) {
  const table = base("Users");
  const [record] = await table
	.select({ filterByFormula: `{Email} = "${email}"`, maxRecords: 1 })
	.firstPage();
  if (record) return record;
  const [newRec] = await table.create([{ fields: { Email: email } }]);
  return newRec;
}

async function getEventsForUser(userRecord) {
  const userID = userRecord.get("UserID");
  if (!userID) return [];
  const records = await base("Events")
	.select({ filterByFormula: `{UserID} = "${userID}"` })
	.firstPage();
  return records.map((rec) => {
	const startDate = rec.get("StartDate") || "";
	const type = rec.get("recurrenceType") || "";
	const interval = rec.get("interval") || 0;
	const end = rec.get("recurrenceEnd") || "";
	let next = rec.get("nextOccurrence") || "";
	if (type && interval) {
	  next = calculateNextOccurrence(startDate, type, interval, end, rec.get("timeZone"));
	}
	return {
	  id: rec.id,
	  eventTitle: rec.get("eventTitle") || rec.get("EventID") || "Untitled Event",
	  StartDate: startDate,
	  recurrenceType: type,
	  interval,
	  recurrenceEnd: end,
	  timeZone: rec.get("timeZone") || "UTC",
	  nextOccurrence: next,
	  product: rec.get("product") || "",
	  emailSubject: rec.get("emailSubject") || "",
	  emailMessage: rec.get("emailMessage") || "",
	  reminderOffset: rec.get("reminderOffset") || 60,
	  reminderEnabled: rec.get("reminderEnabled") || false,
	  lastReminderSent: rec.get("lastReminderSent") || "",
	};
  });
}

/************************************************************
 * 6) ROUTES
 ************************************************************/

// GET /get-events
app.get("/get-events", verifyFirebaseToken, async (req, res) => {
  try {
	const userRec = await getOrCreateUserByEmail(req.firebaseUser.email);
	const events = await getEventsForUser(userRec);
	res.json({ events });
  } catch (err) {
	console.error("GET /get-events error:", err);
	res.status(500).json({ error: "Unable to fetch events" });
  }
});

// POST /update-event-product
app.post("/update-event-product", verifyFirebaseToken, async (req, res) => {
  try {
	const { eventId, product } = req.body;
	if (!eventId || !product) {
	  return res.status(400).json({ error: "Missing eventId or product" });
	}
	await base("Events").update(eventId, { product });
	res.json({ message: "Event product updated successfully" });
  } catch (err) {
	console.error("POST /update-event-product error:", err);
	res.status(500).json({ error: "Failed to update event product" });
  }
});

// GET /get-subscribers
app.get("/get-subscribers", verifyFirebaseToken, async (req, res) => {
  try {
	const userRec = await getOrCreateUserByEmail(req.firebaseUser.email);
	const key = userRec.get("StripeKey");
	if (!key) return res.status(400).json({ error: "No StripeKey found" });

	const stripe = new Stripe(key);
	let subscribers = [];
	let hasMore = true;
	let lastId = null;

	while (hasMore) {
	  const params = { limit: 100, expand: ["data.customer", "data.plan.product", "data.discount"] };
	  if (lastId) params.starting_after = lastId;
	  const list = await stripe.subscriptions.list(params);
	  const mapped = list.data.map((sub) => ({
		id: sub.customer.id,
		email: sub.customer.email || "N/A",
		name: sub.customer.name || "N/A",
		phone: sub.customer.phone || "N/A",
		subscription_status: sub.status,
		plan_name: sub.plan.nickname || "N/A",
		product_name: sub.plan.product.name || "N/A",
		amount_charged: (sub.plan.amount / 100).toFixed(2),
		currency: sub.plan.currency.toUpperCase(),
		current_period_end: new Date(sub.current_period_end * 1000).toLocaleDateString(),
		trial_end: sub.trial_end
		  ? new Date(sub.trial_end * 1000).toLocaleDateString()
		  : "N/A",
		subscription_start: new Date(sub.start_date * 1000).toLocaleDateString(),
		billing_interval: sub.plan.interval,
		discount: sub.discount ? `${sub.discount.coupon.percent_off}% off` : "None",
	  }));
	  subscribers.push(...mapped);
	  hasMore = list.has_more;
	  lastId = hasMore ? list.data.slice(-1)[0].id : null;
	}

	res.json({ subscribers });
  } catch (err) {
	console.error("GET /get-subscribers error:", err);
	res.status(500).json({ error: "Unable to fetch subscribers" });
  }
});

// GET /get-user
app.get("/get-user", verifyFirebaseToken, async (req, res) => {
  try {
	const userRec = await getOrCreateUserByEmail(req.firebaseUser.email);
	res.json({
	  stripeKey: userRec.get("StripeKey") || "",
	  userID: userRec.get("UserID") || "",
	  zoomConnected: Boolean(userRec.get("ZoomAccessToken")),
	});
  } catch (err) {
	console.error("GET /get-user error:", err);
	res.status(500).json({ error: "Failed to fetch user info" });
  }
});

// POST /save-stripe-key
app.post("/save-stripe-key", verifyFirebaseToken, async (req, res) => {
  try {
	const { stripeKey } = req.body;
	if (!stripeKey) return res.status(400).json({ error: "Missing StripeKey" });
	const userRec = await getOrCreateUserByEmail(req.firebaseUser.email);
	await base("Users").update(userRec.id, { StripeKey: stripeKey });
	res.json({ message: "Stripe Key saved" });
  } catch (err) {
	console.error("POST /save-stripe-key error:", err);
	res.status(500).json({ error: "Unable to save StripeKey" });
  }
});

// GET /stripe/callback
app.get("/stripe/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send("Missing parameters");
  try {
	const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
	const { access_token } = await stripe.oauth.token({ grant_type: "authorization_code", code });
	const userRec = await getOrCreateUserByEmail(state);
	await base("Users").update(userRec.id, { StripeKey: access_token });
	res.redirect("/dashboard");
  } catch (err) {
	console.error("Stripe OAuth error:", err);
	res.status(500).send("Stripe OAuth failed");
  }
});


// ─── NEW ZOOM OAUTH ROUTES ───────────────────────────────────────────────────────

// GET /zoom/oauth-url
app.get("/zoom/oauth-url", verifyFirebaseToken, (req, res) => {
  const params = new URLSearchParams({
	response_type: "code",
	client_id: process.env.ZOOM_CLIENT_ID,
	redirect_uri: process.env.ZOOM_REDIRECT_URI,
	state: req.firebaseUser.email,
  });
  res.json({ url: `https://zoom.us/oauth/authorize?${params}` });
});

// GET /zoom/callback
app.get("/zoom/callback", async (req, res) => {
  const { code, state: userEmail } = req.query;
  if (!code) return res.status(400).send("Missing Zoom auth code");

  try {
	const tokenRes = await fetch(
	  `https://zoom.us/oauth/token?grant_type=authorization_code` +
		`&code=${code}` +
		`&redirect_uri=${encodeURIComponent(process.env.ZOOM_REDIRECT_URI)}`,
	  {
		method: "POST",
		headers: {
		  Authorization:
			"Basic " +
			Buffer.from(
			  `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
			).toString("base64"),
		},
	  }
	);
	const { access_token, refresh_token } = await tokenRes.json();

	// persist in Airtable
	const userRec = await getOrCreateUserByEmail(userEmail);
	await base("Users").update(userRec.id, {
	  ZoomAccessToken: access_token,
	  ZoomRefreshToken: refresh_token,
	});

	res.redirect("/dashboard");
  } catch (err) {
	console.error("Zoom OAuth callback error:", err);
	res.status(500).send("Zoom OAuth failed");
  }
});


/************************************************************
 * 7) REMINDER CRON JOB
 ************************************************************/
cron.schedule("* * * * *", async () => {
  try {
	const now = new Date();
	const recs = await base("Events")
	  .select({ filterByFormula: "reminderEnabled" })
	  .firstPage();

	for (let rec of recs) {
	  const start = rec.get("StartDate");
	  const offset = rec.get("reminderOffset") || 60;
	  const last = rec.get("lastReminderSent");
	  const remindAt = new Date(new Date(start).getTime() - offset * 60000);

	  if (now >= remindAt && (!last || new Date(last) < remindAt)) {
		await base("Events").update(rec.id, { lastReminderSent: now.toISOString() });
	  }
	}
  } catch (err) {
	console.error("Cron job error:", err);
  }
});

/************************************************************
 * 8) SERVE REACT BUILD & START SERVER
 ************************************************************/
app.use(express.static(path.join(__dirname, "build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
