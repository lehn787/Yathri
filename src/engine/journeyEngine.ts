import { matchStops } from './stopMatcher';
import { stopTimesByTrip, trips, routesById, stopsById } from './routeEngine';

export interface JourneyResult {
    success: boolean;
    error?: string;
    routeId?: string;
    routeName?: string;
    boardingStop?: string;
    destinationStop?: string;
    isDirect?: boolean;
    stops?: string[];
    stopIds?: string[];
}


export function findJourney(originQuery: string, destinationQuery: string): JourneyResult {
    const originStops = matchStops(originQuery);
    const destStops = matchStops(destinationQuery);

    if (originStops.length === 0) {
        return { success: false, error: `Unknown stop: ${originQuery}` };
    }
    if (destStops.length === 0) {
        return { success: false, error: `Unknown stop: ${destinationQuery}` };
    }

    const originStopIds = new Set(originStops.map(s => s.stop_id));
    const destStopIds = new Set(destStops.map(s => s.stop_id));

    // Find direct trips
    for (const trip of trips) {
        const sequence = stopTimesByTrip[trip.trip_id];
        if (!sequence) continue;

        let originIndex = -1;
        let destIndex = -1;

        for (let i = 0; i < sequence.length; i++) {
            if (originIndex === -1 && originStopIds.has(sequence[i].stop_id)) {
                originIndex = i;
            }
            if (destStopIds.has(sequence[i].stop_id)) {
                destIndex = i; // Update to the latest match
                if (originIndex !== -1 && destIndex > originIndex) {
                    break;
                }
            }
        }

        if (originIndex !== -1 && destIndex !== -1 && originIndex < destIndex) {
            // Found a valid direct journey
            const route = routesById[trip.route_id];
            const routeName = route.route_long_name || route.route_short_name || trip.trip_headsign;
            
            const journeyStops = sequence
                .slice(originIndex, destIndex + 1)
                .map(st => stopsById[st.stop_id].stop_name);
                
            const journeyStopIds = sequence
                .slice(originIndex, destIndex + 1)
                .map(st => st.stop_id);

            return {
                success: true,
                routeId: route.route_id,
                routeName: routeName,
                boardingStop: stopsById[sequence[originIndex].stop_id].stop_name,
                destinationStop: stopsById[sequence[destIndex].stop_id].stop_name,
                isDirect: true,
                stops: journeyStops,
                stopIds: journeyStopIds
            };
        }
    }

    return {
        success: false,
        error: `No direct route found between ${originQuery} and ${destinationQuery}`
    };
}
