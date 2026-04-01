/**
 * Hooks para Campanhas (Vaquinhas)
 * Fornecem estado reativo e funções para interagir com a API
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Campaign,
  CampaignMember,
  Invitation,
  ListCampaignsParams,
  CreateCampaignPayload,
  UpdateCampaignPayload,
  ContributePayload,
  InvitePayload,
  PaginationMeta,
  CampaignStatus,
} from '@/types/campaigns';
import * as campaignsApi from '@/utils/campaigns';
import { ApiError } from '@/utils/api/api';

// ── Types ───────────────────────────────────────────────

interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UsePaginatedResult<T> extends UseQueryResult<T[]> {
  meta: PaginationMeta | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

// ── Error Handler ───────────────────────────────────────

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as ApiError).message;
    return Array.isArray(message) ? message[0] : message;
  }
  return 'Ocorreu um erro inesperado';
}

// ── useCampaigns ────────────────────────────────────────

export function useCampaigns(initialParams?: ListCampaignsParams) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<ListCampaignsParams>(initialParams || {});

  const fetchCampaigns = useCallback(async (fetchParams?: ListCampaignsParams) => {
    setLoading(true);
    setError(null);

    try {
      const response = await campaignsApi.listCampaigns(fetchParams || params);
      setCampaigns(response.campaigns);
      setMeta(response.meta);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [params]);

  const updateParams = useCallback((newParams: Partial<ListCampaignsParams>) => {
    const updated = { ...params, ...newParams };
    setParams(updated);
  }, [params]);

  const loadMore = useCallback(async () => {
    if (!meta || meta.page >= meta.pages) return;

    try {
      const response = await campaignsApi.listCampaigns({
        ...params,
        page: meta.page + 1,
      });
      setCampaigns(prev => [...prev, ...response.campaigns]);
      setMeta(response.meta);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [meta, params]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  return {
    campaigns,
    meta,
    loading,
    error,
    params,
    updateParams,
    refetch: () => fetchCampaigns(),
    loadMore,
    hasMore: meta ? meta.page < meta.pages : false,
  };
}

// ── useCampaign ─────────────────────────────────────────

export function useCampaign(campaignId: string | undefined) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await campaignsApi.getCampaignDetails(campaignId);
      setCampaign(data);
    } catch (err) {
      setError(getErrorMessage(err));
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  return {
    campaign,
    loading,
    error,
    refetch: fetchCampaign,
    setCampaign,
  };
}

// ── useCampaignMembers ──────────────────────────────────

export function useCampaignMembers(campaignId: string | undefined) {
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await campaignsApi.listMembers(campaignId);
      setMembers(response.members);
      setMeta(response.meta);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const promote = useCallback(async (userId: string) => {
    if (!campaignId) return;

    try {
      await campaignsApi.promoteMember(campaignId, userId);
      await fetchMembers();
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  }, [campaignId, fetchMembers]);

  const remove = useCallback(async (userId: string) => {
    if (!campaignId) return;

    try {
      await campaignsApi.removeMember(campaignId, userId);
      setMembers(prev => prev.filter(m => m.userId !== userId));
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  }, [campaignId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    meta,
    loading,
    error,
    promote,
    remove,
    refetch: fetchMembers,
  };
}

// ── useCampaignInvitations ──────────────────────────────

export function useCampaignInvitations(campaignId: string | undefined) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await campaignsApi.listInvites(campaignId);
      setInvitations(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const sendInvite = useCallback(async (payload: InvitePayload) => {
    if (!campaignId) return;

    try {
      const invitation = await campaignsApi.sendInvite(campaignId, payload);
      setInvitations(prev => [...prev, invitation]);
      return invitation;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  }, [campaignId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return {
    invitations,
    loading,
    error,
    sendInvite,
    refetch: fetchInvitations,
  };
}

// ── useCampaignActions ──────────────────────────────────

export function useCampaignActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCampaign = useCallback(async (payload: CreateCampaignPayload) => {
    setLoading(true);
    setError(null);

    try {
      const campaign = await campaignsApi.createCampaign(payload);
      return campaign;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCampaign = useCallback(async (
    campaignId: string,
    payload: UpdateCampaignPayload
  ) => {
    setLoading(true);
    setError(null);

    try {
      const campaign = await campaignsApi.updateCampaign(campaignId, payload);
      return campaign;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const closeCampaign = useCallback(async (campaignId: string) => {
    setLoading(true);
    setError(null);

    try {
      const campaign = await campaignsApi.closeCampaign(campaignId);
      return campaign;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const contribute = useCallback(async (
    campaignId: string,
    payload: ContributePayload
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await campaignsApi.contributeToCampaign(campaignId, payload);
      return result;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createCampaign,
    updateCampaign,
    closeCampaign,
    contribute,
    clearError: () => setError(null),
  };
}

// ── useMyInvitations ────────────────────────────────────

export function useMyInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptInvite = useCallback(async (inviteId: string) => {
    try {
      const updated = await campaignsApi.acceptInvite(inviteId);
      setInvitations(prev =>
        prev.map(inv => inv.id === inviteId ? updated : inv)
      );
      return updated;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  }, []);

  const rejectInvite = useCallback(async (inviteId: string) => {
    try {
      const updated = await campaignsApi.rejectInvite(inviteId);
      setInvitations(prev =>
        prev.map(inv => inv.id === inviteId ? updated : inv)
      );
      return updated;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  }, []);

  return {
    invitations,
    loading,
    error,
    acceptInvite,
    rejectInvite,
    setInvitations,
  };
}
