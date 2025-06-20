import db from './firebase-config-nodejs.js';
import fs from 'fs';

// Load vehicle data
const vehicleData = JSON.parse(fs.readFileSync('./vehicleDetails.json', 'utf8'));

// Format a Date object as DD-MM-YYYY string
function formatDateToDDMMYYYY(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Convert strings like "1,045,000" to 1045000
function parseValue(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') return value;

  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (trimmed === '') return null;

  const numericStr = trimmed.replace(/,/g, '');
  if (!isNaN(numericStr) && numericStr !== '') return Number(numericStr);

  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) return formatDateToDDMMYYYY(date);

  return trimmed;
}

// Normalize field names
function normalizeKeyName(key) {
  return key
    .toLowerCase()
    .replace(/\s*-\s*/g, '-') // normalize hyphen spacing
    .replace(/\s+/g, '_')     // convert spaces to underscores
    .replace(/[^a-z0-9_]/g, '') // remove symbols
    .replace(/stering/g, 'steering'); // fix known typo
}

function isDueSoon(dateString, thresholdDays = 14) {
  if (typeof dateString !== 'string') return false;

  const parts = dateString.split('-');
  if (parts.length !== 3) return false;

  const [dd, mm, yyyy] = parts.map(Number);
  const parsedDate = new Date(yyyy, mm - 1, dd);

  if (isNaN(parsedDate.getTime())) return false;

  const now = new Date();
  const diffDays = (parsedDate - now) / (1000 * 60 * 60 * 24);
  return diffDays <= thresholdDays;
}


// Delete all existing vehicles
async function clearVehiclesCollection() {
  const vehiclesRef = db.collection('vehicles');
  const snapshot = await vehiclesRef.get();

  if (snapshot.empty) {
    console.log('⚠️ No vehicles found to delete.');
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`🗑️ Cleared ${snapshot.size} vehicles.`);
}

function getRandom3Digit() {
  return Math.floor(100 + Math.random() * 900);
}

// Main function
async function pushVehiclesToFirestore() {
  await clearVehiclesCollection();

  const batch = db.batch();
  let pushedCount = 0;

  for (let index = 0; index < vehicleData.length; index++) {
    const vehicle = vehicleData[index];

    const unitNumber =
      vehicle['Unit #'] ||
      vehicle.unit ||
      vehicle.unit_no ||
      vehicle.UnitNumber;

    if (!unitNumber) {
      console.error(`❌ Skipping at index ${index}: Missing unit #`);
      continue;
    }

    const random3 = getRandom3Digit();
    const vehicleId = `VEHICLE-${unitNumber}-${random3}`;

    const parsedVehicle = {};
    for (const [key, value] of Object.entries(vehicle)) {
      const cleanKey = normalizeKeyName(key);
      parsedVehicle[cleanKey] = parseValue(value);
    }

    parsedVehicle.vehicleId = vehicleId;

    // Optional: calculate due alerts
    parsedVehicle.due_alerts = {
      bi_monthly: isDueSoon(parsedVehicle.bi_monthly_inspection),
      semi_annual: isDueSoon(parsedVehicle.semi_annual_inspection_sticker),
      schedule_4: isDueSoon(parsedVehicle.next_schedule_4),
    };

    const docRef = db.collection('vehicles').doc(vehicleId);
    batch.set(docRef, parsedVehicle);
    pushedCount++;
  }

  if (pushedCount > 0) {
    await batch.commit();
    console.log(`✅ Pushed ${pushedCount} vehicles to Firestore.`);
  } else {
    console.log('⚠️ No valid vehicles found to push.');
  }
}

pushVehiclesToFirestore();
