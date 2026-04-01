/**
 * React Query Provider Wrapper
 * Client component que fornece QueryClient para toda a árvore
 */

'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { createQueryClient } from '@/lib/queryClient';

interface QueryProviderProps {
  children: ReactNode;
}

export function ReactQueryProvider({ children }: QueryProviderProps) {
  // Criar QueryClient apenas uma vez (no estado para evitar recreation)
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
