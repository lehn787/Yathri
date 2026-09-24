'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { searchJourneyAction, SearchResponse } from './actions';
import uiTranslations from '../data/uiTranslations.json';
import stopTranslations from '../data/stopTranslations.json';

type Language = 'en' | 'ml' | 'hi';
type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

const speechLangMap: Record<Language, string> = {
  en: 'en-IN',
  ml: 'ml-IN',
  hi: 'hi-IN'
};

export default function Home() {
  const [lang, setLang] = useState<Language>('en');
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);

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

  // Speak journey summary aloud using SpeechSynthesis
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLangMap[lang];
      utterance.rate = 0.95;

      // Select language-specific voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => 
        v.lang === speechLangMap[lang] || 
        v.lang.startsWith(speechLangMap[lang].split('-')[0])
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
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

  // Cleanup speech synthesis on unmount
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

    searchJourneyAction(speechQuery, '', lang)
      .then(res => {
        setResult(res);
        setVoiceState('idle');
        if (res.success && res.spokenSummary) {
          speakText(res.spokenSummary);
        }
      })
      .catch(() => {
        setResult({ success: false, error: t.errorGeneric });
        setVoiceState('idle');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError(t.micErrorUnsupported);
      setVoiceState('error');
      return;
    }

    // Cancel any active speech synthesis
    stopSpeaking();

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = speechLangMap[lang];
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceState('listening');
        setVoiceError(null);
        setSpokenInput(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setSpokenInput(transcript);
          handleVoiceSearch(transcript);
        }
      };

      recognition.onerror = (event: any) => {
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
        if (voiceState === 'listening') {
          setVoiceState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
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
    if (!origin && !dest) return;
    
    stopSpeaking();
    setSpokenInput(null);
    setLoading(true);
    try {
      const res = await searchJourneyAction(origin, dest, lang);
      setResult(res);
      if (res.success && res.spokenSummary) {
        speakText(res.spokenSummary);
      }
    } catch (err) {
      setResult({ success: false, error: t.errorGeneric });
    } finally {
      setLoading(false);
    }
  };

  const renderLanguageSelector = () => (
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
  );

  const renderHome = () => (
    <>
      {renderLanguageSelector()}

      <div className="hero">
        <h1 className="title">{t.appTitle}</h1>
        <p className="subtitle">{t.appSubtitle}</p>
      </div>

      <div className="glass-card">
        {/* Voice Interaction Section */}
        <div className={`voice-section ${voiceState === 'listening' ? 'listening' : ''} ${voiceState === 'processing' ? 'processing' : ''}`}>
          <button 
            type="button" 
            className={`voice-btn ${voiceState === 'listening' ? 'listening' : ''} ${voiceState === 'processing' ? 'processing' : ''}`}
            onClick={voiceState === 'listening' ? stopListening : startListening}
            aria-label="Voice input"
          >
            {voiceState === 'listening' ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            {voiceState === 'error' && (voiceError || t.errorGeneric)}
          </div>

          {spokenInput && (
            <div className="recognized-bubble">
              "{spokenInput}"
            </div>
          )}
        </div>

        <form onSubmit={handleSearch}>
          <div className="input-group">
            <label className="input-label">{t.fromLabel}</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder={t.fromPlaceholder} 
              value={origin}
              onChange={e => setOrigin(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">{t.toLabel}</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder={t.toPlaceholder} 
              value={dest}
              onChange={e => setDest(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t.searching : t.findJourney}
          </button>
        </form>
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
        <div className="glass-card">
          {renderLanguageSelector()}
          <div className="error-msg">{errorMsg}</div>
          <button className="btn-secondary" onClick={() => {
            stopSpeaking();
            setResult(null);
          }}>
            {t.backButton}
          </button>
        </div>
      );
    }

    const { journey, fare, spokenSummary } = result;
    const boardingDisplay = localizeStop(journey?.boardingStop);
    const destinationDisplay = localizeStop(journey?.destinationStop);
    const routeDisplay = localizeRoute(journey?.routeName);

    return (
      <div className="glass-card">
        {renderLanguageSelector()}

        <h2 className="title" style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>{t.yourJourney}</h2>
        
        {spokenInput && (
          <div className="spoken-transcript-card">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            <div>
              <span style={{ opacity: 0.8, fontSize: '0.8rem', display: 'block' }}>{t.spokenSentenceLabel}:</span>
              <strong>"{spokenInput}"</strong>
            </div>
          </div>
        )}

        {/* Audio Playback Controls */}
        <div className="audio-controls">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isSpeaking ? '🔊 Speaking...' : '🔈 Voice output'}
          </span>
          <button 
            type="button" 
            className={`btn-speaker ${isSpeaking ? 'speaking' : ''}`}
            onClick={() => {
              if (isSpeaking) {
                stopSpeaking();
              } else if (spokenSummary) {
                speakText(spokenSummary);
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

        <div className="result-section">
          <div className="result-label">{t.boardingStop}</div>
          <div className="result-value">{boardingDisplay}</div>
        </div>

        <div className="result-section">
          <div className="result-label">{t.destinationStop}</div>
          <div className="result-value">{destinationDisplay}</div>
        </div>

        <div className="result-section">
          <div className="result-label">{t.route}</div>
          <div className="result-value">
            {routeDisplay}
            <div className="route-badge">{journey?.routeId}</div>
          </div>
        </div>

        <div className="result-section">
          <div className="result-label">{t.status}</div>
          <div className="result-value" style={{ color: journey?.isDirect ? 'var(--success)' : 'inherit' }}>
            {journey?.isDirect ? t.direct : t.transfer}
          </div>
        </div>

        <div className="result-section">
          <div className="result-label">{t.distanceAndFare}</div>
          <div className="result-value">
            {fare?.distanceKm} km
          </div>
          <div className="result-value" style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>
            {fare?.available ? (
              <span>
                ₹{fare.estimatedFare}
                {fare.fareStages != null ? ` (${fare.fareStages} ${t.stages})` : ` (${t.estimated})`}
              </span>
            ) : (
              t.fareUnavailable
            )}
          </div>
        </div>

        <div className="result-section">
          <div className="result-label">{t.orderedStops}</div>
          <div className="stop-list">
            {journey?.stops?.map((stop, i) => (
              <div key={i} className="stop-item">{localizeStop(stop)}</div>
            ))}
          </div>
        </div>

        <button className="btn-secondary" onClick={() => {
          stopSpeaking();
          setResult(null);
        }}>
          {t.backButton}
        </button>
      </div>
    );
  };

  return (
    <main className="app-container">
      {!result ? renderHome() : renderResult()}
    </main>
  );
}
