import { en } from './en';
import { hi } from './hi';
import { ml } from './ml';
import { ta } from './ta';
import { te } from './te';
import { kn } from './kn';
import { mr } from './mr';
import { bn } from './bn';
import type { SupportedLanguage, LanguageMeta, TranslationDictionary } from '../types';

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  hi,
  ml,
  ta,
  te,
  kn,
  mr,
  bn,
};

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', voiceCode: 'en-IN', flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', voiceCode: 'hi-IN', flag: '🇮🇳' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', voiceCode: 'ml-IN', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', voiceCode: 'ta-IN', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', voiceCode: 'te-IN', flag: '🇮🇳' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', voiceCode: 'kn-IN', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', voiceCode: 'mr-IN', flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', voiceCode: 'bn-IN', flag: '🇮🇳' },
];
