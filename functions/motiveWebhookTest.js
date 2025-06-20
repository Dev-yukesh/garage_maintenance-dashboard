const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase only once
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Webhook testing function — saves raw JSON without filtering
const motiveWebhookTest = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const data = req.body;
    console.log("🔥 Test webhook received at", new Date().toISOString());

    // Save entire raw payload to Firestore collection "motive_webhooks_raw"
    await db.collection("motive_webhooks_raw").add({
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      payload: data,
    });

    res.status(200).send("Raw webhook payload saved successfully.");

  } catch (err) {
    console.error("❌ Error saving raw webhook:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = { motiveWebhookTest };
