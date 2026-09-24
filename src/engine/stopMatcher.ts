import { stops } from './routeEngine';

export function matchStops(query: string) {
    if (!query) return [];
    const lowerQuery = query.toLowerCase().trim();
    return stops.filter(s => s.stop_name.toLowerCase().includes(lowerQuery));
}
