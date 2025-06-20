const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 🔢 Generate Unique Defect ID
const generateDefectId = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  const randomDigits = Math.floor(100 + Math.random() * 900);
  return `MDEF-${month}${day}${year}-${randomDigits}`;
};

// 📆 Format date to MM-DD-YYYY
const formatDateMMDDYYYY = (date) => {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
};

const motiveWebhook = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const data = req.body;
    console.log("🔥 Webhook received at:", new Date().toISOString());

    // Store raw webhook
    await db.collection("motive_webhooks").add({
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      payload: data,
    });

    const defects = data.defects || [];
    const batch = db.batch();

    for (const defect of defects) {
      const motiveDefectId = String(defect.id || "");

      // ⛔ Skip if notes are empty/null
      if (!defect.notes || defect.notes.trim() === "") {
        console.log(`❌ Skipping defect ${motiveDefectId} - Notes empty`);
        continue;
      }

      const trigger = data.trigger || "";
      const status = data.status || "";

      // ✅ Accept only:
      // - New creation with status "open"
      // - Updates that reopen defect with status "open"
      const isCreated = trigger === "created" && status === "open";
      const isReopened = trigger === "updated" && status === "open";

      if (!isCreated && !isReopened) {
        console.log(`⛔ Skipping defect ${motiveDefectId} - Not new or reopened`);
        continue;
      }

      // 🔍 Check how many times this defect was stored before
      const existingSnapshot = await db.collection("allDefects")
        .where("motive_defect_id", "==", motiveDefectId)
        .get();

      const reopenCount = existingSnapshot.size;
      const isDuplicate = reopenCount > 0;

      let defectId = generateDefectId();
      if (isDuplicate && isReopened) {
        defectId = `RE${reopenCount}-${defectId}`;
        console.log(`🔁 Reopened defect ${motiveDefectId} — Reopen #${reopenCount}`);
      }

      const defectDate = defect.time ? new Date(defect.time) : new Date();

      const defectDoc = {
        motive_record_id: String(data.id || ""),
        defect_id: defectId,
        motive_defect_id: motiveDefectId,
        defect_description: defect.category || "",
        motive_defect_notes: defect.notes || "",
        defect_captured_date: formatDateMMDDYYYY(defectDate),
        manager_approval_date: defect.manager_approval_date || null,
        status: "Not Scheduled",
        motive_defect_status: status,
        unit_number: data.vehicle?.number || "",
        source: "motive_webhook",
        receivedAt: admin.firestore.Timestamp.now(),
        motive_vehicle_kilometer: data.odometer || "",
        reopened: isDuplicate
      };

      const docRef = db.collection("allDefects").doc();
      batch.set(docRef, defectDoc);
    }

    await batch.commit();
    console.log("✅ Webhook processed and valid defects saved.");
    res.status(200).send("Success");

  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = { motiveWebhook };
