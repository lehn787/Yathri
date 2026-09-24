import { loadGTFS } from '../src/engine/routeEngine';
import { findJourney } from '../src/engine/journeyEngine';
import { loadFareEngine, estimateFare } from '../src/engine/fareEngine';
import { loadLanguageEngine, resolveStopName, parseJourneySentence } from '../src/engine/languageEngine';
import * as path from 'path';

function runMultilingualTests() {
    console.log('Loading GTFS, Fare, and Language Engines...');
    const gtfsDir = path.join(__dirname, '../data/gtfs');
    try {
        loadGTFS(gtfsDir);
        loadFareEngine(gtfsDir);
        loadLanguageEngine();
        console.log('All engines loaded successfully.\n');
    } catch (e: any) {
        console.error('Failed to load data:', e.message);
        return;
    }

    const testCases = [
        {
            name: 'TEST 1: English (Thrippunithura → Infopark)',
            originInput: 'Thrippunithura',
            destInput: 'Infopark',
            expectedSuccess: true
        },
        {
            name: 'TEST 2: Malayalam (തൃപ്പൂണിത്തുറയിൽ നിന്ന് → ഇൻഫോപാർക്കിലേക്ക്)',
            originInput: 'തൃപ്പൂണിത്തുറയിൽ നിന്ന്',
            destInput: 'ഇൻഫോപാർക്കിലേക്ക്',
            expectedSuccess: true
        },
        {
            name: 'TEST 3: Hindi (त्रिप्पुनिथुरा से → इन्फोपार्क)',
            originInput: 'त्रिप्पुनिथुरा से',
            destInput: 'इन्फोपार्क',
            expectedSuccess: true
        },
        {
            name: 'TEST 4: Unknown Malayalam destination (തൃപ്പൂണിത്തുറ → അജ്ഞാത സ്ഥലം)',
            originInput: 'തൃപ്പൂണിത്തുറ',
            destInput: 'അജ്ഞാത സ്ഥലം',
            expectedSuccess: false,
            expectedError: 'Unknown stop'
        },
        {
            name: 'TEST 5: Reverse Journey (Infopark → Thrippunithura)',
            originInput: 'Infopark',
            destInput: 'Thrippunithura',
            expectedSuccess: true
        },
        {
            name: 'VOICE TEST 1: English Spoken Query ("Take me from Thrippunithura to Infopark")',
            sentence: 'Take me from Thrippunithura to Infopark',
            expectedSuccess: true
        },
        {
            name: 'VOICE TEST 2: Malayalam Spoken Query ("തൃപ്പൂണിത്തുറയിൽ നിന്ന് ഇൻഫോപാർക്കിലേക്ക് പോകണം")',
            sentence: 'തൃപ്പൂണിത്തുറയിൽ നിന്ന് ഇൻഫോപാർക്കിലേക്ക് പോകണം',
            expectedSuccess: true
        },
        {
            name: 'VOICE TEST 3: Hindi Spoken Query ("मुझे त्रिप्पुनिथुरा से इन्फोपार्क जाना है")',
            sentence: 'मुझे त्रिप्पुनिथुरा से इन्फोपार्क जाना है',
            expectedSuccess: true
        }
    ];

    let allPassed = true;

    for (const tc of testCases) {
        console.log(tc.name);

        let origin = tc.originInput || '';
        let dest = tc.destInput || '';

        if (tc.sentence) {
            const parsed = parseJourneySentence(tc.sentence);
            if (!parsed) {
                console.log(`❌ Failed to parse sentence: "${tc.sentence}"`);
                allPassed = false;
                console.log('-'.repeat(50));
                continue;
            }
            origin = parsed.originRaw;
            dest = parsed.destRaw;
            console.log(`Parsed Sentence -> Origin: "${origin}", Dest: "${dest}"`);
        }

        const canonicalOrigin = resolveStopName(origin);
        const canonicalDest = resolveStopName(dest);

        console.log(`Input: "${origin}" → Canonical: "${canonicalOrigin}"`);
        console.log(`Input: "${dest}" → Canonical: "${canonicalDest}"`);

        if (!canonicalOrigin || !canonicalDest) {
            if (!tc.expectedSuccess) {
                console.log(`✅ Expected unknown stop error triggered.`);
                console.log(`RESULT: PASS\n` + '-'.repeat(50));
                continue;
            } else {
                console.log(`❌ Failed: Could not resolve stop to canonical GTFS name.`);
                allPassed = false;
                console.log(`RESULT: FAIL\n` + '-'.repeat(50));
                continue;
            }
        }

        // Call route engine
        const journey = findJourney(canonicalOrigin, canonicalDest);
        if (!journey.success) {
            if (!tc.expectedSuccess) {
                console.log(`✅ Route engine error: ${journey.error}`);
                console.log(`RESULT: PASS\n` + '-'.repeat(50));
            } else {
                console.log(`❌ Route engine failed: ${journey.error}`);
                allPassed = false;
                console.log(`RESULT: FAIL\n` + '-'.repeat(50));
            }
            continue;
        }

        // Calculate fare
        const fare = estimateFare(journey);
        console.log(`✅ Journey Found: ${journey.routeName}`);
        console.log(`Boarding: ${journey.boardingStop}, Destination: ${journey.destinationStop}`);
        console.log(`Distance: ${fare.distanceKm} km, Fare: ₹${fare.estimatedFare}`);

        if (tc.expectedSuccess && journey.success && fare.distanceKm > 0 && fare.estimatedFare != null) {
            console.log(`RESULT: PASS`);
        } else {
            console.log(`RESULT: FAIL`);
            allPassed = false;
        }
        console.log('-'.repeat(50));
    }

    // Spoken Summary Tests
    console.log('VOICE SUMMARY TEST: Spoken output generation');
    const { generateSpokenSummary } = require('../src/engine/languageEngine');
    const enSpeech = generateSpokenSummary('Thrippunithura', 'Infopark', 19, 'en');
    const mlSpeech = generateSpokenSummary('Thrippunithura', 'Infopark', 19, 'ml');
    const hiSpeech = generateSpokenSummary('Thrippunithura', 'Infopark', 19, 'hi');

    console.log('English Spoken Output:', enSpeech);
    console.log('Malayalam Spoken Output:', mlSpeech);
    console.log('Hindi Spoken Output:', hiSpeech);

    if (
        enSpeech.includes('Thrippunithura') && enSpeech.includes('Infopark') &&
        mlSpeech.includes('തൃപ്പൂണിത്തുറ') && mlSpeech.includes('ഇൻഫോപാർക്ക്') &&
        hiSpeech.includes('त्रिप्पुनिथुरा') && hiSpeech.includes('इन्फोपार्क')
    ) {
        console.log('Spoken Summary Verification: PASS');
    } else {
        console.log('Spoken Summary Verification: FAIL');
        allPassed = false;
    }
    console.log('-'.repeat(50));

    if (allPassed) {
        console.log('🎉 ALL MULTILINGUAL & VOICE TESTS PASSED!');
    } else {
        console.error('❌ SOME TESTS FAILED');
    }
}

runMultilingualTests();
