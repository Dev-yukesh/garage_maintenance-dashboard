import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pushVehiclesToFirestore } from './pushVehiclesToFirestore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read vehicle details from JSON
const filePath = path.join(__dirname, 'vehicleDetails.json');
const fileContent = fs.readFileSync(filePath, 'utf8');
const vehiclesData = JSON.parse(fileContent);

// Push to Firestore
pushVehiclesToFirestore(vehiclesData);
