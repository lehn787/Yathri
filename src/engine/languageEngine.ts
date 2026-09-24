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
 * Converts numbers to spoken words in Malayalam, Hindi, and English
 */
export function numberToMalayalamWords(num: number): string {
    const ones: Record<number, string> = {
        0: 'പൂജ്യം', 1: 'ഒന്ന്', 2: 'രണ്ട്', 3: 'മൂന്ന്', 4: 'നാല്', 5: 'അഞ്ച്',
        6: 'ആറ്', 7: 'ഏഴ്', 8: 'എട്ട്', 9: 'ഒൻപത്', 10: 'പത്ത്',
        11: 'പതിനൊന്ന്', 12: 'പന്ത്രണ്ട്', 13: 'പതിമൂന്ന്', 14: 'പതിനാല്', 15: 'പതിനഞ്ച്',
        16: 'പതിനാറ്', 17: 'പതിനേഴ്', 18: 'പതിനെട്ട്', 19: 'പത്തൊൻപത്'
    };
    if (ones[num]) return ones[num];

    const tens: Record<number, string> = {
        20: 'ഇരുപത്', 30: 'മുപ്പത്', 40: 'നാൽപ്പത്', 50: 'അമ്പത്',
        60: 'അറുപത്', 70: 'എഴുപത്', 80: 'എൺപത്', 90: 'തൊണ്ണൂറ്', 100: 'നൂറ്'
    };
    if (tens[num]) return tens[num];

    if (num > 20 && num < 30) return `ഇരുപത്തി${ones[num - 20]}`;
    if (num > 30 && num < 40) return `മുപ്പത്തി${ones[num - 30]}`;
    if (num > 40 && num < 50) return `നാൽപ്പത്തി${ones[num - 40]}`;
    if (num > 50 && num < 60) return `അമ്പത്തി${ones[num - 50]}`;
    if (num > 60 && num < 70) return `അറുപത്തി${ones[num - 60]}`;
    if (num > 70 && num < 80) return `എഴുപത്തി${ones[num - 70]}`;
    if (num > 80 && num < 90) return `എൺപത്തി${ones[num - 80]}`;
    if (num > 90 && num < 100) return `തൊണ്ണൂറ്റി${ones[num - 90]}`;

    return `${num}`;
}

export function numberToManglishWords(num: number): string {
    const ones: Record<number, string> = {
        0: 'poojyam', 1: 'onnu', 2: 'randu', 3: 'moonnu', 4: 'naalu', 5: 'anju',
        6: 'aaru', 7: 'yezhu', 8: 'yettu', 9: 'onpathu', 10: 'patthu',
        11: 'pathinonnu', 12: 'pantrandu', 13: 'pathimoonnu', 14: 'pathinaalu', 15: 'pathinanju',
        16: 'pathinaaru', 17: 'pathinezhu', 18: 'pathinettu', 19: 'pathonpathu'
    };
    if (ones[num]) return ones[num];

    const tens: Record<number, string> = {
        20: 'irupathu', 30: 'muppathu', 40: 'naalpathu', 50: 'ambathu',
        60: 'arupathu', 70: 'ezhupathu', 80: 'enpathu', 90: 'thonnooru', 100: 'nooru'
    };
    if (tens[num]) return tens[num];

    if (num > 20 && num < 30) return `irupatthi-${ones[num - 20]}`;
    if (num > 30 && num < 40) return `muppatthi-${ones[num - 30]}`;
    if (num > 40 && num < 50) return `naalpatthi-${ones[num - 40]}`;
    if (num > 50 && num < 60) return `ambatthi-${ones[num - 50]}`;

    return `${num}`;
}

function formatMalayalamOrigin(stopName: string): string {
    const s = stopName.trim();
    if (s.endsWith('ം')) {
        return `${s.slice(0, -1)}ത്ത് നിന്ന്`;
    }
    if (s.endsWith('്') || s.endsWith('ർ') || s.endsWith('ൽ') || s.endsWith('ക്ക്')) {
        return `${s}ിൽ നിന്ന്`;
    }
    return `${s}ിൽ നിന്ന്`;
}

function formatMalayalamDest(stopName: string): string {
    const s = stopName.trim();
    if (s.endsWith('ം')) {
        return `${s.slice(0, -1)}ത്തേക്ക്`;
    }
    if (s.endsWith('്') || s.endsWith('ർ') || s.endsWith('ൽ') || s.endsWith('ക്ക്')) {
        return `${s}ിലേക്ക്`;
    }
    return `${s}ിലേക്ക്`;
}

function cleanStopNameForTTS(name: string): string {
    return name
        .replace(/\s+(?:Junction|Jn|Bus Stop|Stop|Terminal|Stand|Bypass)$/i, '')
        .trim();
}

function formatManglishOrigin(name: string): string {
    const clean = cleanStopNameForTTS(name);
    const lower = clean.toLowerCase();
    if (lower.endsWith('am') || lower.endsWith('om')) {
        return `${clean.replace(/(am|om)$/i, 'ath')} ninnum`;
    }
    if (/[aeiouy]$/i.test(clean)) {
        return `${clean}yil ninnum`;
    }
    return `${clean}-il ninnum`;
}

function formatManglishDest(name: string): string {
    const clean = cleanStopNameForTTS(name);
    const lower = clean.toLowerCase();
    if (lower.endsWith('am') || lower.endsWith('om')) {
        return `${clean.replace(/(am|om)$/i, 'athekku')}`;
    }
    if (/[aeiouy]$/i.test(clean)) {
        return `${clean}yilekku`;
    }
    return `${clean}-ilekku`;
}

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
        const fromStop = formatMalayalamOrigin(boarding);
        const toStop = formatMalayalamDest(destination);
        if (estimatedFare != null) {
            const fareWord = numberToMalayalamWords(estimatedFare);
            return `${fromStop} ${toStop} ബസ് എടുക്കുക. ടിക്കറ്റ് നിരക്ക് ${fareWord} രൂപയാണ്.`;
        }
        return `${fromStop} ${toStop} ബസ് എടുക്കുക. നിരക്ക് വിവരം ലഭ്യമല്ല.`;
    }

    if (lang === 'hi') {
        if (estimatedFare != null) {
            return `${boarding} से ${destination} के लिए बस लें। टिकट दर ${estimatedFare} रुपये है।`;
        }
        return `${boarding} से ${destination} के लिए बस लें।`;
    }

    // Default English
    if (estimatedFare != null) {
        return `Take a bus from ${boarding} to ${destination}. Your estimated fare is ${estimatedFare} rupees.`;
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
    if (lang === 'ml') {
        const fromStop = formatManglishOrigin(boardingStop);
        const toStop = formatManglishDest(destinationStop);
        if (estimatedFare != null) {
            const fareWord = numberToManglishWords(estimatedFare);
            return `${fromStop} ${toStop} bus edukkuka. Ticket charge ${fareWord} roopa aanu.`;
        }
        return `${fromStop} ${toStop} bus edukkuka.`;
    }

    if (lang === 'hi') {
        const cleanBoarding = cleanStopNameForTTS(boardingStop);
        const cleanDest = cleanStopNameForTTS(destinationStop);
        if (estimatedFare != null) {
            return `${cleanBoarding} se ${cleanDest} ke liye bus lein. Ticket charge ${estimatedFare} rupaye hai.`;
        }
        return `${cleanBoarding} se ${cleanDest} ke liye bus lein.`;
    }

    return generateSpokenSummary(boardingStop, destinationStop, estimatedFare, 'en');
}

