import * as path from 'path';
import * as fs from 'fs';
import { stops } from './routeEngine';
import stopTranslationsJson from '../data/stopTranslations.json';

export interface StopTranslationEntry {
    canonical: string;
    translations: Record<string, string>;
    aliases: Record<string, string[]>;
}

export interface StopTranslationsData {
    supportedLanguages: string[];
    stops: StopTranslationEntry[];
}

let translationsData: StopTranslationsData | null = stopTranslationsJson as unknown as StopTranslationsData;
const aliasToCanonicalMap: Map<string, string> = new Map();

function cleanText(text: string): string {
    return text.trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function loadLanguageEngine(): void {
    if (!translationsData) {
        translationsData = stopTranslationsJson as unknown as StopTranslationsData;
    }

    aliasToCanonicalMap.clear();

    // 1. Add translations & aliases from stopTranslations.json
    if (translationsData && Array.isArray(translationsData.stops)) {
        for (const entry of translationsData.stops) {
            const canonical = entry.canonical;
            aliasToCanonicalMap.set(canonical.toLowerCase(), canonical);
            aliasToCanonicalMap.set(cleanText(canonical).toLowerCase(), canonical);

            // Add all translations
            if (entry.translations) {
                for (const lang in entry.translations) {
                    const trans = entry.translations[lang];
                    if (trans) {
                        aliasToCanonicalMap.set(trans.toLowerCase(), canonical);
                        aliasToCanonicalMap.set(cleanText(trans).toLowerCase(), canonical);
                    }
                }
            }

            // Add all aliases
            if (entry.aliases) {
                for (const lang in entry.aliases) {
                    const aliasList = entry.aliases[lang] || [];
                    for (const alias of aliasList) {
                        aliasToCanonicalMap.set(alias.toLowerCase(), canonical);
                        aliasToCanonicalMap.set(cleanText(alias).toLowerCase(), canonical);
                    }
                }
            }
        }
    }

    // 2. Auto-index all GTFS stops from routeEngine with suffix-stripping & phonetics
    if (stops && stops.length > 0) {
        for (const s of stops) {
            const name = s.stop_name;
            const lower = name.toLowerCase();
            if (!aliasToCanonicalMap.has(lower)) {
                aliasToCanonicalMap.set(lower, name);
            }

            // Strip common stop suffixes to index the base place name
            const strippedSuffix = lower.replace(/\s+(?:junction|jn|bus stop|stop|ferry|gate|temple|church|mosque|stand|terminal|palli|road|bypass)$/i, '').trim();
            if (strippedSuffix.length >= 3 && !aliasToCanonicalMap.has(strippedSuffix)) {
                aliasToCanonicalMap.set(strippedSuffix, name);
            }
        }
    }

    // 3. Kochi Landmark & Common Spoken Aliases
    const popularLandmarkAliases: Record<string, string[]> = {
        'Thrippunithura': ['tripunithura', 'thripunithura', 'thrippoonithura', 'tripunithra', 'thripunithara', 'tripunithura statue'],
        'Infopark': ['info park', 'infopark kochi', 'infopark first gate', 'infopark main gate', 'smart city', 'smartcity', 'kakkanad infopark'],
        'Kakkanad': ['kakkanad civil station', 'kaknad', 'kakkanadu', 'civil station kakkanad', 'civil station'],
        'Edappally Toll': ['edappally', 'edapally', 'edappalli', 'edappally bypass', 'lulu mall', 'edappally toll junction'],
        'North Kalamassery': ['kalamassery', 'kalamasseri', 'kalamassery premier', 'south kalamassery'],
        'Vyttila': ['vytilla', 'vytila', 'vyttila hub', 'vytilla hub', 'vyttila junction'],
        'Kundanoor Junction': ['kundannoor', 'kundanoor', 'kundannoor junction', 'kundanoor jn'],
        'Vypin': ['vypeen', 'vypin jetty', 'vypeen jetty', 'vypin bus stand'],
        'Palarivattom': ['palarivattam', 'palarivattom bypass', 'palarivattom junction'],
        'Menaka': ['marine drive', 'marine drive kochi', 'menaka junction', 'menaka bus stop'],
        'High Court': ['high court junction', 'highcourt', 'high court ernakulam'],
        'Jose Junction': ['mg road', 'm.g. road', 'm g road', 'mg road ernakulam', 'jos junction'],
        'Shenoys': ['shenoys junction', 'shenoy theatre', 'maharajas ground', 'maharajas'],
        'Kadavanthra': ['panampilly nagar', 'panampilly', 'kadavanthra junction'],
        'Town Hall': ['lissie', 'lisie', 'lissie junction', 'lisie hospital', 'ernakulam north', 'north railway station', 'town hall ernakulam'],
        'Ernakulam South': ['south railway station', 'ernakulam south railway station', 'south station', 'south'],
        'Aluva': ['alwaye', 'aluva bus stand', 'aluva railway station', 'aluva manappuram'],
        'Angamaly': ['angamali', 'angamaly bus stand', 'angamaly railway station', 'angamaly ksrtc'],
        'Perumbavoor': ['perumbavur', 'perumbavoor bus stand', 'perumbavoor ksrtc'],
        'Fort Kochi': ['fortkochi', 'fort kochi beach', 'fort kochi bus stand'],
        'Mattancherry': ['mattancheri', 'mattancherry bus stand', 'mattancherry bazar'],
        'Thevara': ['thevara ferry', 'thevara junction', 'thevara sh college'],
        'Thoppumpady': ['thoppumpadi', 'thoppumpady junction', 'thoppumpady bridge'],
        'Cheranalloor': ['cheranallur', 'cheranelloor', 'cheranalloor signal'],
        'Chittoor Ferry': ['chittoor', 'chittur', 'chittoor south', 'south chittoor'],
        'Vazhakkala': ['vazhakala', 'vazhakkala junction'],
        'Padamugal': ['padamukal', 'padamugal junction'],
        'Kaloor': ['kaloor junction', 'kaloor stadium', 'jawaharlal nehru stadium', 'kaloor bus stand'],
        'KSRTC Bus Station': ['ksrtc', 'ksrtc bus stand', 'ksrtc ernakulam', 'ernakulam ksrtc']
    };

    for (const [canonical, aliases] of Object.entries(popularLandmarkAliases)) {
        for (const a of aliases) {
            aliasToCanonicalMap.set(a.toLowerCase(), canonical);
        }
    }
}

// Ensure loaded at module import
loadLanguageEngine();

function stripInflections(text: string): string[] {
    let cleaned = cleanText(text);

    // Remove conversational fillers in English
    cleaned = cleaned.replace(/^(?:take me from|take me to|i want to go from|i want to go to|how to go from|how to reach|bus from|bus to|can i get a bus from|please|show me)\s+/i, '');
    cleaned = cleaned.replace(/\s+(?:please|bus|buses|route)$/i, '');

    // Remove conversational fillers in Malayalam
    cleaned = cleaned.replace(/^(?:എനിക്ക്|ദയവായി|ഒരു ബസ്)\s+/g, '');
    cleaned = cleaned.replace(/\s+(?:പോകണം|പോകാൻ|എത്തണം|എത്താൻ|ഒരു ബസ്|ബസ് വേണം|ബസ്|റൂട്ട്)$/g, '');

    // Remove conversational fillers in Hindi
    cleaned = cleaned.replace(/^(?:मुझे|कृपया|एक बस)\s+/g, '');
    cleaned = cleaned.replace(/\s+(?:जाना है|पहुंचना है|की बस चाहिए|की बस|के लिए बस|बस|चाहिए)$/g, '');

    const variants: string[] = [cleaned.trim()];

    // Malayalam postpositions / inflections
    const mlSuffixes = [
        'യിൽ നിന്ന്', 'യിൽനിന്ന്', 'ൽ നിന്ന്', 'ൽനിന്ന്', 'ിൽ നിന്ന്', 'ിൽനിന്ന്', 'നിന്ന്',
        'ത്തിലേക്ക്', 'ലേക്ക്', 'ിലേക്ക്', 'ലേയ്ക്ക്', 'ഇലേക്ക്', 'ട്ടേക്ക്',
        'യിൽ', 'ിൽ', 'ൽ', 'ക്ക്', 'യ്ക്ക്', 'വരെ'
    ];

    for (const suffix of mlSuffixes) {
        if (cleaned.endsWith(suffix)) {
            const stripped = cleaned.slice(0, cleaned.length - suffix.length).trim();
            if (stripped.length > 1) {
                variants.push(stripped);
            }
        }
    }

    // Malayalam prefix "മുതൽ"
    if (cleaned.startsWith('മുതൽ ')) {
        variants.push(cleaned.slice(5).trim());
    }

    // Hindi postpositions
    const hiSuffixes = [' से', ' तक', ' को', ' के लिए', ' में'];
    for (const suffix of hiSuffixes) {
        if (cleaned.endsWith(suffix)) {
            const stripped = cleaned.slice(0, cleaned.length - suffix.length).trim();
            if (stripped.length > 1) {
                variants.push(stripped);
            }
        }
    }

    // English prepositions / connectors
    let enClean = cleaned;
    if (enClean.toLowerCase().startsWith('from ')) {
        enClean = enClean.slice(5).trim();
        variants.push(enClean);
    }
    if (enClean.toLowerCase().startsWith('to ')) {
        enClean = enClean.slice(3).trim();
        variants.push(enClean);
    }

    return variants.filter(Boolean);
}

/**
 * Resolves any multilingual stop query to the canonical GTFS stop name.
 * Returns null if not found.
 */
export function resolveStopName(query: string): string | null {
    if (!query || !query.trim()) return null;

    if (aliasToCanonicalMap.size === 0) {
        loadLanguageEngine();
    }

    const trimmed = query.trim();
    const variants = stripInflections(trimmed);

    // 1. Check exact alias map
    for (const v of variants) {
        const lower = v.toLowerCase();
        if (aliasToCanonicalMap.has(lower)) {
            return aliasToCanonicalMap.get(lower)!;
        }
    }

    // 2. Check direct GTFS stops in memory
    for (const v of variants) {
        const lower = v.toLowerCase();
        const directMatch = stops.find(s => s.stop_name.toLowerCase() === lower);
        if (directMatch) {
            return directMatch.stop_name;
        }
    }

    // 3. Check substring match in alias map
    for (const v of variants) {
        const lower = v.toLowerCase();
        if (lower.length >= 3) {
            let foundCanonical: string | null = null;
            aliasToCanonicalMap.forEach((canonical, alias) => {
                if (!foundCanonical && (alias.includes(lower) || lower.includes(alias))) {
                    foundCanonical = canonical;
                }
            });
            if (foundCanonical) {
                return foundCanonical;
            }
        }
    }

    // 4. Check substring match in GTFS stops
    for (const v of variants) {
        const lower = v.toLowerCase();
        if (lower.length >= 3) {
            const subMatch = stops.find(s => s.stop_name.toLowerCase().includes(lower));
            if (subMatch) {
                return subMatch.stop_name;
            }
        }
    }

    return null;
}

/**
 * Splits a single multilingual journey sentence (spoken or typed) into origin and destination.
 */
export function parseJourneySentence(input: string): { originRaw: string; destRaw: string } | null {
    if (!input || !input.trim()) return null;
    let text = input.trim();

    // 1. English "from X to Y" or "how to reach Y from X"
    const fromToMatch = text.match(/(?:from)\s+(.+?)\s+(?:to|towards|->)\s+(.+)/i);
    if (fromToMatch) {
        return {
            originRaw: fromToMatch[1].trim(),
            destRaw: fromToMatch[2].trim()
        };
    }

    const reachFromMatch = text.match(/(?:reach|go to)\s+(.+?)\s+(?:from)\s+(.+)/i);
    if (reachFromMatch) {
        return {
            originRaw: reachFromMatch[2].trim(),
            destRaw: reachFromMatch[1].trim()
        };
    }

    // 2. Malayalam split: "നിന്ന്" / "മുതൽ ... വരെ" / "ലേക്ക്"
    if (text.includes('നിന്ന്')) {
        const parts = text.split(/നിന്ന്/i);
        if (parts.length >= 2) {
            return {
                originRaw: parts[0].trim(),
                destRaw: parts.slice(1).join(' ').trim()
            };
        }
    }

    if (text.includes('മുതൽ') && text.includes('വരെ')) {
        const match = text.match(/മുതൽ\s+(.+?)\s+വരെ\s*(.*)/);
        if (match) {
            return {
                originRaw: match[1].trim(),
                destRaw: match[2].trim() || match[1].trim()
            };
        }
    }

    // 3. Hindi split: " से " (with optional "तक" / "जाना है")
    if (text.includes(' से ')) {
        const parts = text.split(/ से /);
        if (parts.length >= 2) {
            let origin = parts[0].replace(/^मुझे\s+/i, '').trim();
            let dest = parts.slice(1).join(' ').trim();
            return {
                originRaw: origin,
                destRaw: dest
            };
        }
    }

    // 4. English generic split: " to ", " -> ", " - ", " ടു "
    const genericSplit = /\s+(?:to|->|-|towards|ടു)\s+/i;
    if (genericSplit.test(text)) {
        const parts = text.split(genericSplit);
        if (parts.length >= 2) {
            return {
                originRaw: parts[0].trim(),
                destRaw: parts.slice(1).join(' ').trim()
            };
        }
    }

    return null;
}

/**
 * Translates a canonical stop name or alias to the target language if a translation exists.
 */
export function getLocalizedStopName(stopName: string, lang: string): string {
    if (!lang || lang === 'en' || !stopName) return stopName;
    if (aliasToCanonicalMap.size === 0) {
        loadLanguageEngine();
    }
    if (!translationsData || !Array.isArray(translationsData.stops)) return stopName;

    const lower = stopName.trim().toLowerCase();

    // 1. Direct canonical match
    let entry = translationsData.stops.find(s => s.canonical.toLowerCase() === lower);
    if (entry && entry.translations && entry.translations[lang]) {
        return entry.translations[lang];
    }

    // 2. Resolved canonical match
    const canonical = resolveStopName(stopName);
    if (canonical) {
        entry = translationsData.stops.find(s => s.canonical.toLowerCase() === canonical.toLowerCase());
        if (entry && entry.translations && entry.translations[lang]) {
            return entry.translations[lang];
        }
    }

    return stopName;
}

/**
 * Translates route headsign / names (e.g. "Thrippoonithura ↔ Infopark") into the target language.
 */
export function getLocalizedRouteName(routeName: string, lang: string): string {
    if (!lang || lang === 'en' || !routeName) return routeName;
    if (routeName.includes('↔')) {
        const parts = routeName.split('↔').map(p => p.trim());
        return parts.map(p => getLocalizedStopName(p, lang)).join(' ↔ ');
    }
    if (routeName.includes(' - ')) {
        const parts = routeName.split(' - ').map(p => p.trim());
        return parts.map(p => getLocalizedStopName(p, lang)).join(' - ');
    }
    return getLocalizedStopName(routeName, lang);
}

/**
 * Converts numbers to spoken number words in Malayalam & Hindi if desired, or formatted string
 */
const numberWords: Record<string, Record<number, string>> = {
    ml: {
        10: 'പത്ത്', 11: 'പതിനൊന്ന്', 12: 'പന്ത്രണ്ട്', 13: 'പതിമൂന്ന്', 14: 'പതിനാല്',
        15: 'പതിനഞ്ച്', 16: 'പതിനാറ്', 17: 'പതിനേഴ്', 18: 'പതിനെട്ട്', 19: 'പത്തൊൻപത്',
        20: 'ഇരുപത്', 21: 'ഇരുപത്തിയൊന്ന്', 22: 'ഇരുപത്തിരണ്ട്', 25: 'ഇരുപത്തിയഞ്ച്', 30: 'മുപ്പത്'
    },
    hi: {
        10: 'दस', 11: 'ग्यारह', 12: 'बारह', 13: 'तेरह', 14: 'चौदह',
        15: 'पंद्रह', 16: 'सोलह', 17: 'सत्रह', 18: 'अठारह', 19: 'उन्नीस',
        20: 'बीस', 21: 'इक्कीस', 22: 'बाईस', 25: 'पच्चीस', 30: 'तीस'
    },
    en: {
        10: 'ten', 11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen',
        15: 'fifteen', 16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen',
        20: 'twenty', 21: 'twenty-one', 22: 'twenty-two', 25: 'twenty-five', 30: 'thirty'
    }
};

/**
 * Generates natural spoken journey instructions following the required format.
 */
export function generateSpokenSummary(
    boardingStop: string,
    destinationStop: string,
    estimatedFare: number | null,
    lang: string = 'en'
): string {
    const boarding = getLocalizedStopName(boardingStop, lang);
    const destination = getLocalizedStopName(destinationStop, lang);

    if (lang === 'ml') {
        if (estimatedFare != null) {
            const fareWord = numberWords.ml[estimatedFare] || `${estimatedFare}`;
            return `${boarding}ൽ നിന്ന് ${destination}ലേക്ക് ബസ് എടുക്കുക. ഏകദേശ നിരക്ക് ${fareWord} രൂപയാണ്.`;
        }
        return `${boarding}ൽ നിന്ന് ${destination}ലേക്ക് ബസ് എടുക്കുക. നിരക്ക് വിവരം ലഭ്യമല്ല.`;
    }

    if (lang === 'hi') {
        if (estimatedFare != null) {
            const fareWord = numberWords.hi[estimatedFare] || `${estimatedFare}`;
            return `${boarding} से ${destination} के लिए बस लें। अनुमानित किराया ${fareWord} रुपये है।`;
        }
        return `${boarding} से ${destination} के लिए बस लें। किराया विवरण उपलब्ध नहीं है।`;
    }

    // Default English
    if (estimatedFare != null) {
        const fareWord = numberWords.en[estimatedFare] || `${estimatedFare}`;
        return `Take a bus from ${boarding} to ${destination}. Your estimated fare is ${fareWord} rupees.`;
    }
    return `Take a bus from ${boarding} to ${destination}. Fare estimate is unavailable.`;
}

/**
 * Generates phonetic Latin transliterated spoken audio instructions for mobile devices
 * (like iPhones/iOS Safari) that do not have native Malayalam or Hindi TTS voice engines.
 */
export function generatePhoneticSummary(
    boardingStop: string,
    destinationStop: string,
    estimatedFare: number | null,
    lang: string = 'en'
): string {
    const boarding = boardingStop;
    const destination = destinationStop;

    if (lang === 'ml') {
        if (estimatedFare != null) {
            return `${boarding}il ninnu ${destination}ilekku bus edukuka. Ekadesha nirakku ${estimatedFare} roopa aanu.`;
        }
        return `${boarding}il ninnu ${destination}ilekku bus edukuka.`;
    }

    if (lang === 'hi') {
        if (estimatedFare != null) {
            return `${boarding} se ${destination} ke liye bus lein. Anumaanit kiraaya ${estimatedFare} rupaye hai.`;
        }
        return `${boarding} se ${destination} ke liye bus lein.`;
    }

    return generateSpokenSummary(boardingStop, destinationStop, estimatedFare, 'en');
}

