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
      const apiBaseUrl = api.getBaseUrl();

      const resolveApiOrigin = (): string => {
        try {
          return new URL(apiBaseUrl).origin;
        } catch {
          if (typeof window !== 'undefined') return window.location.origin;
          return 'http://localhost:3000';
        }
      };

      const normalizeImagePath = (value?: string): string | undefined => {
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

        const toLocalUploadsPath = (path: string): string | null => {
          const rewritten = rewriteCampaignPath(path);

          if (rewritten.startsWith('/uploads/')) {
            return rewritten;
          }

          if (rewritten.startsWith('uploads/')) {
            return `/${rewritten}`;
          }

          return null;
        };

        const localPath = toLocalUploadsPath(trimmed);
        if (localPath) return localPath;

        if (/^https?:\/\//i.test(trimmed)) {
          try {
            const parsed = new URL(trimmed);
            const rewrittenPath = toLocalUploadsPath(parsed.pathname);
            if (rewrittenPath) {
              return `${rewrittenPath}${parsed.search}${parsed.hash}`;
            }
            parsed.pathname = rewriteCampaignPath(parsed.pathname);
            return parsed.toString();
          } catch {
            return trimmed;
          }
        }

        try {
          const rewritten = rewriteCampaignPath(trimmed);
          const localRewritten = toLocalUploadsPath(rewritten);
          if (localRewritten) return localRewritten;
          return new URL(rewritten, resolveApiOrigin()).toString();
        } catch {
          return rewriteCampaignPath(trimmed);
        }
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

        const normalizeImagePath = (value?: string): string | undefined => {
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

          const toLocalUploadsPath = (path: string): string | null => {
            const rewritten = rewriteCampaignPath(path);

            if (rewritten.startsWith('/uploads/')) {
              return rewritten;
            }

            if (rewritten.startsWith('uploads/')) {
              return `/${rewritten}`;
            }

            return null;
          };

          const localPath = toLocalUploadsPath(trimmed);
          if (localPath) return localPath;

          if (/^https?:\/\//i.test(trimmed)) {
            try {
              const parsed = new URL(trimmed);
              const rewrittenPath = toLocalUploadsPath(parsed.pathname);
              if (rewrittenPath) {
                return `${rewrittenPath}${parsed.search}${parsed.hash}`;
              }
              parsed.pathname = rewriteCampaignPath(parsed.pathname);
              return parsed.toString();
            } catch {
              return trimmed;
            }
          }

          try {
            const rewritten = rewriteCampaignPath(trimmed);
            const localRewritten = toLocalUploadsPath(rewritten);
            if (localRewritten) return localRewritten;
            const apiOrigin = new URL(api.getBaseUrl()).origin;
            return new URL(rewritten, apiOrigin).toString();
          } catch {
            return rewriteCampaignPath(trimmed);
          }
        };

        const vaquinha = {
          id: data.id,
          titulo: data.title,
          descricao: data.description,
          meta,
          arrecadado,
          imagemUrl: normalizeImagePath(data.imageUrl || data.image || data.picture),
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

// Interface for user campaign with role
export interface UserCampaignWithRole {
  id: string;
  title: string;
  description: string;
  isPrivate: boolean;
  goalAmount: number;
  currentAmount: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | string;
  createdAt: string;
  ownerId: string;
  ownerUsername: string;
  memberCount: number;
  role: 'OWNER' | 'SUDO' | 'VAKER';
  imageUrl?: string;
}

// Hook to fetch user's campaigns (where user is owner or member) with their roles
export function useUserCampaigns(userId?: string, username?: string) {
  const [campaigns, setCampaigns] = useState<UserCampaignWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId && !username) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchUserCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all campaigns (API returns public + private where user is member)
        const response = await api.get<{ campaigns: Campaign[]; meta: any }>('/campaigns', {
          params: { limit: 100 },
        });

        const allCampaigns = response.campaigns || [];

        // Normalize identifiers for comparison
        const normalizeId = (value?: string): string => (value || '').trim().replace(/^@/, '').toLowerCase();
        const normalizedUserId = normalizeId(userId);
        const normalizedUsername = normalizeId(username);

        const isSameUser = (candidateId?: string, candidateUsername?: string): boolean => {
          const normalizedCandidateId = normalizeId(candidateId);
          const normalizedCandidateUsername = normalizeId(candidateUsername);
          
          return (
            (!!normalizedUserId && !!normalizedCandidateId && normalizedUserId === normalizedCandidateId) ||
            (!!normalizedUsername && !!normalizedCandidateUsername && normalizedUsername === normalizedCandidateUsername)
          );
        };

        // For each campaign, determine user's role
        const userCampaigns: UserCampaignWithRole[] = [];

        // Batch fetch members for all campaigns in parallel (max 10 at a time)
        const batchSize = 10;
        const membersByCampaign = new Map<string, Array<{ userId?: string; username?: string; role?: string }>>();

        for (let i = 0; i < allCampaigns.length; i += batchSize) {
          const batch = allCampaigns.slice(i, i + batchSize);
          const membersPromises = batch.map(async (campaign) => {
            // If campaign already has members array, use it
            if (Array.isArray(campaign.members) && campaign.members.length > 0) {
              return { campaignId: campaign.id, members: campaign.members };
            }
            // Otherwise fetch members
            try {
              const membersResponse = await api.get<{ members?: Array<{ userId?: string; username?: string; role?: string }> }>(
                `/campaigns/${campaign.id}/members`,
                { params: { page: 1, limit: 100 } }
              );
              const members = membersResponse.members || 
                (membersResponse as any).data?.members || 
                (Array.isArray((membersResponse as any).data) ? (membersResponse as any).data : []);
              return { campaignId: campaign.id, members };
            } catch {
              return { campaignId: campaign.id, members: [] };
            }
          });

          const results = await Promise.all(membersPromises);
          results.forEach(({ campaignId, members }) => {
            membersByCampaign.set(campaignId, members);
          });
        }

        // Now process each campaign to determine user role
        for (const campaign of allCampaigns) {
          let role: 'OWNER' | 'SUDO' | 'VAKER' | null = null;

          // Check if user is owner
          if (isSameUser(campaign.ownerId, campaign.ownerUsername)) {
            role = 'OWNER';
          } else {
            // Check in members
            const members = membersByCampaign.get(campaign.id) || campaign.members || [];
            const member = members.find((m: any) => isSameUser(m.userId, m.username));
            if (member) {
              role = (member as any).role === 'SUDO' ? 'SUDO' : 'VAKER';
            }
          }

          // If user has a role in this campaign, add it to the list
          if (role) {
            userCampaigns.push({
              id: campaign.id,
              title: campaign.title,
              description: campaign.description,
              isPrivate: campaign.isPrivate,
              goalAmount: decimalToNumber(campaign.goalAmount),
              currentAmount: decimalToNumber(campaign.currentAmount),
              status: campaign.status,
              createdAt: campaign.createdAt,
              ownerId: campaign.ownerId,
              ownerUsername: campaign.ownerUsername,
              memberCount: campaign._count?.members || membersByCampaign.get(campaign.id)?.length || campaign.members?.length || 1,
              role,
              imageUrl: campaign.imageUrl || campaign.image || campaign.picture,
            });
          }
        }

        if (cancelled) return;
        setCampaigns(userCampaigns);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Error loading user campaigns');
        setCampaigns([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUserCampaigns();

    // Re-fetch when invitation is accepted or window gets focus
    const handleRefresh = () => fetchUserCampaigns();

    if (typeof window !== 'undefined') {
      window.addEventListener('campaign:invitation-accepted', handleRefresh);
      window.addEventListener('focus', handleRefresh);
    }

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('campaign:invitation-accepted', handleRefresh);
        window.removeEventListener('focus', handleRefresh);
      }
    };
  }, [userId, username]);

  return { campaigns, loading, error };
}
