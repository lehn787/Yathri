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

console.log('\n--- TESTING SPOKEN JOURNEY PHRASES & ROUTE ENGINE ---');
import { findJourney } from '../src/engine/journeyEngine';
import { estimateFare } from '../src/engine/fareEngine';
import { loadFareEngine } from '../src/engine/fareEngine';

loadFareEngine(path.join(process.cwd(), 'data/gtfs'));

for (const j of testSpokenJourneys) {
  const res = parseJourneyIntent(j);
  if (res.success && res.canonicalOrigin && res.canonicalDestination) {
    const journey = findJourney(res.canonicalOrigin, res.canonicalDestination);
    const fare = estimateFare(journey);
    console.log(`${j.padEnd(45)} => ${res.canonicalOrigin} -> ${res.canonicalDestination} | Route: ${journey.success ? `${journey.routeName} (${journey.stops?.length} stops, ₹${fare.estimatedFare})` : `Direct trip unavailable`}`);
  } else {
    console.log(`${j.padEnd(45)} => ❌ ${res.error}`);
  }
}

