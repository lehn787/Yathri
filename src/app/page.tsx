'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { searchJourneyAction, getGtfsStopsAction, SearchResponse } from './actions';
import { StopSearchCombobox } from '../components/StopSearchCombobox';
import uiTranslations from '../data/uiTranslations.json';
import stopTranslations from '../data/stopTranslations.json';

type Language = 'en' | 'ml' | 'hi';
type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

const speechLangMap: Record<Language, string> = {
  en: 'en-IN',
  ml: 'ml-IN',
  hi: 'hi-IN'
};

const popularHubs = [
  'Thrippunithura',
  'Infopark',
  'Kakkanad Civil Station',
  'Vyttila',
  'Aluva',
  'Menaka'
];

export default function Home() {
  const [lang, setLang] = useState<Language>('en');
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [allGtfsStops, setAllGtfsStops] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [largeText, setLargeText] = useState(false);

  // Load all available GTFS stops from dataset
  useEffect(() => {
    getGtfsStopsAction()
      .then(stops => {
        if (stops && stops.length > 0) {
          setAllGtfsStops(stops);
        }
      })
      .catch(err => console.error('Failed to load GTFS stops:', err));
  }, []);

  // Load accessibility settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('yathri_large_text');
      if (saved === 'true') {
        setLargeText(true);
      }
    } catch (e) {}
  }, []);

  // Voice Interaction States
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [spokenInput, setSpokenInput] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef<any>(null);
  const t = uiTranslations[lang] || uiTranslations.en;

  // Build client-side stop translation dictionary for instant language switching
  const translationMap = useMemo(() => {
    const map = new Map<string, Record<string, string>>();
    if (stopTranslations && Array.isArray(stopTranslations.stops)) {
      for (const item of stopTranslations.stops) {
        if (item.translations) {
          if (item.canonical) {
            map.set(item.canonical.toLowerCase().trim(), item.translations);
          }
          if (item.aliases) {
            for (const l in item.aliases) {
              const list = (item.aliases as Record<string, string[]>)[l] || [];
              for (const alias of list) {
                if (alias) {
                  map.set(alias.toLowerCase().trim(), item.translations);
                }
              }
            }
          }
        }
      }
    }
    return map;
  }, []);

  const localizeStop = (name?: string): string => {
    if (!name) return '';
    if (lang === 'en') return name;
    const lower = name.toLowerCase().trim();
    const entry = translationMap.get(lower);
    if (entry && entry[lang]) {
      return entry[lang];
    }
    return name;
  };

  const localizeRoute = (routeName?: string): string => {
    if (!routeName) return '';
    if (lang === 'en') return routeName;
    if (routeName.includes('↔')) {
      const parts = routeName.split('↔').map(p => p.trim());
      return parts.map(p => localizeStop(p)).join(' ↔ ');
    }
    if (routeName.includes(' - ')) {
      const parts = routeName.split(' - ').map(p => p.trim());
      return parts.map(p => localizeStop(p)).join(' - ');
    }
    return localizeStop(routeName);
  };

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Speak journey summary aloud using SpeechSynthesis
  const speakText = (text: string, phoneticFallback?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }

      const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
      const targetLang = speechLangMap[lang] || 'en-IN';
      const targetPrefix = targetLang.split('-')[0].toLowerCase();

      // Check if the device has a native voice for this language (e.g. ml-IN, hi-IN)
      const nativeVoice = voices.find(v => 
        v.lang.toLowerCase() === targetLang.toLowerCase() || 
        v.lang.toLowerCase().startsWith(targetPrefix) ||
        (targetPrefix === 'ml' && v.name.toLowerCase().includes('malayalam')) ||
        (targetPrefix === 'hi' && v.name.toLowerCase().includes('hindi'))
      );

      let textToSpeak = text;
      let voiceToUse = nativeVoice;
      let langToSet = targetLang;

      // If Malayalam or Hindi is requested but device has no synthesizer for native script (common on iOS Safari / older Android)
      if (!nativeVoice && (lang === 'ml' || lang === 'hi')) {
        if (phoneticFallback) {
          textToSpeak = phoneticFallback;
        }
        // Fall back to an Indian English or Hindi voice engine which exists on all mobile devices
        const fallbackVoice = voices.find(v => 
          v.lang.toLowerCase() === 'en-in' || 
          v.lang.toLowerCase() === 'en_in' ||
          v.name.toLowerCase().includes('india') ||
          v.name.toLowerCase().includes('rishi') ||
          v.name.toLowerCase().includes('veena') ||
          v.name.toLowerCase().includes('lekha')
        ) || voices.find(v => v.lang.toLowerCase().startsWith('en')) || voices[0];

        voiceToUse = fallbackVoice;
        langToSet = fallbackVoice?.lang || 'en-IN';
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = langToSet;
      // 0.86 rate provides clear, unhurried articulation of Malayalam phonemes
      utterance.rate = lang === 'ml' ? 0.86 : 0.92;
      utterance.pitch = 1.0;
      if (voiceToUse) {
        utterance.voice = voiceToUse;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (err) => {
        console.warn('Speech synthesis error:', err);
        setIsSpeaking(false);
      };

      // Slight timeout avoids iOS Safari audio unlock race conditions
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('Speech speak error:', e);
          setIsSpeaking(false);
        }
      }, 50);
    } catch (e) {
      console.warn('Speech synthesis unavailable:', e);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const handleVoiceSearch = (speechQuery: string) => {
    setVoiceState('processing');
    setLoading(true);
    setVoiceError(null);
    setValidationError(null);
    setSpokenInput(speechQuery);

    searchJourneyAction(speechQuery, '', lang)
      .then(res => {
        if (res.success && res.extractedStops) {
          // 4. Populate From and To fields with canonical resolved names
          setOrigin(res.extractedStops.origin);
          setDest(res.extractedStops.destination);
          setResult(res);
          setVoiceState('idle');
          if (res.spokenSummary) {
            speakText(res.spokenSummary, res.spokenSummaryPhonetic);
          }
        } else {
          // If extraction fails, do NOT run route engine; show clear retry option
          setVoiceState('error');
          setVoiceError(res.error || t.cantIdentify);
        }
      })
      .catch(() => {
        setVoiceState('error');
        setVoiceError(t.cantIdentify);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const startListening = (fallbackLang?: string) => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError(t.micErrorUnsupported);
      setVoiceState('error');
      return;
    }

    stopSpeaking();
    const activeLang = fallbackLang || speechLangMap[lang] || 'en-IN';
    console.log(`[VOICE] selected language: ${activeLang}`);

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = activeLang;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('[VOICE] recognition started');
        setVoiceState('listening');
        setVoiceError(null);
        setSpokenInput(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        console.log(`[VOICE] raw transcript: ${transcript}`);
        if (transcript) {
          handleVoiceSearch(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.log(`[VOICE] error: ${event.error}`);

        // If the mobile browser/OS does not support ml-IN or hi-IN, gracefully fallback to en-IN
        if ((event.error === 'language-not-supported' || event.error === 'service-not-allowed') && activeLang !== 'en-IN') {
          console.log('[VOICE] Locale not supported on device, falling back to en-IN...');
          try {
            recognition.abort();
          } catch (e) {}
          startListening('en-IN');
          return;
        }

        if (event.error === 'not-allowed') {
          setVoiceError(t.micErrorPermission);
        } else if (event.error === 'no-speech') {
          setVoiceError(t.micErrorNoSpeech);
        } else {
          setVoiceError(t.errorGeneric);
        }
        setVoiceState('error');
      };

      recognition.onend = () => {
        console.log('[VOICE] recognition ended');
        if (voiceState === 'listening') {
          setVoiceState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.log(`[VOICE] exception: ${err?.message}`);
      if (activeLang !== 'en-IN') {
        startListening('en-IN');
        return;
      }
      setVoiceError(t.errorGeneric);
      setVoiceState('error');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setVoiceState('idle');
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !origin.trim()) {
      setValidationError(t.fromPlaceholder || 'Please select a starting stop.');
      return;
    }
    if (!dest || !dest.trim()) {
      setValidationError(t.toPlaceholder || 'Please select a destination stop.');
      return;
    }
    if (origin.trim().toLowerCase() === dest.trim().toLowerCase()) {
      setValidationError((t as any).sameStopError || 'Starting stop and destination cannot be the same.');
      return;
    }

    setValidationError(null);
    stopSpeaking();
    setSpokenInput(null);
    setLoading(true);
    try {
      const res = await searchJourneyAction(origin, dest, lang);
      setResult(res);
      if (res.success && res.spokenSummary) {
        speakText(res.spokenSummary, res.spokenSummaryPhonetic);
      }
    } catch (err) {
      setResult({ success: false, error: t.errorGeneric });
    } finally {
      setLoading(false);
    }
  };

  const selectQuickHub = (hub: string) => {
    setValidationError(null);
    if (!origin) {
      setOrigin(hub);
    } else if (!dest) {
      setDest(hub);
    } else {
      setOrigin(hub);
    }
  };

  const renderHeader = () => (
    <header className="app-header">
      <div className="brand-section">
        <h1 className="title">{t.appTitle}</h1>
        <p className="subtitle">{t.appSubtitle}</p>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className={`access-btn ${largeText ? 'active' : ''}`}
          onClick={() => {
            const next = !largeText;
            setLargeText(next);
            try {
              localStorage.setItem('yathri_large_text', String(next));
            } catch (e) {}
          }}
          aria-label={largeText ? t.textNormal : t.largeText}
          title={largeText ? t.textNormal : t.largeText}
        >
          <span style={{ fontSize: '1rem', fontWeight: 800 }}>Aa</span>
          <span>{largeText ? t.textNormal : t.largeText}</span>
        </button>

        <div className="lang-selector">
          <button 
            type="button" 
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => {
              setLang('en');
              stopSpeaking();
            }}
          >
            English
          </button>
          <button 
            type="button" 
            className={`lang-btn ${lang === 'ml' ? 'active' : ''}`}
            onClick={() => {
              setLang('ml');
              stopSpeaking();
            }}
          >
            മലയാളം
          </button>
          <button 
            type="button" 
            className={`lang-btn ${lang === 'hi' ? 'active' : ''}`}
            onClick={() => {
              setLang('hi');
              stopSpeaking();
            }}
          >
            हिन्दी
          </button>
        </div>
      </div>
    </header>
  );

  const renderHome = () => (
    <>
      {renderHeader()}

      <div className="dashboard-grid">
        {/* Left Column: Search & Voice Input */}
        <div className="glass-card">
          <div className={`voice-section ${voiceState === 'listening' ? 'listening' : ''} ${voiceState === 'processing' ? 'processing' : ''}`}>
            <button 
              type="button" 
              className={`voice-btn ${voiceState === 'listening' ? 'listening' : ''} ${voiceState === 'processing' ? 'processing' : ''}`}
              onClick={voiceState === 'listening' ? stopListening : () => startListening()}
              aria-label="Voice input"
            >
              {voiceState === 'listening' ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              )}
            </button>

            <div className={`voice-status-text ${voiceState}`}>
              {voiceState === 'listening' && t.micListening}
              {voiceState === 'processing' && t.micProcessing}
              {voiceState === 'idle' && t.micIdle}
              {voiceState === 'error' && (
                <div>
                  <div>{voiceError || t.cantIdentify}</div>
                  {t.trySaying && <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.25rem', color: '#93c5fd' }}>{t.trySaying}</div>}
                </div>
              )}
            </div>

            {voiceState === 'error' && (
              <button 
                type="button" 
                className="chip" 
                style={{ marginTop: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
                onClick={() => startListening()}
              >
                🔄 {t.tapToRetry}
              </button>
            )}

            {spokenInput && voiceState !== 'error' && (
              <div className="recognized-bubble">
                <span style={{ fontSize: '0.75rem', opacity: 0.8, display: 'block' }}>{t.youSaid}:</span>
                "{spokenInput}"
              </div>
            )}
          </div>

          <form onSubmit={handleSearch}>
            <StopSearchCombobox
              id="from-stop-combobox"
              label={t.fromLabel}
              placeholder={t.fromPlaceholder}
              value={origin}
              onChange={val => {
                setOrigin(val);
                setValidationError(null);
              }}
              allStops={allGtfsStops}
              localizeStop={localizeStop}
              disabled={loading}
              icon="🟢"
              noResultsText={(t as any).noStopsFound || 'No matching stops found'}
            />

            <StopSearchCombobox
              id="to-stop-combobox"
              label={t.toLabel}
              placeholder={t.toPlaceholder}
              value={dest}
              onChange={val => {
                setDest(val);
                setValidationError(null);
              }}
              allStops={allGtfsStops}
              localizeStop={localizeStop}
              disabled={loading}
              icon="🔴"
              noResultsText={(t as any).noStopsFound || 'No matching stops found'}
            />

            {validationError && (
              <div className="validation-alert" role="alert">
                <span>⚠️</span> {validationError}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? t.searching : t.findJourney}
            </button>

            <div style={{ marginTop: '1.25rem' }}>
              <span className="input-label" style={{ fontSize: '0.75rem' }}>{t.popularStopsTitle}</span>
              <div className="quick-chips">
                {popularHubs.map(hub => (
                  <button
                    key={hub}
                    type="button"
                    className="chip"
                    onClick={() => selectQuickHub(hub)}
                  >
                    {localizeStop(hub)}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Desktop Guide & Insights */}
        <div className="glass-card info-card">
          <div className="card-title">
            <span>✨</span> {t.howToUseTitle}
          </div>

          <div className="info-item">
            <span className="info-icon">🎙️</span>
            <div>
              <div className="info-title">{t.voiceTipTitle}</div>
              <div className="info-desc">{t.voiceTipDesc}</div>
            </div>
          </div>

          <div className="info-item">
            <span className="info-icon">💰</span>
            <div>
              <div className="info-title">{t.mvdRuleTitle}</div>
              <div className="info-desc">{t.mvdRuleDesc}</div>
            </div>
          </div>

          <div className="info-item">
            <span className="info-icon">📍</span>
            <div>
              <div className="info-title">Kochi GTFS Transit Network</div>
              <div className="info-desc">1,400+ sequential bus stops across Thrippunithura, Kakkanad, Infopark, Aluva, Vyttila, and Fort Kochi.</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderResult = () => {
    if (!result) return null;

    if (!result.success) {
      let errorMsg = result.error || t.errorGeneric;
      if (result.error?.includes('Unknown stop') || result.error?.includes('not found')) {
        errorMsg = t.errorUnknownStop;
      } else if (result.error?.includes('No direct route')) {
        errorMsg = t.errorNoRoute;
      }

      return (
        <div style={{ width: '100%' }}>
          {renderHeader()}
          <div className="glass-card" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div className="error-msg">{errorMsg}</div>
            <button 
              className="btn-secondary" 
              onClick={() => {
                stopSpeaking();
                setResult(null);
              }}
            >
              {t.backButton}
            </button>
          </div>
        </div>
      );
    }

    const { journey, fare, spokenSummary, extractedStops } = result;
    const boardingDisplay = localizeStop(journey?.boardingStop);
    const destinationDisplay = localizeStop(journey?.destinationStop);
    const routeDisplay = localizeRoute(journey?.routeName);
    const stopCount = journey?.stops?.length || 0;

    return (
      <div style={{ width: '100%' }}>
        {renderHeader()}

        <div className="results-grid">
          {/* Left Column: Summary & Metrics Dashboard */}
          <div className="glass-card">
            <div className="result-header">
              <div className="route-badge">
                <span>🚌</span> {journey?.routeId}
              </div>
              <div className={`status-badge ${journey?.isDirect ? 'direct' : 'transfer'}`}>
                {journey?.isDirect ? `● ${t.direct}` : `● ${t.transfer}`}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div className="input-label">{t.route}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{routeDisplay}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.85rem', border: '1px solid var(--card-border)' }}>
                <div className="input-label" style={{ color: '#60a5fa' }}>🟢 {t.boardingStop}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{boardingDisplay}</div>
              </div>

              <div style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.85rem', border: '1px solid var(--card-border)' }}>
                <div className="input-label" style={{ color: '#f87171' }}>🔴 {t.destinationStop}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{destinationDisplay}</div>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="metrics-grid">
              <div className="metric-box">
                <div className="metric-label">{t.distance}</div>
                <div className="metric-val">{fare?.distanceKm} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>km</span></div>
                <div className="metric-sub">{stopCount} stops</div>
              </div>

              <div className="metric-box">
                <div className="metric-label">{t.estimatedFare}</div>
                <div className="metric-val" style={{ color: '#34d399', fontWeight: 800, fontSize: '1.6rem' }}>
                  {fare?.estimatedFare != null ? `₹${fare.estimatedFare}` : '--'}
                </div>
                <div className="metric-sub">
                  {fare?.estimatedFare != null ? `(${t.estimated})` : t.fareUnavailable}
                </div>
              </div>
            </div>

            {/* Audio Voice Playback Bar */}
            <div className="audio-bar">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isSpeaking ? '🔊 Speaking...' : '🔈 Audio instructions'}
              </span>
              <button 
                type="button" 
                className={`btn-speaker ${isSpeaking ? 'speaking' : ''}`}
                onClick={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                  } else if (spokenSummary) {
                    speakText(spokenSummary, result.spokenSummaryPhonetic);
                  }
                }}
              >
                {isSpeaking ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    {t.stopAudio}
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                    {t.replayAudio}
                  </>
                )}
              </button>
            </div>

            {spokenInput && (
              <div className="spoken-transcript-card" style={{ marginBottom: '1.25rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
                <div style={{ width: '100%' }}>
                  <span style={{ opacity: 0.8, fontSize: '0.8rem', display: 'block' }}>{t.youSaid}:</span>
                  <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>"{spokenInput}"</div>
                  {extractedStops && (
                    <div style={{ fontSize: '0.8rem', color: '#93c5fd' }}>
                      {t.from}: <strong>{localizeStop(extractedStops.origin)}</strong> &bull; {t.to}: <strong>{localizeStop(extractedStops.destination)}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button 
              className="btn-secondary" 
              onClick={() => {
                stopSpeaking();
                setResult(null);
              }}
            >
              {t.backButton}
            </button>
          </div>

          {/* Right Column: Ordered Stops Timeline */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div className="card-title" style={{ margin: 0 }}>
                <span>📍</span> {t.orderedStops}
              </div>
              <div style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.6rem', borderRadius: '999px', color: 'var(--text-muted)' }}>
                {stopCount} {t.totalStopsLabel || 'Stops'}
              </div>
            </div>

            <div className="stop-timeline">
              {journey?.stops?.map((stop, i) => {
                const isFirst = i === 0;
                const isLast = i === stopCount - 1;
                return (
                  <div 
                    key={i} 
                    className={`stop-timeline-item ${isFirst ? 'start' : ''} ${isLast ? 'end' : ''}`}
                  >
                    <div>{localizeStop(stop)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className={`app-container ${largeText ? 'large-text-mode' : ''}`}>
      {!result ? renderHome() : renderResult()}
    </main>
  );
}
