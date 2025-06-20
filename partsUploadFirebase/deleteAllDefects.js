// deleteAllDefects.js
import db from './firebase-config-nodejs.js';

async function deleteAllDefects() {
  const collectionRef = db.collection('allDefects');

  try {
    const snapshot = await collectionRef.get();
    const deletePromises = snapshot.docs.map(docSnap => docSnap.ref.delete());
    await Promise.all(deletePromises);

    console.log(`🗑️ Successfully deleted ${snapshot.docs.length} records from allDefects.`);
  } catch (error) {
    console.error("❌ Deletion failed:", error);
  }
}

deleteAllDefects();
