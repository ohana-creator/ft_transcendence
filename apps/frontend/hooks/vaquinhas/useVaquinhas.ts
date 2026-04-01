import { useState, useEffect } from 'react';
import { api } from '@/utils/api/api';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  isPrivate: boolean;
  goalAmount: string | null;
  goalVisible: boolean;
  currentAmount: string;
  deadline: string | null;
  ownerId: string;
  ownerUsername: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  members?: Array<{ username: string }>;
  imageUrl?: string;
  image?: string;
  picture?: string;
  [key: string]: any;
}

export interface VaquinhaPublica {
  id: string;
  nome: string;
  descricao: string;
  meta: number;
  arrecadado: number;
  criador: string;
  categoria: string;
  contribuidores: string[];
  imagem: string;
  diasRestantes: number;
  destaque: boolean;
  isPrivate?: boolean;
  ownerId?: string;
}

export function useVaquinhas(filtros?: any) {
  const [vaquinhas, setVaquinhas] = useState<VaquinhaPublica[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVaquinhas = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get<{ campaigns: Campaign[]; meta: any }>('/campaigns', {
          params: {
            status: 'ACTIVE',
            limit: 50,
            ...filtros,
          },
        });

        const transformed = transformCampaignToVaquinha(response.campaigns || []);
        setVaquinhas(transformed);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregament vaquinhas');
        setVaquinhas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVaquinhas();
  }, [filtros]);

  return { vaquinhas, loading, error };
}

// Novo hook para carregar vaquinhas (publicas ou privadas)
export function useAllVaquinhas(isPrivate?: boolean, filtros?: any) {
  const [vaquinhas, setVaquinhas] = useState<VaquinhaPublica[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchVaquinhas = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get<{ campaigns: Campaign[]; meta: any }>('/campaigns', {
          params: {
            status: 'ACTIVE',
            limit: 50,
            ...(isPrivate !== undefined ? { isPrivate } : {}),
            ...filtros,
          },
        });

        let transformed = transformCampaignToVaquinha(response.campaigns || [], { includePrivate: true });

        // Filtrar por privacidade se especificado
        if (isPrivate !== undefined) {
          transformed = transformed.filter(v => v.isPrivate === isPrivate);
        }

        if (cancelled) return;
        setVaquinhas(transformed);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Erro ao carregamento vaquinhas');
        setVaquinhas([]);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };

    fetchVaquinhas();

    const handleInvitationAccepted = () => {
      fetchVaquinhas();
    };

    const handleFocus = () => {
      fetchVaquinhas();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchVaquinhas();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('campaign:invitation-accepted', handleInvitationAccepted as EventListener);
      window.addEventListener('focus', handleFocus);
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('campaign:invitation-accepted', handleInvitationAccepted as EventListener);
        window.removeEventListener('focus', handleFocus);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPrivate, filtros]);

  return { vaquinhas, loading, error };
}

function decimalToNumber(decimal: any): number {
  if (typeof decimal === 'number') return decimal;
  if (typeof decimal === 'string') return parseFloat(decimal) || 0;
  if (decimal && typeof decimal === 'object') {
    // Tenta .toNumber() se existir
    if (typeof decimal.toNumber === 'function') {
      try {
        return decimal.toNumber();
      } catch {
        // fallback
      }
    }
    // Tenta toString() + parseFloat
    if (typeof decimal.toString === 'function') {
      try {
        const str = decimal.toString();
        const num = parseFloat(str);
        if (!isNaN(num)) return num;
      } catch {
        // fallback
      }
    }
    // Decimal serializado (ex.: Prisma/decimal.js): { d: number[], e: number, s: number }
    if (Array.isArray(decimal.d) && decimal.d.length > 0) {
      const digits = decimal.d
        .map((part: number, index: number) => (index === 0 ? String(part) : String(part).padStart(7, '0')))
        .join('');

      const exponent = typeof decimal.e === 'number' ? decimal.e : digits.length - 1;
      const integerDigits = exponent + 1;

      let numericAsString: string;
      if (integerDigits <= 0) {
        numericAsString = `0.${'0'.repeat(Math.abs(integerDigits))}${digits}`;
      } else if (integerDigits >= digits.length) {
        numericAsString = `${digits}${'0'.repeat(integerDigits - digits.length)}`;
      } else {
        numericAsString = `${digits.slice(0, integerDigits)}.${digits.slice(integerDigits)}`;
      }

      const signed = decimal.s === -1 ? `-${numericAsString}` : numericAsString;
      const parsed = parseFloat(signed);
      if (!isNaN(parsed) && isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function transformCampaignToVaquinha(campaigns: Campaign[], options?: { includePrivate?: boolean }): VaquinhaPublica[] {
  return campaigns
    .filter((c) => options?.includePrivate ? true : !c.isPrivate)
    .map((campaign) => {
      const deadline = campaign.deadline ? new Date(campaign.deadline) : null;
      const diasRestantes = deadline ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
      const meta = decimalToNumber(campaign.goalAmount) || 0;
      const arrecadado = decimalToNumber(campaign.currentAmount) || 0;

      // Categoria aproximada baseada no status ou título
      const categoriaMap: Record<string, string> = {
        'Educacao': 'Educacao',
        'Solidariedade': 'Solidariedade',
        'Comunidade': 'Comunidade',
        'Eventos': 'Eventos',
        'Desporto': 'Desporto',
        'Cultura': 'Cultura',
      };
      const categoria = Object.keys(categoriaMap).find((key) => campaign.title.toLowerCase().includes(key.toLowerCase())) || 'Comunidade';

      // Procura por imagem em diferentes campos possíveis
      const normalizeImagePath = (value?: string): string | undefined => {
        if (!value) return undefined;
        if (value.includes('/api/campaigns/')) {
          return value.replace('/api/campaigns/', '/uploads/campaigns/');
        }
        return value;
      };

      const imagem =
        normalizeImagePath(campaign.imageUrl) ||
        normalizeImagePath(campaign.image) ||
        normalizeImagePath(campaign.picture) ||
        `/assets/placeholder-vaquinha.jpg`;

      return {
        id: campaign.id,
        nome: campaign.title,
        descricao: campaign.description,
        meta,
        arrecadado,
        criador: campaign.ownerUsername,
        categoria,
        contribuidores: campaign.members?.map((m) => m.username) || [campaign.ownerUsername],
        imagem,
        diasRestantes,
        destaque: campaign.status === 'ACTIVE' && meta > 0 && arrecadado > meta * 0.8,
        isPrivate: campaign.isPrivate,
        ownerId: campaign.ownerId,
      };
    });
}

export function useVaquinhaDetalhe(id?: string) {
  const [vaquinha, setVaquinha] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<Campaign>(`/campaigns/${id}`);

        // Transforma Campaign em Vaquinha
        const meta = decimalToNumber(data.goalAmount) || 0;
        const arrecadado = decimalToNumber(data.currentAmount) || 0;

        const vaquinha = {
          id: data.id,
          titulo: data.title,
          descricao: data.description,
          meta,
          arrecadado,
          imagemUrl: data.imageUrl || data.image || data.picture,
          categoria: 'Comunidade',
          publica: !data.isPrivate,
          ativa: data.status === 'ACTIVE',
          criadoEm: new Date(data.createdAt),
          atualizadoEm: new Date(data.updatedAt),
          criador: {
            id: data.ownerId,
            nome: data.ownerUsername,
            email: '',
            username: data.ownerUsername,
            saldoVaks: 0,
          },
        };

        setVaquinha(vaquinha);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar vaquinha');
        setVaquinha(null);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [id]);

  return { vaquinha, loading, error, contribuicoes: [] };
}
