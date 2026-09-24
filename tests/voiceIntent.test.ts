import { loadGTFS } from '../src/engine/routeEngine';
import { loadFareEngine } from '../src/engine/fareEngine';
import { loadLanguageEngine } from '../src/engine/languageEngine';
import { parseJourneyIntent } from '../src/engine/journeyIntentParser';
import { findJourney } from '../src/engine/journeyEngine';
import * as path from 'path';

function runVoiceIntentTests() {
    console.log('Loading engines...');
    const gtfsDir = path.join(__dirname, '../data/gtfs');
    loadGTFS(gtfsDir);
    loadFareEngine(gtfsDir);
    loadLanguageEngine();
    console.log('Engines loaded.\n');

    const testCases = [
        {
            name: 'TEST 1: English conversational phrase',
            input: 'Take me from Thrippunithura to Infopark',
            expectedOrigin: 'Thrippunithura',
            expectedDest: 'Infopark',
            shouldSucceed: true
        },
        {
            name: 'TEST 2: Manglish (Malayalam in Latin characters with full inflections)',
            input: 'Thrippunithura il ninnu Infopark ilekku pokanam',
            expectedOrigin: 'Thrippunithura',
            expectedDest: 'Infopark',
            shouldSucceed: true
        },
        {
            name: 'TEST 3: Manglish conversational colloquial',
            input: 'Thrippunithura ninnu Infopark pokanam',
            expectedOrigin: 'Thrippunithura',
            expectedDest: 'Infopark',
            shouldSucceed: true
        },
        {
            name: 'TEST 4: Malayalam native script phrase',
            input: 'തൃപ്പൂണിത്തുറയിൽ നിന്ന് ഇൻഫോപാർക്കിലേക്ക് പോകണം',
            expectedOrigin: 'Thrippunithura',
            expectedDest: 'Infopark',
            shouldSucceed: true
        },
        {
            name: 'TEST 5A: Hindi native script phrase',
            input: 'मुझे त्रिप्पुनिथुरा से इन्फोपार्क जाना है',
            expectedOrigin: 'Thrippunithura',
            expectedDest: 'Infopark',
            shouldSucceed: true
        },
        {
            name: 'TEST 5B: Hinglish (Hindi in Latin characters with postpositions)',
            input: 'Thrippunithura se Infopark jana hai',
            expectedOrigin: 'Thrippunithura',
            expectedDest: 'Infopark',
            shouldSucceed: true
        },
        {
            name: 'TEST 6: Inverted conversational English ("Take me to Infopark from Thrippunithura")',
            input: 'Take me to Infopark from Thrippunithura',
            expectedOrigin: 'Thrippunithura',
            expectedDest: 'Infopark',
            shouldSucceed: true
        },
        {
            name: 'TEST 7: Spoken with single p phonetic ("Tripunithura to Infopark")',
            input: 'Tripunithura to Infopark',
            expectedOrigin: 'Thrippunithura',
            expectedDest: 'Infopark',
            shouldSucceed: true
        },
        {
            name: 'TEST 8: Direct two-word spoken hubs ("Thrippunithura Infopark")',
            input: 'Thrippunithura Infopark',
            expectedOrigin: 'Thrippunithura',
            expectedDest: 'Infopark',
            shouldSucceed: true
        },
        {
            name: 'TEST 9: Unknown destination phrase (Never invent a stop)',
            input: 'Thrippunithura il ninnu Narnia ilekku pokanam',
            shouldSucceed: false
        }
    ];

    let allPassed = true;

    for (const tc of testCases) {
        console.log(tc.name);
        console.log(`Input Transcript: "${tc.input}"`);

        const intent = parseJourneyIntent(tc.input);

        if (tc.shouldSucceed) {
            if (intent.success && intent.canonicalOrigin === tc.expectedOrigin && intent.canonicalDestination === tc.expectedDest) {
                console.log(`✅ Extracted Origin: "${intent.canonicalOrigin}", Destination: "${intent.canonicalDestination}"`);
                const journey = findJourney(intent.canonicalOrigin!, intent.canonicalDestination!);
                if (journey.success) {
                    console.log(`✅ Route Engine Found: ${journey.routeName} (${journey.stops?.length} stops)`);
                    console.log('RESULT: PASS');
                } else {
                    console.log(`❌ Route Engine failed: ${journey.error}`);
                    allPassed = false;
                    console.log('RESULT: FAIL');
                }
            } else {
                console.log(`❌ Intent parsing failed or mismatched. Result:`, intent);
                allPassed = false;
                console.log('RESULT: FAIL');
            }
        } else {
            if (!intent.success) {
                console.log(`✅ Correctly rejected unknown destination: "${intent.error}"`);
                console.log('RESULT: PASS');
            } else {
                console.log(`❌ Failed: Erroneously resolved unknown destination:`, intent);
                allPassed = false;
                console.log('RESULT: FAIL');
            }
        }
        console.log('-'.repeat(50));
    }

    if (allPassed) {
        console.log('🎉 ALL VOICE INTENT PARSER TESTS PASSED!');
    } else {
        console.error('❌ SOME TESTS FAILED');
    }
}

runVoiceIntentTests();
