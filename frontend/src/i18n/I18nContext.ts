import { createContext } from 'react';
import type { SupportedLanguage, LanguageMeta, TranslationDictionary } from './types';

export interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  languages: LanguageMeta[];
  currentMeta: LanguageMeta;
  t: TranslationDictionary;
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined);
