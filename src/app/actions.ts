'use server';

import path from 'path';
import { loadGTFS } from '../engine/routeEngine';
import { findJourney, JourneyResult } from '../engine/journeyEngine';
import { loadFareEngine, estimateFare, FareResult } from '../engine/fareEngine';

import { loadLanguageEngine, resolveStopName, parseJourneySentence, getLocalizedStopName, generateSpokenSummary } from '../engine/languageEngine';

// Ensure data is loaded once
let enginesLoaded = false;
function ensureEngines() {
    if (enginesLoaded) return;
    try {
        const gtfsDir = path.join(process.cwd(), 'data/gtfs');
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

    // If destination is empty, check if origin is a single sentence like "Thrippunithura to Infopark"
    if (!destQuery && originQuery) {
        const parsed = parseJourneySentence(originQuery);
        if (parsed) {
            originQuery = parsed.originRaw;
            destQuery = parsed.destRaw;
        }
    }

    if (!originQuery) {
        return { success: false, error: 'Please enter a starting stop.' };
    }
    if (!destQuery) {
        return { success: false, error: 'Please enter a destination stop.' };
    }

    // Resolve canonical stop names
    const canonicalOrigin = resolveStopName(originQuery);
    if (!canonicalOrigin) {
        return {
            success: false,
            error: `Unknown stop: ${originQuery}`
        };
    }

    const canonicalDest = resolveStopName(destQuery);
    if (!canonicalDest) {
        return {
            success: false,
            error: `Unknown stop: ${destQuery}`
        };
    }

    // Call deterministic route engine with canonical stop names
    const journey = findJourney(canonicalOrigin, canonicalDest);
    if (!journey.success) {
        return {
            success: false,
            error: journey.error
        };
    }

    // Calculate fare
    const fare = estimateFare(journey);

    // Optional localized stops for UI
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

    return {
        success: true,
        journey,
        fare,
        spokenSummary,
        localized
    };
}
