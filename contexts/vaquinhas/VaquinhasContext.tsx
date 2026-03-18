'use client';

import { createContext, useContext, ReactNode } from 'react';

interface VaquinhasContextType {
  vaquinhas: any[];
  carregarVaquinhas: () => void;
  criarVaquinha: (dados: any) => void;
}

const VaquinhasContext = createContext<VaquinhasContextType | undefined>(undefined);

export function VaquinhasProvider({ children }: { children: ReactNode }) {
  return (
    <VaquinhasContext.Provider value={{ vaquinhas: [], carregarVaquinhas: () => {}, criarVaquinha: () => {} }}>
      {children}
    </VaquinhasContext.Provider>
  );
}

export function useVaquinhasContext() {
  const context = useContext(VaquinhasContext);
  if (!context) {
    throw new Error('useVaquinhasContext must be used within VaquinhasProvider');
  }
  return context;
}
