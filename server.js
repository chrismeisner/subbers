require("dotenv").config();
const express = require("express");
const path = require("path");
const admin = require("firebase-admin");
const Airtable = require("airtable");
const Stripe = require("stripe");

// Firebase Admin Setup
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
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Airtable Setup
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

// Express App Setup
const app = express();
app.use(express.json());

// Middleware for Verifying Firebase Token
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
	return res.status(401).json({ error: "Unauthorized" });
  }
  try {
	const decoded = await admin.auth().verifyIdToken(token);
	req.firebaseUser = decoded;
	next();
  } catch (err) {
	console.error("Invalid Firebase token:", err);
	return res.status(401).json({ error: "Unauthorized" });
  }
}

// Routes
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

// Helper Functions
async function getOrCreateUserByEmail(email) {
  const tableName = "Users";
  const records = await base(tableName)
	.select({ filterByFormula: `{Email} = "${email}"`, maxRecords: 1 })
	.firstPage();

  if (records.length > 0) return records[0];
  
  const newRecord = await base(tableName).create([{ fields: { Email: email } }]);
  return newRecord[0];
}

async function getEventsForUser(userRecord) {
  const userID = userRecord.get("UserID");
  if (!userID) return [];

  const eventsTableName = "Events";
  const records = await base(eventsTableName)
	.select({ filterByFormula: `{UserID} = "${userID}"` })
	.firstPage();

  return records.map((rec) => ({
	id: rec.id,
	EventID: rec.get("EventID") || "",
	UserID: rec.get("UserID") || "",
	StartDate: rec.get("StartDate") || "",
	Cadence: rec.get("Cadence") || "",
  }));
}

// Serve Static Files in Production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));
  app.get("*", (req, res) =>
	res.sendFile(path.join(__dirname, "build", "index.html"))
  );
}

// Start Server on Port 4200
const PORT = process.env.PORT || 4200;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
