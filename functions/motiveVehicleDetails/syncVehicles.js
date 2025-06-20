const functions = require("firebase-functions");
const admin = require("firebase-admin");
const https = require("https");

admin.initializeApp();
const db = admin.firestore();

exports.syncVehicles = functions.https.onRequest(async (req, res) => {
  const apiKey = "15625e09-3af8-4aaf-a592-2674a4b2f98b";

  const options = {
    hostname: "api.gomotive.com",
    path: "/v1/vehicle_locations?per_page=25&page_no=1",
    method: "GET",
    headers: {
      "x-api-key": apiKey
    }
  };

  let data = "";

  const request = https.request(options, response => {
    response.on("data", chunk => {
      data += chunk;
    });

    response.on("end", async () => {
      try {
        const json = JSON.parse(data);
        const vehicles = json.vehicles || [];

        const batch = db.batch();

        for (const entry of vehicles) {
          const v = entry.vehicle;

          const docRef = db.collection("motiveVehicles").doc(v.id.toString());

          batch.set(docRef, {
            recordId: docRef.id,
            vehicleId: v.id,
            number: v.number || "",
            year: v.year || "",
            make: v.make || "",
            model: v.model || "",
            vin: v.vin || "",
            odometer: v.current_location?.odometer || 0,
            status: "active",
            synced_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        await batch.commit();
        console.log(`✅ Synced ${vehicles.length} vehicles to Firestore.`);
        res.status(200).send(`Synced ${vehicles.length} vehicles successfully.`);
      } catch (err) {
        console.error("❌ Error parsing response or saving data:", err);
        res.status(500).send("Internal Server Error");
      }
    });
  });

  request.on("error", err => {
    console.error("❌ HTTPS request failed:", err);
    res.status(500).send("Request Failed");
  });

  request.end();
});
