import db from './firebase-config-nodejs.js'; // default export
import { Timestamp } from 'firebase-admin/firestore';

// Production uploader
export async function pushPartsToFirestore(dataArray) {
  const collectionRef = db.collection('partsInventory');

  try {
    // Step 1: Delete existing records
    const snapshot = await collectionRef.get();
    const deletePromises = snapshot.docs.map(docSnap => docSnap.ref.delete());
    await Promise.all(deletePromises);
    console.log(`🗑️ Deleted ${snapshot.docs.length} existing records.`);

    // Step 2: Upload new records
    for (const item of dataArray) {
      const formatted = {
        category: item["Cate"]?.trim() || "",
        partNumber: item["Part number "]?.trim() || "",
        description: item["Description"]?.trim() || "",
        location: item["Parts Location"]?.trim() || "",
        partsOnHand: Number(item["PARTS ON HAND"] || 0),
        min_quantity: Number(item["Min"] || 0),
        max_quantity: Number(item["Max"] || 0),
        quantity_to_order: 0,
        createdAt: Timestamp.now()
      };

      const docRef = await collectionRef.add(formatted);

      await docRef.update({ record_id: docRef.id });

      console.log(`✅ Uploaded: ${formatted.partNumber} (record_id: ${docRef.id})`);
    }

    console.log("🚀 All parts uploaded successfully.");
  } catch (error) {
    console.error("❌ Upload failed:", error);
  }
}
