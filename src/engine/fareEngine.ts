import * as path from 'path';
import * as fs from 'fs';
import { parseCSV } from './csvParser';
import { JourneyResult } from './journeyEngine';
import { stopsById } from './routeEngine';
import fareStagesConfig from '../data/fareStages.json';

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
    try {
        const stopsRaw = parseCSV(path.join(gtfsDir, 'stops.txt'));
        for (const stop of stopsRaw) {
            if (stop.stop_id && stop.stop_lat && stop.stop_lon) {
                stopCoordinates[stop.stop_id] = {
                    lat: parseFloat(stop.stop_lat),
                    lon: parseFloat(stop.stop_lon)
                };
            }
        }
    } catch (e) {
        console.warn('Could not parse stops coordinates for fareEngine from:', gtfsDir);
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
        const prev = stopCoordinates[ids[i - 1]] || (stopsById[ids[i - 1]] as any);
        const curr = stopCoordinates[ids[i]] || (stopsById[ids[i]] as any);
        if (prev && curr && prev.lat && curr.lat) {
            distance += haversine(
                typeof prev.lat === 'number' ? prev.lat : parseFloat(prev.lat),
                typeof prev.lon === 'number' ? prev.lon : parseFloat(prev.lon),
                typeof curr.lat === 'number' ? curr.lat : parseFloat(curr.lat),
                typeof curr.lon === 'number' ? curr.lon : parseFloat(curr.lon)
            );
        }
    }

    // If GPS coordinates were not available for certain stops, fallback to transit average (approx 400m per stop)
    if (distance === 0 && journey.stops.length >= 2) {
        distance = (journey.stops.length - 1) * 0.45;
    }

    const config = fareStagesConfig || {
        baseFare: 10,
        baseDistanceKm: 2.5,
        ratePerKm: 1.0
    };

    let estimatedFare = config.baseFare;
    if (distance > config.baseDistanceKm) {
        const extraDistance = distance - config.baseDistanceKm;
        const calculated = config.baseFare + (extraDistance * config.ratePerKm);
        estimatedFare = Math.round(calculated);
    }

    return {
        available: true,
        estimated: true,
        distanceKm: Number(distance.toFixed(2)),
        fareStages: null,
        estimatedFare: estimatedFare,
        source: 'Estimate based on Kerala MVD standard fare rules (not exact ticket quote).'
    };
}

