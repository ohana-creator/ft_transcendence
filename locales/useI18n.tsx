/**
 * Internacionalização (i18n)
 * Hook para acessar traduções na aplicação
 */

'use client';

import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { pt, TranslationKeys } from './pt';
import { en } from './en';
import { fr } from './fr';
import { es } from './es';

type Locale = 'pt' | 'en' | 'fr' | 'es';

const LOCALE_STORAGE_KEY = 'vaks_locale';

const translations: Record<Locale, TranslationKeys> = {
  pt,
  es: es as unknown as TranslationKeys,
  en: en as unknown as TranslationKeys,
  fr: fr as unknown as TranslationKeys,
};

const isValidLocale = (value: string | null): value is Locale => {
  return value === 'pt' || value === 'en' || value === 'fr' || value === 'es';
};

const getInitialLocale = (): Locale => {
  if (typeof window === 'undefined') return 'pt';
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return isValidLocale(stored) ? stored : 'pt';
};

interface I18nContextData {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationKeys;
}

const I18nContext = createContext<I18nContextData | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('pt');
  const [mounted, setMounted] = useState(false);

  // Load saved locale on mount
  useEffect(() => {
    const savedLocale = getInitialLocale();
    setLocaleState(savedLocale);
    setMounted(true);
  }, []);

  // Save locale to localStorage when changed
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    }
  };

  // Prevent hydration mismatch by using default locale until mounted
  const currentLocale = mounted ? locale : 'pt';

  return (
    <I18nContext.Provider
      value={{
        locale: currentLocale,
        setLocale,
        t: translations[currentLocale],
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  
  if (context === undefined) {
    throw new Error('useI18n deve ser usado dentro de I18nProvider');
  }
  
  return context;
}
