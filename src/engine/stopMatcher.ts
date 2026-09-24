import { stops, Stop } from './routeEngine';
import { resolveStopName } from './languageEngine';

export function matchStops(query: string): Stop[] {
    if (!query) return [];
    const lowerQuery = query.toLowerCase().trim();
    
    // 1. Direct substring match
    let matches = stops.filter(s => s.stop_name.toLowerCase().includes(lowerQuery));
    if (matches.length > 0) return matches;

    // 2. Bidirectional substring match
    matches = stops.filter(s => lowerQuery.includes(s.stop_name.toLowerCase()));
    if (matches.length > 0) return matches;

    // 3. Resolve through language engine alias / transliteration
    const resolved = resolveStopName(query);
    if (resolved) {
        const resolvedLower = resolved.toLowerCase();
        matches = stops.filter(s => s.stop_name.toLowerCase().includes(resolvedLower) || resolvedLower.includes(s.stop_name.toLowerCase()));
        if (matches.length > 0) return matches;
    }

    return [];
}

