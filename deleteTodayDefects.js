const admin = require('firebase-admin');

// Initialize Admin SDK - replace with your actual path to serviceAccountKey.json
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Function to delete documents where receivedAt date is between startDate and endDate (inclusive)
async function deleteDocsByDateRange(collectionName, startDate, endDate) {
  const startTimestamp = admin.firestore.Timestamp.fromDate(new Date(startDate));
  const endTimestamp = admin.firestore.Timestamp.fromDate(new Date(endDate));

  const snapshot = await db.collection(collectionName)
    .where('receivedAt', '>=', startTimestamp)
    .where('receivedAt', '<=', endTimestamp)
    .get();

  console.log(`Found ${snapshot.size} documents to delete`);

  const batch = db.batch();

  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  console.log(`Deleted ${snapshot.size} documents from ${collectionName}`);
}

// Call the function with your date range (ISO strings or date strings)
deleteDocsByDateRange('allDefects', '2025-06-05T00:00:00Z', '2025-06-10T23:59:59Z')
  .then(() => {
    console.log('Done deleting documents in date range.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error deleting documents:', err);
    process.exit(1);
  });
