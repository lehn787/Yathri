import { resolveStopName, getLocalizedStopName } from './languageEngine';
import { stops } from './routeEngine';

export interface ParsedJourneyIntent {
    success: boolean;
    rawTranscript: string;
    originRaw?: string;
    destRaw?: string;
    canonicalOrigin?: string | null;
    canonicalDestination?: string | null;
    error?: string;
}

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,      // deletion
                dp[i][j - 1] + 1,      // insertion
                dp[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return dp[m][n];
}

function stringSimilarity(s1: string, s2: string): number {
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1.0;
    const dist = levenshteinDistance(s1.toLowerCase(), s2.toLowerCase());
    return (maxLen - dist) / maxLen;
}

/**
 * Strips attached Manglish, Hinglish, Malayalam, and Hindi grammatical affixes from single stop tokens.
 */
export function stripStopAffixes(token: string): string[] {
    let clean = token.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) return [];

    const candidates = new Set<string>();
    candidates.add(clean);

    // Conversational leading phrases
    clean = clean.replace(/^(?:take me from|take me to|i want to go from|i want to go to|how to reach|how to go to|how to go from|bus from|bus to|can i get a bus from|from|to|please|enikku|dayavayi|oru bus|mujhe|kripya)\s+/i, '').trim();
    candidates.add(clean);

    // Conversational trailing phrases
    clean = clean.replace(/\s+(?:pokanam|pokan|povan|povanam|ethanam|ethan|venam|bus venam|oru bus|bus|route|jana hai|pahuchna hai|chahiye|jana|ki bus)$/i, '').trim();
    candidates.add(clean);

    // Manglish suffixes (e.g. Thrippunithurayil, Infoparkilekku, Kakkanadilekk, Ernakulathekk)
    const manglishSuffixes = [
        'yil ninnu', 'il ninnu', ' ninnu', ' ninn', ' innu',
        'ilekku', 'ilekk', 'lekku', 'lekk', 'thekku', 'thekk', 'ekku', 'ekk',
        'yil', 'il', 'inu', 'kku'
    ];

    for (const s of manglishSuffixes) {
        if (clean.toLowerCase().endsWith(s)) {
            const stripped = clean.slice(0, clean.length - s.length).trim();
            if (stripped.length >= 3) {
                candidates.add(stripped);
            }
        }
    }

    // Hinglish suffixes (e.g. Thrippunithurase, Infoparktak, Infoparkko)
    const hinglishSuffixes = [' se', ' tak', ' ko', ' me', ' ke liye'];
    for (const s of hinglishSuffixes) {
        if (clean.toLowerCase().endsWith(s)) {
            const stripped = clean.slice(0, clean.length - s.length).trim();
            if (stripped.length >= 3) {
                candidates.add(stripped);
            }
        }
    }

    // Malayalam Script suffixes
    const mlSuffixes = [
        'യിൽ നിന്ന്', 'യിൽനിന്ന്', 'ൽ നിന്ന്', 'ൽനിന്ന്', 'ിൽ നിന്ന്', 'ിൽനിന്ന്', 'നിന്ന്',
        'ത്തിലേക്ക്', 'ലേക്ക്', 'ിലേക്ക്', 'ലേയ്ക്ക്', 'ഇലേക്ക്', 'ട്ടേക്ക്',
        'യിൽ', 'ിൽ', 'ൽ', 'ക്ക്', 'യ്ക്ക്', 'വരെ'
    ];
    for (const s of mlSuffixes) {
        if (clean.endsWith(s)) {
            const stripped = clean.slice(0, clean.length - s.length).trim();
            if (stripped.length >= 2) {
                candidates.add(stripped);
            }
        }
    }

    // Hindi Script suffixes
    const hiSuffixes = [' से', ' तक', ' को', ' के लिए', ' में'];
    for (const s of hiSuffixes) {
        if (clean.endsWith(s)) {
            const stripped = clean.slice(0, clean.length - s.length).trim();
            if (stripped.length >= 2) {
                candidates.add(stripped);
            }
        }
    }

    return Array.from(candidates).filter(c => c.length >= 2);
}

/**
 * Resolves a stop token to a canonical GTFS stop using exact resolution, suffix-stripping,
 * transliteration aliases, and high-confidence fuzzy matching.
 */
export function resolveStopToken(token: string): string | null {
    if (!token || !token.trim()) return null;

    const variants = stripStopAffixes(token);

    // 1. Direct languageEngine resolution
    for (const v of variants) {
        const canonical = resolveStopName(v);
        if (canonical) return canonical;
    }

    // 2. High-confidence fuzzy matching against GTFS canonical stops
    let bestMatch: string | null = null;
    let highestSim = 0;

    for (const v of variants) {
        const vLower = v.toLowerCase();
        if (vLower.length < 3) continue;

        for (const s of stops) {
            const stopLower = s.stop_name.toLowerCase();

            // Direct substring
            if (stopLower === vLower) return s.stop_name;
            if (vLower.length >= 4 && (stopLower.includes(vLower) || vLower.includes(stopLower))) {
                return s.stop_name;
            }

            // Fuzzy similarity
            const sim = stringSimilarity(vLower, stopLower);
            if (sim > highestSim && sim >= 0.78) {
                highestSim = sim;
                bestMatch = s.stop_name;
            }
        }
    }

    return bestMatch;
}

/**
 * Extracts raw origin and destination segments from a natural spoken/typed sentence.
 */
export function extractOriginAndDestinationSegments(text: string): { originRaw: string; destRaw: string } | null {
    // Strip trailing/leading punctuation often attached by speech recognizers (.,!?;:")
    let cleaned = text.trim().replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?"']+|[.,\/#!$%\^&\*;:{}=\-_`~()?"']+$/g, '').trim();
    if (!cleaned) return null;

    // 1. English Inverted: "Take me to Infopark from Thrippunithura" / "Go to Y from X" / "I want to go to Y from X"
    const enToFrom = cleaned.match(/^(?:take me to|i want to go to|go to|travel to|how to reach|reach)\s+(.+?)\s+(?:from)\s+(.+)/i);
    if (enToFrom) {
        return { originRaw: enToFrom[2].trim(), destRaw: enToFrom[1].trim() };
    }

    // 2. English: "Take me from X to Y" / "I want to go from X to Y" / "from X to Y"
    const enFromTo = cleaned.match(/^(?:take me\s+)?(?:i want to go\s+)?(?:from)\s+(.+?)\s+(?:to|towards|->|reach)\s+(.+)/i);
    if (enFromTo) {
        return { originRaw: enFromTo[1].trim(), destRaw: enFromTo[2].trim() };
    }

    // 3. English "Y from X" (when sentence starts with destination, e.g. "Infopark from Thrippunithura")
    const enDestFrom = cleaned.match(/^(.+?)\s+(?:from)\s+(.+)/i);
    if (enDestFrom) {
        return { originRaw: enDestFrom[2].trim(), destRaw: enDestFrom[1].trim() };
    }

    // 4. Manglish with "ninnu": "X il ninnu Y ilekku pokanam" / "X ninnu Y pokanam" / "X innu Y lekku"
    const manglishMatch = cleaned.match(/(.+?)\s+(?:il\s+ninnu|yil\s+ninnu|ilninnu|ninnu|ninn|innu)\s+(.+)/i);
    if (manglishMatch) {
        return { originRaw: manglishMatch[1].trim(), destRaw: manglishMatch[2].trim() };
    }

    // 5. Manglish with destination inflection directly: "X Yilekku pokanam" / "X Ylekku"
    const manglishSuffixDest = cleaned.match(/^(.+?)\s+([a-zA-Z]+(?:ilekku|ilekk|lekku|lekk|thekku|thekk|ekku|ekk)(?:\s+pokanam|\s+pokan|\s+venam)?)$/i);
    if (manglishSuffixDest) {
        return { originRaw: manglishSuffixDest[1].trim(), destRaw: manglishSuffixDest[2].trim() };
    }

    // 6. Manglish: "muthal X vare Y"
    const manglishMuthal = cleaned.match(/(?:mudhal|muthal)\s+(.+?)\s+(?:vare)\s+(.+)/i);
    if (manglishMuthal) {
        return { originRaw: manglishMuthal[1].trim(), destRaw: manglishMuthal[2].trim() };
    }

    // 7. Malayalam Script: "തൃപ്പൂണിത്തുറയിൽ നിന്ന് ഇൻഫോപാർക്കിലേക്ക്"
    if (cleaned.includes('നിന്ന്')) {
        const parts = cleaned.split(/നിന്ന്/i);
        if (parts.length >= 2) {
            return { originRaw: parts[0].trim(), destRaw: parts.slice(1).join(' ').trim() };
        }
    }
    if (cleaned.includes('മുതൽ') && cleaned.includes('വരെ')) {
        const m = cleaned.match(/മുതൽ\s+(.+?)\s+വരെ\s*(.*)/);
        if (m) {
            return { originRaw: m[1].trim(), destRaw: m[2].trim() || m[1].trim() };
        }
    }

    // 8. Hinglish: "X se Y jana hai" / "Mujhe X se Y tak jana hai" / "X se Y"
    const hinglishMatch = cleaned.match(/(?:mujhe\s+)?(.+?)\s+se\s+(.+)/i);
    if (hinglishMatch) {
        return { originRaw: hinglishMatch[1].trim(), destRaw: hinglishMatch[2].trim() };
    }

    // 9. Hindi Script: "मुझे X से Y जाना है"
    if (cleaned.includes(' से ')) {
        const parts = cleaned.split(/ से /);
        if (parts.length >= 2) {
            return { originRaw: parts[0].replace(/^मुझे\s+/i, '').trim(), destRaw: parts.slice(1).join(' ').trim() };
        }
    }

    // 10. Generic "to" / "->", " - ", " ടു "
    const genericMatch = cleaned.match(/(.+?)\s+(?:to|->|-|towards|ടു)\s+(.+)/i);
    if (genericMatch) {
        return { originRaw: genericMatch[1].trim(), destRaw: genericMatch[2].trim() };
    }

    return null;
}

/**
 * Main Journey Intent Parser:
 * Processes raw voice transcripts in English, Malayalam script, Manglish (transliteration),
 * Hindi script, and Hinglish. Extracts origin and destination and maps them strictly to
 * canonical GTFS stop names.
 */
export function parseJourneyIntent(transcript: string): ParsedJourneyIntent {
    if (!transcript || !transcript.trim()) {
        return {
            success: false,
            rawTranscript: transcript || '',
            error: "I couldn't identify the boarding or destination stop."
        };
    }

    const raw = transcript.trim();
    let segments = extractOriginAndDestinationSegments(raw);

    if (segments) {
        const canonicalOrigin = resolveStopToken(segments.originRaw);
        const canonicalDest = resolveStopToken(segments.destRaw);

        if (canonicalOrigin && canonicalDest) {
            return {
                success: true,
                rawTranscript: raw,
                originRaw: segments.originRaw,
                destRaw: segments.destRaw,
                canonicalOrigin,
                canonicalDestination: canonicalDest
            };
        } else {
            // Explicit connector found (e.g. from X to Y or X ninnu Y) but stop is invalid
            return {
                success: false,
                rawTranscript: raw,
                originRaw: segments.originRaw,
                destRaw: segments.destRaw,
                canonicalOrigin,
                canonicalDestination: canonicalDest,
                error: "I couldn't identify the boarding or destination stop."
            };
        }
    }

    // Fallback: Split words only if no connector was matched (e.g. "Thrippunithura Infopark" or "Aluva Menaka")
    const words = raw.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 2 && words.length <= 10) {
        for (let i = 1; i < words.length; i++) {
            const leftPart = words.slice(0, i).join(' ');
            const rightPart = words.slice(i).join(' ');

            const leftCanonical = resolveStopToken(leftPart);
            const rightCanonical = resolveStopToken(rightPart);

            if (leftCanonical && rightCanonical && leftCanonical !== rightCanonical) {
                return {
                    success: true,
                    rawTranscript: raw,
                    originRaw: leftPart,
                    destRaw: rightPart,
                    canonicalOrigin: leftCanonical,
                    canonicalDestination: rightCanonical
                };
            }
        }
    }

    return {
        success: false,
        rawTranscript: raw,
        error: "I couldn't identify the boarding or destination stop."
    };
}


