/**
 * Internacionalização (i18n)
 * Hook para acessar traduções na aplicação
 */

'use client';

import { useState, createContext, useContext, ReactNode } from 'react';
import { pt, TranslationKeys } from './pt';
import { en } from './en';
import { fr } from './fr';
import { es } from './es';

type Locale = 'pt' | 'en' | 'fr' | 'es';

const translations: Record<Locale, TranslationKeys> = {
  pt,
  es: es as unknown as TranslationKeys,
  en: en as unknown as TranslationKeys,
  fr: fr as unknown as TranslationKeys,
};

interface I18nContextData {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationKeys;
}

const I18nContext = createContext<I18nContextData | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('pt');

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t: translations[locale],
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
