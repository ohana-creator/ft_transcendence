/**
 * Hook para gerenciar convites pendentes do utilizador
 * Busca todos os convites onde o utilizador é o convidado e status é PENDING
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Invitation } from '@/types/campaigns';
import { acceptInvite, rejectInvite } from '@/utils/campaigns';
import { campaignsApi } from '@/utils/api/api';
import { toast } from '@/utils/toast';

const PENDING_INVITATIONS_ENDPOINT = process.env.NEXT_PUBLIC_PENDING_INVITATIONS_ENDPOINT?.trim() || '';
const INVITE_DEBUG = process.env.NEXT_PUBLIC_DEBUG_INVITES === 'true';

type InvitationsApiResponse =
  | Invitation[]
  | { invitations: Invitation[] }
  | { data: Invitation[] }
  | { success: boolean; data: Invitation[] };

type InvitationActionMeta = {
  alreadyResponded?: boolean;
};

function normalizeInvitationsResponse(payload: InvitationsApiResponse): Invitation[] {
  if (Array.isArray(payload)) return payload;
  if ('invitations' in payload && Array.isArray(payload.invitations)) return payload.invitations;
  if ('data' in payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function hasAlreadyRespondedFlag(payload: unknown): payload is InvitationActionMeta {
  return !!payload && typeof payload === 'object' && 'alreadyResponded' in payload;
}

async function fetchPendingInvitationsFromApi(): Promise<Invitation[]> {
  if (!PENDING_INVITATIONS_ENDPOINT) {
    if (INVITE_DEBUG) {
    }
    return [];
  }

  if (INVITE_DEBUG) {
  }

  const response = await campaignsApi.get<InvitationsApiResponse>(PENDING_INVITATIONS_ENDPOINT, {
    params: { status: 'PENDING' },
  });

  const normalized = normalizeInvitationsResponse(response);

  if (INVITE_DEBUG) {
  }

  return normalized;
}

interface UsePendingInvitationsReturn {
  invitations: Invitation[];
  loading: boolean;
  error: string | null;
  count: number;
  acceptInvitation: (inviteId: string) => Promise<void>;
  rejectInvitation: (inviteId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePendingInvitations(): UsePendingInvitationsReturn {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchPendingInvitationsFromApi();
      setInvitations(data.filter(inv => inv.status === 'PENDING'));
    } catch (err: any) {
      if (INVITE_DEBUG) {
      }
      setError(err?.message || 'Erro ao carregar convites');
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptInvitation = useCallback(async (inviteId: string) => {
    try {
      const acceptedInvite = invitations.find((inv) => inv.id === inviteId);
      const result = await acceptInvite(inviteId);
      
      // Se o convite já foi respondido anteriormente, tratar como sucesso silencioso
      if (hasAlreadyRespondedFlag(result) && result.alreadyResponded) {
        // Apenas remover da lista sem mostrar erro
        setInvitations(prev => prev.filter(inv => inv.id !== inviteId));
        return;
      }
      
      toast.success('Convite aceite!', 'Agora és membro desta campanha.');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('campaign:invitation-accepted', {
            detail: {
              inviteId,
              campaignId: acceptedInvite?.campaignId,
            },
          })
        );
      }
      
      // Remover da lista local
      setInvitations(prev => prev.filter(inv => inv.id !== inviteId));
    } catch (err: any) {
      // Se o erro for "already responded", tratar silenciosamente
      if (err?.message?.toLowerCase()?.includes('already responded') || err?.message?.toLowerCase()?.includes('already')) {
        setInvitations(prev => prev.filter(inv => inv.id !== inviteId));
        return;
      }
      toast.error('Erro ao aceitar convite', err?.message || 'Tenta novamente');
      throw err;
    }
  }, [invitations]);

  const rejectInvitation = useCallback(async (inviteId: string) => {
    try {
      const result = await rejectInvite(inviteId);
      
      // Se o convite já foi respondido anteriormente, tratar como sucesso silencioso
      if (hasAlreadyRespondedFlag(result) && result.alreadyResponded) {
        setInvitations(prev => prev.filter(inv => inv.id !== inviteId));
        return;
      }
      
      toast.info('Convite rejeitado');
      
      // Remover da lista local
      setInvitations(prev => prev.filter(inv => inv.id !== inviteId));
    } catch (err: any) {
      // Se o erro for "already responded", tratar silenciosamente
      if (err?.message?.toLowerCase()?.includes('already responded') || err?.message?.toLowerCase()?.includes('already')) {
        setInvitations(prev => prev.filter(inv => inv.id !== inviteId));
        return;
      }
      toast.error('Erro ao rejeitar convite', err?.message || 'Tenta novamente');
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  useEffect(() => {
    const handleFocus = () => {
      fetchInvitations();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchInvitations();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchInvitations]);

  return {
    invitations,
    loading,
    error,
    count: invitations.length,
    acceptInvitation,
    rejectInvitation,
    refetch: fetchInvitations,
  };
}
