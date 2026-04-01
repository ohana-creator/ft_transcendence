import { useState, useEffect } from 'react';
import { Vaquinha, Contribuicao } from '@/types';
import { getCampaignDetails, listContributions } from '@/utils/campaigns';
import { Campaign, Contribution } from '@/types/campaigns';

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

function resolveCampaignImage(campaign: Campaign): string | undefined {
  const source = campaign as Campaign & {
    imageUrl?: string | null;
    imagemUrl?: string | null;
    bannerUrl?: string | null;
    coverImageUrl?: string | null;
  };

  const normalizeImagePath = (value?: string | null): string | undefined => {
    if (!value) return undefined;

    if (value.includes('/api/campaigns/')) {
      return value.replace('/api/campaigns/', '/uploads/campaigns/');
    }

    return value;
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

/* ── Hook ──────────────────────────────────────────────────── */

export function useVaquinhaDetalhe(id?: string) {
  const [vaquinha, setVaquinha] = useState<Vaquinha | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contribuicoes, setContribuicoes] = useState<Contribuicao[]>([]);

  const mapContribution = (contrib: Contribution): Contribuicao => ({
    id: contrib.id,
    vaquinhaId: contrib.campaignId,
    usuarioId: contrib.userId,
    valor: toNumber(contrib.amount, 0),
    mensagem: contrib.message || undefined,
    anonimo: contrib.isAnonymous,
    criadoEm: new Date(contrib.createdAt),
    usuario: {
      id: contrib.userId,
      nome: contrib.isAnonymous ? 'Anônimo' : contrib.username,
      email: '',
      username: contrib.isAnonymous ? 'anonymous' : contrib.username,
      avatarUrl: undefined,
      saldoVaks: 0,
    },
  });

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

      const [campaign, contributions] = await Promise.all([
        getCampaignDetails(campaignId),
        contributionsPromise,
      ]);

      applyCampaignToState(campaign);

      // Se o endpoint de contribuições não existe (404), mantemos contribuições locais/otimistas.
      if (!contributionsEndpointUnsupported) {
        setContribuicoes(contributions.map(mapContribution));
      }
    } catch (err) {
      setError((err as { message?: string }).message || 'not_found');
      setVaquinha(null);
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
