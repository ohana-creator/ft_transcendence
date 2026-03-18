/**
 * Serviço de API para Vaquinhas Privadas
 * Funções para interagir com endpoints de campanhas
 */

import { api } from '@/utils/api';

// ──── TIPOS ────────────────────────────────────────────

interface CreateCampaignPayload {
  title: string;
  description: string;
  isPrivate: boolean;
  goalAmount: number;
  goalVisible: boolean;
  deadline: string;
}

interface UpdateCampaignPayload {
  title?: string;
  description?: string;
  goalAmount?: number;
  goalVisible?: boolean;
  deadline?: string;
}

interface ContributePayload {
  amount: number;
  message?: string;
}

interface InvitePayload {
  userId?: number;
  email?: string;
}

// ──── CAMPANHAS ────────────────────────────────────────

/**
 * Listar campanhas privadas do utilizador
 */
export const listPrivateCampaigns = async (
  page: number = 1,
  limit: number = 20
) => {
  const response = await api.get('/campaigns', {
    params: {
      page,
      limit,
      status: 'ACTIVE',
      isPrivate: true
    }
  });
  return response.data;
};

/**
 * Obter detalhes de uma campanha
 */
export const getCampaignDetails = async (campaignId: number) => {
  const response = await api.get(`/campaigns/${campaignId}`);
  return response.data;
};

/**
 * Criar nova campanha privada
 */
export const createCampaign = async (payload: CreateCampaignPayload) => {
  const response = await api.post('/campaigns', payload);
  return response.data;
};

/**
 * Atualizar configurações da campanha
 * Apenas owner pode fazer isso
 */
export const updateCampaign = async (
  campaignId: number,
  payload: UpdateCampaignPayload
) => {
  const response = await api.put(`/campaigns/${campaignId}`, payload);
  return response.data;
};

/**
 * Encerrar campanha
 * Apenas owner pode fazer isso
 */
export const closeCampaign = async (campaignId: number) => {
  const response = await api.delete(`/campaigns/${campaignId}`);
  return response.data;
};

// ──── MEMBROS ──────────────────────────────────────────

/**
 * Listar membros de uma campanha
 */
export const listMembers = async (
  campaignId: number,
  page: number = 1,
  limit: number = 20
) => {
  const response = await api.get(`/campaigns/${campaignId}/members`, {
    params: { page, limit }
  });
  return response.data;
};

/**
 * Promover membro a SUDO
 * Apenas owner pode fazer isso
 */
export const promoteMember = async (campaignId: number, userId: number) => {
  const response = await api.post(
    `/campaigns/${campaignId}/members/${userId}/promote`
  );
  return response.data;
};

/**
 * Remover membro da campanha
 * Apenas owner pode fazer isso
 */
export const removeMember = async (campaignId: number, userId: number) => {
  const response = await api.delete(
    `/campaigns/${campaignId}/members/${userId}`
  );
  return response.data;
};

// ──── CONVITES ────────────────────────────────────────

/**
 * Enviar convite para novo membro
 * Apenas owner e SUDO podem fazer isso
 */
export const sendInvite = async (
  campaignId: number,
  payload: InvitePayload
) => {
  const response = await api.post(`/campaigns/${campaignId}/invite`, payload);
  return response.data;
};

/**
 * Listar convites de uma campanha
 */
export const listInvites = async (
  campaignId: number,
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
) => {
  const response = await api.get(`/campaigns/${campaignId}/invitations`, {
    params: { status }
  });
  return response.data;
};

/**
 * Aceitar convite para campanha
 */
export const acceptInvite = async (inviteId: number) => {
  const response = await api.post(`/invitations/${inviteId}/accept`);
  return response.data;
};

/**
 * Rejeitar convite para campanha
 */
export const rejectInvite = async (inviteId: number) => {
  const response = await api.post(`/invitations/${inviteId}/reject`);
  return response.data;
};

// ──── CONTRIBUIÇÕES ────────────────────────────────────

/**
 * Contribuir para uma campanha
 * Utilizador deve ter saldo suficiente
 */
export const contributeToCampaign = async (
  campaignId: number,
  payload: ContributePayload
) => {
  const response = await api.post(
    `/campaigns/${campaignId}/contribute`,
    payload
  );
  return response.data;
};

// ──── HOOKS CUSTOMIZADOS ──────────────────────────────

/**
 * Hook para gerenciar vaquinhas privadas
 */
export const usePrivateCampaigns = () => {
  const [campaigns, setCampaigns] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchCampaigns = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPrivateCampaigns();
      setCampaigns(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return { campaigns, loading, error, refetch: fetchCampaigns };
};

/**
 * Hook para gerenciar membros de uma campanha
 */
export const useCampaignMembers = (campaignId: number) => {
  const [members, setMembers] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchMembers = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMembers(campaignId);
      setMembers(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const promote = React.useCallback(async (userId: number) => {
    try {
      await promoteMember(campaignId, userId);
      await fetchMembers(); // Recarregar lista
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao promover membro');
    }
  }, [campaignId, fetchMembers]);

  const remove = React.useCallback(async (userId: number) => {
    try {
      await removeMember(campaignId, userId);
      await fetchMembers(); // Recarregar lista
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover membro');
    }
  }, [campaignId, fetchMembers]);

  React.useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    promote,
    remove,
    refetch: fetchMembers
  };
};

/**
 * Hook para gerenciar convites de uma campanha
 */
export const useCampaignInvites = (campaignId: number) => {
  const [invites, setInvites] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchInvites = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listInvites(campaignId);
      setInvites(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar convites');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const send = React.useCallback(async (email: string) => {
    try {
      await sendInvite(campaignId, { email });
      await fetchInvites(); // Recarregar lista
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar convite');
    }
  }, [campaignId, fetchInvites]);

  React.useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  return {
    invites,
    loading,
    error,
    send,
    refetch: fetchInvites
  };
};
