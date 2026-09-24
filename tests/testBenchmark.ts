import { loadGTFS, stops } from '../src/engine/routeEngine';
import { loadLanguageEngine, resolveStopName } from '../src/engine/languageEngine';
import { parseJourneyIntent, resolveStopToken } from '../src/engine/journeyIntentParser';
import path from 'path';

loadGTFS(path.join(process.cwd(), 'data/gtfs'));
loadLanguageEngine();

const testPlaces = [
  'Aluva',
  'Kaloor',
  'Edappally',
  'Palarivattom',
  'Vyttila',
  'Kakkanad',
  'Menaka',
  'High Court',
  'Fort Kochi',
  'Mattancherry',
  'Kalamassery',
  'Kadavanthra',
  'Panampilly Nagar',
  'Vypeen',
  'Thevara',
  'Kundannoor',
  'Angamaly',
  'Perumbavoor',
  'Thoppumpady',
  'MG Road',
  'Marine Drive',
  'Info park',
  'Infopark',
  'Tripunithura',
  'Thrippunithura',
  'Chittoor',
  'Cheranalloor',
  'Vazhakkala',
  'Padamugal',
  'Civil Station',
  'Ernakulam South',
  'Ernakulam North',
  'Town Hall',
  'Lissie Junction',
  'Maharajas Ground',
  'Palarivattom Bypass'
];

console.log('--- TESTING SINGLE STOP RESOLUTION ---');
for (const p of testPlaces) {
  const resolved = resolveStopToken(p);
  console.log(`${p.padEnd(25)} => ${resolved || '❌ NOT FOUND'}`);
}

const testSpokenJourneys = [
  'Aluva to Kaloor',
  'Kaloor il ninnu Menaka pokanam',
  'Take me from Edappally to Vyttila',
  'Palarivattom ninnu Kakkanad lekku',
  'Fort Kochi to Mattancherry',
  'Ernakulam South to Aluva',
  'Kadavanthra to Panampilly Nagar',
  'Thevara ninnu High Court pokanam',
  'Thoppumpady to Menaka',
  'Kalamassery to MG Road',
  'Angamaly to Aluva',
  'Tripunithura to Infopark',
  'Thrippunithura il ninnu Infopark ilekku pokanam',
  'Padamugal ninnu Civil Station pokanam',
  'Vazhakkala to Edappally'
];

console.log('\n--- TESTING SPOKEN JOURNEY PHRASES ---');
for (const j of testSpokenJourneys) {
  const res = parseJourneyIntent(j);
  console.log(`${j.padEnd(45)} => ${res.success ? `${res.canonicalOrigin} -> ${res.canonicalDestination}` : `❌ ${res.error}`}`);
}
