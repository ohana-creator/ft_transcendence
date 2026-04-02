import { useState, useEffect } from 'react';
import { Vaquinha, Contribuicao } from '@/types';
import { getCampaignDetails, listContributions } from '@/utils/campaigns';
import { Campaign, Contribution } from '@/types/campaigns';
import { api } from '@/utils/api/api';

const unsupportedContributionsByCampaign = new Set<string>();
const IMAGE_DEBUG =
  process.env.NEXT_PUBLIC_DEBUG_CAMPAIGN_IMAGE === 'true' ||
  process.env.NODE_ENV !== 'production';

function toNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (value && typeof value === 'object') {
    const decimalLike = value as {
      s?: number;
      e?: number;
      d?: number[];
      toString?: () => string;
    };

    if (Array.isArray(decimalLike.d) && decimalLike.d.length > 0) {
      const digits = decimalLike.d
        .map((part, index) => (index === 0 ? String(part) : String(part).padStart(7, '0')))
        .join('');

      const exponent = typeof decimalLike.e === 'number' ? decimalLike.e : digits.length - 1;
      const integerDigits = exponent + 1;

      let numericAsString: string;
      if (integerDigits <= 0) {
        numericAsString = `0.${'0'.repeat(Math.abs(integerDigits))}${digits}`;
      } else if (integerDigits >= digits.length) {
        numericAsString = `${digits}${'0'.repeat(integerDigits - digits.length)}`;
      } else {
        numericAsString = `${digits.slice(0, integerDigits)}.${digits.slice(integerDigits)}`;
      }

      const signed = decimalLike.s === -1 ? `-${numericAsString}` : numericAsString;
      const parsed = Number.parseFloat(signed);
      if (Number.isFinite(parsed)) return parsed;
    }

    if (typeof decimalLike.toString === 'function') {
      const parsed = Number.parseFloat(decimalLike.toString());
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return fallback;
}

function isNotFoundError(error: unknown): boolean {
  const err = error as {
    status?: number;
    response?: { status?: number };
    message?: string;
  };

  return (
    err?.status === 404 ||
    err?.response?.status === 404 ||
    (typeof err?.message === 'string' && err.message.includes('404'))
  );
}

function isUnauthorizedError(error: unknown): boolean {
  const err = error as {
    status?: number;
    response?: { status?: number };
    message?: string;
  };

  return (
    err?.status === 401 ||
    err?.response?.status === 401 ||
    (typeof err?.message === 'string' && (err.message.includes('401') || err.message.toLowerCase().includes('unauthorized')))
  );
}

function resolveCampaignImage(campaign: Campaign): string | undefined {
  const source = campaign as Campaign & {
    imageUrl?: string | null;
    imagemUrl?: string | null;
    bannerUrl?: string | null;
    coverImageUrl?: string | null;
  };

  const apiBaseUrl = api.getBaseUrl();

  const resolveApiOrigin = (): string => {
    try {
      return new URL(apiBaseUrl).origin;
    } catch {
      if (typeof window !== 'undefined') return window.location.origin;
      return 'http://localhost:3000';
    }
  };

  const normalizeImagePath = (value?: string | null): string | undefined => {
    if (!value) return undefined;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const rewriteCampaignPath = (path: string): string => {
      if (path.startsWith('/api/campaigns/')) {
        return path.replace('/api/campaigns/', '/uploads/campaigns/');
      }
      if (path.startsWith('api/campaigns/')) {
        return path.replace('api/campaigns/', '/uploads/campaigns/');
      }
      return path;
    };

    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const parsed = new URL(trimmed);
        parsed.pathname = rewriteCampaignPath(parsed.pathname);
        return parsed.toString();
      } catch {
        return trimmed;
      }
    }

    try {
      return new URL(rewriteCampaignPath(trimmed), resolveApiOrigin()).toString();
    } catch {
      return rewriteCampaignPath(trimmed);
    }
  };

  const resolved = (
    normalizeImagePath(source.imageUrl) ||
    normalizeImagePath(source.imagemUrl) ||
    normalizeImagePath(source.bannerUrl) ||
    normalizeImagePath(source.coverImageUrl) ||
    undefined
  );

  if (IMAGE_DEBUG) {
  }

  return resolved;
}

type RawContribution = Partial<Contribution> & {
  vaquinhaId?: string;
  usuarioId?: string;
  valor?: number | string;
  mensagem?: string | null;
  anonimo?: boolean;
  criadoEm?: string;
  usuario?: {
    id?: string;
    nome?: string;
    username?: string;
  };
};

function extractContributions(raw: unknown): RawContribution[] {
  if (Array.isArray(raw)) return raw as RawContribution[];

  if (raw && typeof raw === 'object') {
    const wrapped = raw as {
      data?: unknown;
      contributions?: unknown;
      contribuicoes?: unknown;
    };

    if (Array.isArray(wrapped.data)) return wrapped.data as RawContribution[];
    if (Array.isArray(wrapped.contributions)) return wrapped.contributions as RawContribution[];
    if (Array.isArray(wrapped.contribuicoes)) return wrapped.contribuicoes as RawContribution[];
  }

  return [];
}

/* ── Hook ──────────────────────────────────────────────────── */

export function useVaquinhaDetalhe(id?: string) {
  const [vaquinha, setVaquinha] = useState<Vaquinha | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contribuicoes, setContribuicoes] = useState<Contribuicao[]>([]);

  const mapContribution = (contrib: RawContribution): Contribuicao => {
    const anonimo = Boolean(contrib.isAnonymous ?? contrib.anonimo);
    const username = contrib.username || contrib.usuario?.username || contrib.usuario?.nome || 'Utilizador';
    const mensagem = (contrib.message ?? contrib.mensagem) || undefined;
    const criadoEmRaw = contrib.createdAt || contrib.criadoEm;

    return {
      id: contrib.id || `remote-${Date.now()}`,
      vaquinhaId: contrib.campaignId || contrib.vaquinhaId || id || 'unknown',
      usuarioId: contrib.userId || contrib.usuarioId || contrib.usuario?.id || 'unknown',
      valor: toNumber(contrib.amount ?? contrib.valor, 0),
      mensagem,
      anonimo,
      criadoEm: new Date(criadoEmRaw || Date.now()),
      usuario: {
        id: contrib.userId || contrib.usuarioId || contrib.usuario?.id || 'unknown',
        nome: anonimo ? 'Anônimo' : username,
        email: '',
        username: anonimo ? 'anonymous' : username,
        avatarUrl: undefined,
        saldoVaks: 0,
      },
    };
  };

  const mergeContributions = (previous: Contribuicao[], incoming: Contribuicao[]): Contribuicao[] => {
    const remoteIds = new Set(incoming.map((item) => item.id));
    const optimisticPending = previous.filter((item) => {
      if (!item.id.startsWith('local-')) return false;
      if (remoteIds.has(item.id)) return false;

      // Se a contribuição já chegou do backend com dados equivalentes,
      // removemos a versão otimista local para evitar duplicados.
      const hasEquivalentRemote = incoming.some((remote) => {
        const sameAmount = Math.abs(remote.valor - item.valor) < 0.0001;
        const sameAnon = remote.anonimo === item.anonimo;
        const sameMessage = (remote.mensagem || '') === (item.mensagem || '');
        const closeInTime = Math.abs(new Date(remote.criadoEm).getTime() - new Date(item.criadoEm).getTime()) < 120000;
        return sameAmount && sameAnon && sameMessage && closeInTime;
      });

      return !hasEquivalentRemote;
    });

    return [...optimisticPending, ...incoming].sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
  };

  const applyCampaignToState = (campaign: Campaign) => {
    const vaquinhaMapped: Vaquinha = {
      id: campaign.id,
      titulo: campaign.title,
      descricao: campaign.description,
      meta: toNumber(campaign.goalAmount, 0),
      arrecadado: toNumber(campaign.currentAmount, 0),
      imagemUrl: resolveCampaignImage(campaign),
      categoria: 'Geral',
      publica: !campaign.isPrivate,
      ativa: campaign.status === 'ACTIVE',
      criadoEm: new Date(campaign.createdAt),
      atualizadoEm: new Date(campaign.closedAt || campaign.createdAt),
      criador: {
        id: campaign.ownerId,
        nome: campaign.ownerUsername,
        email: '',
        username: campaign.ownerUsername,
        avatarUrl: undefined,
        saldoVaks: 0,
      },
      beneficiario: undefined,
    };

    setVaquinha(vaquinhaMapped);
  };

  const fetchAllCampaignData = async (campaignId: string, shouldSetLoading: boolean) => {
    if (shouldSetLoading) {
      setLoading(true);
    }

    setError(null);

    try {
      const contributionsEndpointUnsupported = unsupportedContributionsByCampaign.has(campaignId);

      const contributionsPromise = contributionsEndpointUnsupported
        ? Promise.resolve<Contribution[]>([])
        : listContributions(campaignId).catch((contribErr) => {
            if (isNotFoundError(contribErr)) {
              unsupportedContributionsByCampaign.add(campaignId);
              return [];
            }
            throw contribErr;
          });

      const [campaignResult, contributionsResult] = await Promise.allSettled([
        getCampaignDetails(campaignId),
        contributionsPromise,
      ]);

      if (campaignResult.status === 'rejected') {
        throw campaignResult.reason;
      }

      const campaign = campaignResult.value;
      const contributionsRaw =
        contributionsResult.status === 'fulfilled' ? contributionsResult.value : [];

      if (contributionsResult.status === 'rejected') {
        // Contributions endpoint failed, will use local/optimistic data
      }

      applyCampaignToState(campaign);

      // Se o endpoint de contribuições falhar, mantemos dados locais/otimistas e não quebramos a página.
      if (!contributionsEndpointUnsupported || contributionsResult.status === 'fulfilled') {
        const normalizedContributions = extractContributions(contributionsRaw).map(mapContribution);
        setContribuicoes((prev) => mergeContributions(prev, normalizedContributions));
      }
    } catch (err) {
      // Se for erro de autenticação (401), marcamos erro específico
      // para que a página possa redirecionar para login
      if (isUnauthorizedError(err)) {
        setError('unauthorized');
        setVaquinha(null);
      } else {
        setError((err as { message?: string }).message || 'not_found');
        setVaquinha(null);
      }
    } finally {
      if (shouldSetLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    fetchAllCampaignData(id, true);
  }, [id]);

  const refetch = () => {
    if (!id) return;
    fetchAllCampaignData(id, false);
  };

  const addOptimisticContribution = (input: {
    valor: number;
    mensagem?: string;
    anonimo: boolean;
    newAmount: number;
  }) => {
    const now = new Date();
    const localContribution: Contribuicao = {
      id: `local-${now.getTime()}`,
      vaquinhaId: id || 'unknown',
      usuarioId: 'self',
      valor: toNumber(input.valor, 0),
      mensagem: input.mensagem,
      anonimo: input.anonimo,
      criadoEm: now,
      usuario: {
        id: 'self',
        nome: input.anonimo ? 'Anônimo' : 'Tu',
        email: '',
        username: input.anonimo ? 'anonymous' : 'you',
        avatarUrl: undefined,
        saldoVaks: 0,
      },
    };

    setContribuicoes((prev) => [localContribution, ...prev]);
    setVaquinha((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        arrecadado: toNumber(input.newAmount, prev.arrecadado + localContribution.valor),
      };
    });
  };

  return { vaquinha, loading, error, contribuicoes, refetch, addOptimisticContribution };
}
