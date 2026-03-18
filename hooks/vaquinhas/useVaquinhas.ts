import { useState } from 'react';

export function useVaquinhas(filtros?: any) {
  const [vaquinhas, setVaquinhas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return { vaquinhas, loading, error };
}

export function useVaquinhaDetalhe(id?: string) {
  const [vaquinha, setVaquinha] = useState(null);
  const [loading, setLoading] = useState(false);

  return { vaquinha, loading };
}
