import { useState, useEffect } from 'react';
import { Vaquinha, Contribuicao, Usuario } from '@/types';

/* ── Mock data ─────────────────────────────────────────────── */

const mockCriador: Usuario = {
  id: '1',
  nome: 'João Mendes',
  email: 'joao@vaks.ao',
  username: 'joao',
  avatarUrl: undefined,
  saldoVaks: 5000,
};

const mockVaquinhas: Record<string, Vaquinha> = {
  '1': {
    id: '1',
    titulo: 'Viagem em grupo para Zanzibar',
    descricao:
      'Vamos poupar juntos para uma viagem inesquecível! Sol, praia e muita diversão. Já temos alojamento confirmado e uma lista de actividades incríveis para todo o grupo.',
    meta: 5000,
    arrecadado: 3200,
    imagemUrl: '/landing.png',
    categoria: 'Viagens',
    publica: false,
    ativa: true,
    criadoEm: new Date('2024-01-15'),
    atualizadoEm: new Date('2024-03-10'),
    criador: mockCriador,
    beneficiario: undefined,
  },
};

const mockContribuicoes: Record<string, Contribuicao[]> = {
  '1': [
    {
      id: 'c1',
      vaquinhaId: '1',
      usuarioId: '2',
      usuario: { id: '2', nome: 'Maria Silva', email: 'maria@vaks.ao', username: 'maria', saldoVaks: 3000 },
      valor: 500,
      mensagem: 'Boa viagem, malta!',
      anonimo: false,
      criadoEm: new Date('2024-02-20T14:30:00'),
    },
    {
      id: 'c2',
      vaquinhaId: '1',
      usuarioId: '3',
      usuario: { id: '3', nome: 'Carlos Rocha', email: 'carlos@vaks.ao', username: 'carlos', saldoVaks: 2000 },
      valor: 200,
      mensagem: undefined,
      anonimo: true,
      criadoEm: new Date('2024-02-22T09:15:00'),
    },
    {
      id: 'c3',
      vaquinhaId: '1',
      usuarioId: '4',
      usuario: { id: '4', nome: 'Ana Costa', email: 'ana@vaks.ao', username: 'ana', saldoVaks: 1500 },
      valor: 1000,
      mensagem: 'Contem comigo! 🏖️',
      anonimo: false,
      criadoEm: new Date('2024-03-01T18:45:00'),
    },
    {
      id: 'c4',
      vaquinhaId: '1',
      usuarioId: '5',
      usuario: { id: '5', nome: 'Pedro Alves', email: 'pedro@vaks.ao', username: 'pedro', saldoVaks: 800 },
      valor: 750,
      mensagem: 'Zanzibar, lá vamos nós!',
      anonimo: false,
      criadoEm: new Date('2024-03-05T11:20:00'),
    },
    {
      id: 'c5',
      vaquinhaId: '1',
      usuarioId: '6',
      usuario: { id: '6', nome: 'Sofia Neto', email: 'sofia@vaks.ao', username: 'sofia', saldoVaks: 600 },
      valor: 750,
      mensagem: undefined,
      anonimo: false,
      criadoEm: new Date('2024-03-08T08:00:00'),
    },
  ],
};

/* ── Hook ──────────────────────────────────────────────────── */

export function useVaquinhaDetalhe(id?: string) {
  const [vaquinha, setVaquinha] = useState<Vaquinha | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contribuicoes, setContribuicoes] = useState<Contribuicao[]>([]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate API delay
    const timer = setTimeout(() => {
      const found = mockVaquinhas[id] ?? null;
      setVaquinha(found);
      setContribuicoes(found ? (mockContribuicoes[id] ?? []) : []);
      if (!found) setError('not_found');
      setLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [id]);

  return { vaquinha, loading, error, contribuicoes };
}
