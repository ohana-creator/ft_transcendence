/**
 * Providers Wrapper
 * Componente Client que agrupa todos os providers
 * Necessário para evitar erros de hidratação
 */

'use client';

import React, { ReactNode } from 'react';
import { VaquinhasProvider } from '@/contexts/vaquinhas';
import { CarteiraProvider } from '@/contexts/carteira';
import { I18nProvider } from '@/locales/useI18n';
import { RealTimeNotification } from '@/components/realtime';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <VaquinhasProvider>
        <CarteiraProvider>
          <RealTimeNotification />
          {children}
        </CarteiraProvider>
      </VaquinhasProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
