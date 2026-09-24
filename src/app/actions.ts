'use server';

import fs from 'fs';
import path from 'path';
import { loadGTFS, stops } from '../engine/routeEngine';
import { findJourney, JourneyResult } from '../engine/journeyEngine';
import { loadFareEngine, estimateFare, FareResult } from '../engine/fareEngine';
import { loadLanguageEngine, getLocalizedStopName, generateSpokenSummary, generatePhoneticSummary } from '../engine/languageEngine';
import { parseJourneyIntent, resolveStopToken } from '../engine/journeyIntentParser';

export async function getGtfsStopsAction(): Promise<string[]> {
    ensureEngines();
    const unique = Array.from(new Set(stops.map(s => s.stop_name?.trim()).filter(Boolean)));
    unique.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
    return unique;
}

function getGtfsDirectory(): string {
    const candidates = [
        path.join(process.cwd(), 'data/gtfs'),
        path.join(process.cwd(), 'yathri/data/gtfs'),
        path.join(__dirname, '../../data/gtfs'),
        path.join(__dirname, '../../../data/gtfs'),
        path.join(__dirname, '../../../../data/gtfs'),
        path.join(__dirname, '../data/gtfs'),
        path.join(__dirname, './data/gtfs')
    ];
    for (const c of candidates) {
        if (fs.existsSync(path.join(c, 'stops.txt'))) {
            return c;
        }
    }
    return candidates[0];
}

// Ensure data is loaded once
let enginesLoaded = false;
function ensureEngines() {
    if (enginesLoaded) return;
    try {
        const gtfsDir = getGtfsDirectory();
        loadGTFS(gtfsDir);
        loadFareEngine(gtfsDir);
        loadLanguageEngine();
        enginesLoaded = true;
    } catch (e: any) {
        console.error('Failed to load GTFS/language data:', e.message);
    }
}

export interface SearchResponse {
    success: boolean;
    error?: string;
    journey?: JourneyResult;
    fare?: FareResult;
    spokenSummary?: string;
    spokenSummaryPhonetic?: string;
    extractedStops?: {
        origin: string;
        destination: string;
    };
    localized?: {
        boardingStop: string;
        destinationStop: string;
        stops: string[];
    };
}

export async function searchJourneyAction(originInput: string, destInput?: string, lang: string = 'en'): Promise<SearchResponse> {
    ensureEngines();

    let originQuery = originInput ? originInput.trim() : '';
    let destQuery = destInput ? destInput.trim() : '';

    let canonicalOrigin: string | null = null;
    let canonicalDest: string | null = null;

    // 1. Single-sentence / Voice transcript input mode
    if (!destQuery && originQuery) {
        const intent = parseJourneyIntent(originQuery);
        if (!intent.success || !intent.canonicalOrigin || !intent.canonicalDestination) {
            return {
                success: false,
                error: intent.error || "I couldn't identify the boarding or destination stop."
            };
        }
        canonicalOrigin = intent.canonicalOrigin;
        canonicalDest = intent.canonicalDestination;
    } else {
        // 2. Separate From / To input mode
        if (!originQuery) {
            return { success: false, error: 'Please enter a starting stop.' };
        }
        if (!destQuery) {
            return { success: false, error: 'Please enter a destination stop.' };
        }

        canonicalOrigin = resolveStopToken(originQuery);
        if (!canonicalOrigin) {
            return {
                success: false,
                error: `Unknown stop: ${originQuery}`
            };
        }

        canonicalDest = resolveStopToken(destQuery);
        if (!canonicalDest) {
            return {
                success: false,
                error: `Unknown stop: ${destQuery}`
            };
        }
    }

    // Call deterministic route engine with canonical stop names
    console.log(`[ROUTE] origin: ${canonicalOrigin}`);
    console.log(`[ROUTE] destination: ${canonicalDest}`);
    const journey = findJourney(canonicalOrigin, canonicalDest);
    console.log(`[ROUTE] result: ${journey.success ? journey.routeName : journey.error}`);

    if (!journey.success) {
        return {
            success: false,
            error: journey.error
        };
    }

    // Calculate fare
    const fare = estimateFare(journey);
    console.log(`[FARE] result: ${fare.available ? `₹${fare.estimatedFare}` : 'unavailable'}`);

    // Localized stops for UI
    const localized = {
        boardingStop: getLocalizedStopName(journey.boardingStop || canonicalOrigin, lang),
        destinationStop: getLocalizedStopName(journey.destinationStop || canonicalDest, lang),
        stops: (journey.stops || []).map(s => getLocalizedStopName(s, lang))
    };

    const spokenSummary = generateSpokenSummary(
        journey.boardingStop || canonicalOrigin,
        journey.destinationStop || canonicalDest,
        fare.available ? fare.estimatedFare : null,
        lang
    );
    const spokenSummaryPhonetic = generatePhoneticSummary(
        journey.boardingStop || canonicalOrigin,
        journey.destinationStop || canonicalDest,
        fare.available ? fare.estimatedFare : null,
        lang
    );
    console.log(`[TTS] response: ${spokenSummary}`);
    console.log(`[TTS] phonetic response: ${spokenSummaryPhonetic}`);

    return {
        success: true,
        journey,
        fare,
        spokenSummary,
        spokenSummaryPhonetic,
        extractedStops: {
            origin: canonicalOrigin,
            destination: canonicalDest
        },
        localized
    };
}
