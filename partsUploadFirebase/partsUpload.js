import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pushPartsToFirestore } from './pushPartsToFirestore.js';

// For __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read and parse JSON file manually
const jsonPath = path.join(__dirname, 'parts.json');
const fileContent = fs.readFileSync(jsonPath, 'utf8');
const partsData = JSON.parse(fileContent);

// Call your uploader
pushPartsToFirestore(partsData);
