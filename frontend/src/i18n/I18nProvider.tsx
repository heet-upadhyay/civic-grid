import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupportedLanguage } from './types';
import { translations, SUPPORTED_LANGUAGES } from './translations';
import { I18nContext } from './I18nContext';

const STORAGE_KEY = 'civicgrid-lang';

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
  if (stored && stored in translations) {
    return stored;
  }
  return 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    if (lang in translations) {
      setLanguageState(lang);
    }
  }, []);

  const currentMeta = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) ?? SUPPORTED_LANGUAGES[0];
  }, [language]);

  const t = useMemo(() => {
    return translations[language] ?? translations.en;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languages: SUPPORTED_LANGUAGES,
      currentMeta,
      t,
    }),
    [language, setLanguage, currentMeta, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
