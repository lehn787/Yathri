import * as path from 'path';
import * as fs from 'fs';
import { parseCSV } from './csvParser';
import { JourneyResult } from './journeyEngine';

export interface FareResult {
    available: boolean;
    estimated: boolean;
    distanceKm: number;
    fareStages: number | null;
    estimatedFare: number | null;
    source: string;
}

// Internal cache for stop coordinates
let stopCoordinates: Record<string, { lat: number, lon: number }> = {};

export function loadFareEngine(gtfsDir: string) {
    const stopsRaw = parseCSV(path.join(gtfsDir, 'stops.txt'));
    for (const stop of stopsRaw) {
        if (stop.stop_id && stop.stop_lat && stop.stop_lon) {
            stopCoordinates[stop.stop_id] = {
                lat: parseFloat(stop.stop_lat),
                lon: parseFloat(stop.stop_lon)
            };
        }
    }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371.0; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function estimateFare(journey: JourneyResult): FareResult {
    if (!journey.success || !journey.stops || journey.stops.length < 2) {
        return {
            available: false,
            estimated: true,
            distanceKm: 0,
            fareStages: null,
            estimatedFare: null,
            source: 'Fare data not configured. Invalid journey.'
        };
    }

    let distance = 0;
    const ids = journey.stopIds || [];
    for (let i = 1; i < ids.length; i++) {
        const prev = stopCoordinates[ids[i - 1]];
        const curr = stopCoordinates[ids[i]];
        if (prev && curr) {
            distance += haversine(prev.lat, prev.lon, curr.lat, curr.lon);
        }
    }

    let estimatedFare: number | null = null;
    let fareStages: number | null = null;
    let sourceMessage = 'GTFS fare data not configured.';
    let isAvailable = false;

    const candidatePaths = [
        path.join(process.cwd(), 'src/data/fareStages.json'),
        path.join(process.cwd(), 'data/fareStages.json'),
        path.join(__dirname, '../data/fareStages.json'),
        path.join(__dirname, '../../src/data/fareStages.json')
    ];

    let config: any = null;
    for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
            try {
                config = JSON.parse(fs.readFileSync(p, 'utf-8'));
                break;
            } catch (e) {
                // try next candidate
            }
        }
    }

    if (config) {
        if (config.baseFare != null && config.baseDistanceKm != null && config.ratePerKm != null) {
            // Because we do not have a verified corridor fare-stage table, do NOT falsely claim physical stops = fare stages.
            fareStages = null;
            
            // Kerala MVD Minimum Fare Logic
            if (distance <= config.baseDistanceKm) {
                estimatedFare = config.baseFare;
            } else {
                const extraDistance = distance - config.baseDistanceKm;
                const calculated = config.baseFare + (extraDistance * config.ratePerKm);
                estimatedFare = Math.round(calculated);
            }
            isAvailable = true;
            sourceMessage = 'Estimate based on Kerala MVD standard fare rules (not exact ticket quote). Exact fare-stage table unavailable.';
        }
    }

    return {
        available: isAvailable,
        estimated: true,
        distanceKm: Number(distance.toFixed(2)),
        fareStages: fareStages,
        estimatedFare: estimatedFare,
        source: sourceMessage
    };
}
