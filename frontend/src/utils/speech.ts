// Multilingual Text-to-Speech (TTS) utility with Native Audio Streaming & Web Speech API fallback
import type { SupportedLanguage } from '../i18n/types';
import { API_BASE } from '../api/client';

const LANG_VOICE_CODES: Record<SupportedLanguage, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ml: 'ml-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
};

const LANG_KEYWORDS: Record<SupportedLanguage, string[]> = {
  en: ['english', 'en-in', 'en-gb', 'en-us'],
  hi: ['hindi', 'हिन्दी', 'hi-in', 'hi_in', 'swara', 'madhur'],
  ml: ['malayalam', 'മലയാളം', 'ml-in', 'ml_in', 'sobhit', 'midhun'],
  ta: ['tamil', 'தமிழ்', 'ta-in', 'ta_in', 'valluvar', 'pallavi'],
  te: ['telugu', 'తెలుగు', 'te-in', 'te_in', 'mohan', 'shruti'],
  kn: ['kannada', 'ಕನ್ನಡ', 'kn-in', 'kn_in', 'gagan', 'sapna'],
  mr: ['marathi', 'मराठी', 'mr-in', 'mr_in', 'aarohi', 'manohar'],
  bn: ['bengali', 'bangla', 'বাংলা', 'bn-in', 'bn_in', 'bashkar', 'tanishaa'],
};

let currentAudio: HTMLAudioElement | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  if (!cachedVoices.length) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  return cachedVoices;
}

export function findVoiceForLanguage(lang: SupportedLanguage): SpeechSynthesisVoice | undefined {
  const voices = getAvailableVoices();
  const targetCode = LANG_VOICE_CODES[lang].toLowerCase();
  const keywords = LANG_KEYWORDS[lang] || [];

  // 1. Exact match on BCP-47 language tag
  let voice = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === targetCode);
  if (voice) return voice;

  // 2. Prefix match on language code (e.g., 'hi', 'ml', 'ta')
  voice = voices.find((v) => v.lang.toLowerCase().startsWith(lang));
  if (voice) return voice;

  // 3. Name keyword search (e.g., voice named "Google हिन्दी" or "Microsoft Valluvar")
  voice = voices.find((v) => {
    const nameLower = v.name.toLowerCase();
    return keywords.some((kw) => nameLower.includes(kw));
  });
  if (voice) return voice;

  return undefined;
}

/**
 * Speaks text using the high-fidelity native audio stream (with Web Speech API fallback).
 * This ensures Malayalam, Tamil, Telugu, Kannada, Hindi, Bengali, Marathi, and English
 * work reliably on every browser and OS, even if Windows/Mac lacks the regional voice pack.
 */
export function speakText(
  text: string,
  lang: SupportedLanguage = 'en',
  onEnd?: () => void,
  onError?: () => void,
): boolean {
  if (typeof window === 'undefined') {
    onError?.();
    return false;
  }

  // Cancel any ongoing audio or speech
  stopSpeech();

  if (!text || text.trim() === '') {
    onEnd?.();
    return false;
  }

  const langCode = lang.toLowerCase().split('-')[0];

  // 1. Try Native Audio Stream endpoint
  try {
    const audioUrl = `${API_BASE}/api/tts?text=${encodeURIComponent(text.slice(0, 450))}&lang=${langCode}`;
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onended = () => {
      currentAudio = null;
      onEnd?.();
    };

    audio.onerror = () => {
      currentAudio = null;
      // Fallback to browser SpeechSynthesis
      fallbackSpeechSynthesis(text, lang, onEnd, onError);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio stream autoplay blocked or failed, using speech synthesis fallback:', err);
        fallbackSpeechSynthesis(text, lang, onEnd, onError);
      });
    }
    return true;
  } catch (err) {
    console.warn('Native audio initialization error, falling back:', err);
    return fallbackSpeechSynthesis(text, lang, onEnd, onError);
  }
}

function fallbackSpeechSynthesis(
  text: string,
  lang: SupportedLanguage,
  onEnd?: () => void,
  onError?: () => void,
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.();
    return false;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const targetVoiceCode = LANG_VOICE_CODES[lang] || 'en-IN';
  utterance.lang = targetVoiceCode;
  utterance.rate = 0.92;
  utterance.pitch = 1.0;

  const matchedVoice = findVoiceForLanguage(lang);
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = () => {
    onError?.();
  };

  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeech(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // ignore
    }
    currentAudio = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  if (currentAudio && !currentAudio.paused) return true;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}
