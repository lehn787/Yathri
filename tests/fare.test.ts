import { loadGTFS } from '../src/engine/routeEngine';
import { findJourney } from '../src/engine/journeyEngine';
import { loadFareEngine, estimateFare } from '../src/engine/fareEngine';
import * as path from 'path';

function runFareTests() {
    console.log('Loading engines...');
    const gtfsDir = path.join(__dirname, '../data/gtfs'); 
    try {
        loadGTFS(gtfsDir);
        loadFareEngine(gtfsDir);
        console.log('Engines loaded successfully.\n');
    } catch (e: any) {
        console.error('Failed to load data:', e.message);
        return;
    }

    const tests = [
        { name: 'TEST 1: Thrippunithura → Infopark', origin: 'Thrippunithura', dest: 'Infopark' },
        { name: 'TEST 2: Infopark → Thrippunithura', origin: 'Infopark', dest: 'Thrippunithura' },
        { name: 'TEST 3: Thrippunithura → Kakkanad Civil Station', origin: 'Thrippunithura', dest: 'Kakkanad Civil Station' }
    ];

    for (const t of tests) {
        console.log(t.name);
        const journey = findJourney(t.origin, t.dest);
        
        if (!journey.success) {
            console.log(`❌ Journey failed, skipping fare calculation.`);
        } else {
            const fare = estimateFare(journey);
            console.log(`✅ Journey Found: ${journey.routeName}`);
            console.log(`Distance Calculated: ${fare.distanceKm} km`);
            console.log(`Fare Available: ${fare.available}`);
            console.log(`Estimated Fare: ${fare.estimatedFare}`);
            console.log(`Source Message: ${fare.source}`);
            
            // Verifications
            if (fare.distanceKm > 0 && typeof fare.estimatedFare === 'number' && fare.available === true && fare.estimated === true) {
                console.log(`RESULT: PASS (Distance and estimated fare calculated correctly)`);
            } else {
                console.log(`RESULT: FAIL (Fare result structure is incorrect)`);
            }
        }
        console.log('-'.repeat(40));
    }
}

runFareTests();
