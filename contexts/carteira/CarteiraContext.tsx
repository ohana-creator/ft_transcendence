'use client';

import { createContext, useContext, ReactNode } from 'react';

interface CarteiraContextType {
  saldo: number;
  historico: any[];
  carregarSaldo: () => void;
}

const CarteiraContext = createContext<CarteiraContextType | undefined>(undefined);

export function CarteiraProvider({ children }: { children: ReactNode }) {
  return (
    <CarteiraContext.Provider value={{ saldo: 0, historico: [], carregarSaldo: () => {} }}>
      {children}
    </CarteiraContext.Provider>
  );
}

export function useCarteiraContext() {
  const context = useContext(CarteiraContext);
  if (!context) {
    throw new Error('useCarteiraContext must be used within CarteiraProvider');
  }
  return context;
}
