import { loadGTFS } from '../src/engine/routeEngine';
import { findJourney } from '../src/engine/journeyEngine';
import * as path from 'path';

function runTests() {
    console.log('Loading GTFS data...');
    // Adjust path based on execution context. E.g. running from project root.
    const gtfsDir = path.join(__dirname, '../data/gtfs'); 
    try {
        loadGTFS(gtfsDir);
        console.log('GTFS data loaded successfully.\n');
    } catch (e: any) {
        console.error('Failed to load GTFS data:', e.message);
        return;
    }

    const tests = [
        { name: 'TEST 1: Thrippunithura → Infopark', origin: 'Thrippunithura', dest: 'Infopark', expectError: false },
        { name: 'TEST 2: Infopark → Thrippunithura', origin: 'Infopark', dest: 'Thrippunithura', expectError: false },
        { name: 'TEST 3: Thrippunithura → Kakkanad Civil Station', origin: 'Thrippunithura', dest: 'Kakkanad Civil Station', expectError: false },
        { name: 'TEST 4: UnknownStop → Infopark', origin: 'UnknownStop', dest: 'Infopark', expectError: true }
    ];

    for (const t of tests) {
        console.log(t.name);
        const result = findJourney(t.origin, t.dest);
        
        if (t.expectError) {
            console.log(`Expected: Unknown stop error`);
            // Format the actual error strictly as requested if it matches
            const actualText = result.error?.includes('Unknown stop') ? 'Unknown stop error' : result.error || 'No error';
            console.log(`Actual: ${actualText}`);
            
            if (!result.success && result.error?.includes('Unknown stop')) {
                console.log(`RESULT: PASS`);
            } else {
                console.log(`RESULT: FAIL`);
            }
        } else {
            if (result.success) {
                console.log(`✅ SUCCESS`);
                console.log(`Route: ${result.routeName} (${result.routeId})`);
                console.log(`Boarding: ${result.boardingStop}`);
                console.log(`Destination: ${result.destinationStop}`);
                console.log(`Direct: ${result.isDirect}`);
                console.log(`Stops: \n  ${result.stops?.join('\n  ')}`);
            } else {
                console.log(`❌ FAILED`);
                console.log(`Error: ${result.error}`);
            }
        }
        console.log('-'.repeat(40));
    }
}

runTests();
