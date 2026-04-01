/**
 * Providers Wrapper
 * Componente Client que agrupa todos os providers
 * Necessário para evitar erros de hidratação
 */

'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/auth';
import { VaquinhasProvider } from '@/contexts/vaquinhas';
import { CarteiraProvider } from '@/contexts/carteira';
import { I18nProvider } from '@/locales/useI18n';
import { RealTimeNotification } from '@/components/realtime';
import { ThemeProvider } from 'next-themes';
import { ReactQueryProvider } from '@/components/providers/QueryClientProvider';
import { ConsoleSilencer } from '@/components/providers/ConsoleSilencer';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <ConsoleSilencer />
        <ReactQueryProvider>
          <AuthProvider>
            <VaquinhasProvider>
              <CarteiraProvider>
                <RealTimeNotification />
                {children}
              </CarteiraProvider>
            </VaquinhasProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
