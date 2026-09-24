import * as path from 'path';
import { parseCSV } from './csvParser';

export interface Stop {
    stop_id: string;
    stop_name: string;
}

export interface Route {
    route_id: string;
    route_long_name: string;
    route_short_name: string;
}

export interface Trip {
    route_id: string;
    trip_id: string;
    direction_id: string;
    trip_headsign: string;
}

export interface StopTime {
    trip_id: string;
    arrival_time: string;
    departure_time: string;
    stop_id: string;
    stop_sequence: number;
}

export let stops: Stop[] = [];
export let routes: Route[] = [];
export let trips: Trip[] = [];
export let stopTimes: StopTime[] = [];

// Indexes
export const tripsByRoute: Record<string, Trip[]> = {};
export const stopTimesByTrip: Record<string, StopTime[]> = {};
export const stopsById: Record<string, Stop> = {};
export const routesById: Record<string, Route> = {};

export function loadGTFS(gtfsDir: string) {
    stops = parseCSV(path.join(gtfsDir, 'stops.txt'));
    routes = parseCSV(path.join(gtfsDir, 'routes.txt'));
    trips = parseCSV(path.join(gtfsDir, 'trips.txt'));
    
    const rawStopTimes = parseCSV(path.join(gtfsDir, 'stop_times.txt'));
    stopTimes = rawStopTimes.map(st => ({
        ...st,
        stop_sequence: parseInt(st.stop_sequence, 10)
    }));

    stops.forEach(s => stopsById[s.stop_id] = s);
    routes.forEach(r => routesById[r.route_id] = r);
    
    trips.forEach(t => {
        if (!tripsByRoute[t.route_id]) tripsByRoute[t.route_id] = [];
        tripsByRoute[t.route_id].push(t);
    });

    stopTimes.forEach(st => {
        if (!stopTimesByTrip[st.trip_id]) stopTimesByTrip[st.trip_id] = [];
        stopTimesByTrip[st.trip_id].push(st);
    });

    // Sort stop times by sequence
    for (const tripId in stopTimesByTrip) {
        stopTimesByTrip[tripId].sort((a, b) => a.stop_sequence - b.stop_sequence);
    }
}
