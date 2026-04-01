'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
} from 'react';
import {
  Campaign,
  CampaignMember,
  Invitation,
  CreateCampaignPayload,
  UpdateCampaignPayload,
  ContributePayload,
  InvitePayload,
  ListCampaignsParams,
  PaginationMeta,
} from '@/types/campaigns';
import * as campaignsApi from '@/utils/campaigns';
import { ApiClient } from '@/utils/api/api';

// ── Context Types ───────────────────────────────────────

interface VaquinhasContextType {
  // State
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  members: CampaignMember[];
  invitations: Invitation[];
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;

  // Campaign actions
  fetchCampaigns: (params?: ListCampaignsParams) => Promise<void>;
  fetchCampaign: (id: string) => Promise<Campaign | null>;
  createCampaign: (payload: CreateCampaignPayload) => Promise<Campaign>;
  updateCampaign: (id: string, payload: UpdateCampaignPayload) => Promise<Campaign>;
  closeCampaign: (id: string) => Promise<void>;
  contribute: (campaignId: string, payload: ContributePayload) => Promise<void>;

  // Member actions
  fetchMembers: (campaignId: string) => Promise<void>;
  promoteMember: (campaignId: string, userId: string) => Promise<void>;
  removeMember: (campaignId: string, userId: string) => Promise<void>;

  // Invitation actions
  fetchInvitations: (campaignId: string) => Promise<void>;
  sendInvite: (campaignId: string, payload: InvitePayload) => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<void>;
  rejectInvite: (inviteId: string) => Promise<void>;

  // Utilities
  clearError: () => void;
  clearCurrentCampaign: () => void;
  isAuthenticated: boolean;
}

const VaquinhasContext = createContext<VaquinhasContextType | undefined>(undefined);

// ── Provider ────────────────────────────────────────────

export function VaquinhasProvider({ children }: { children: ReactNode }) {
  // State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    setIsAuthenticated(ApiClient.isAuthenticated());

    const handleLogout = () => {
      setIsAuthenticated(false);
      setCampaigns([]);
      setCurrentCampaign(null);
      setMembers([]);
      setInvitations([]);
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  // ── Error Handling ──────────────────────────────────────

  const handleError = useCallback((err: unknown): string => {
    const message = err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? (err as { message: string }).message
        : 'Ocorreu um erro inesperado';
    setError(message);
    return message;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // ── Campaign Actions ────────────────────────────────────

  const fetchCampaigns = useCallback(async (params?: ListCampaignsParams) => {
    setLoading(true);
    setError(null);

    try {
      const response = await campaignsApi.listCampaigns(params);
      setCampaigns(response.campaigns);
      setMeta(response.meta);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const fetchCampaign = useCallback(async (id: string): Promise<Campaign | null> => {
    setLoading(true);
    setError(null);

    try {
      const campaign = await campaignsApi.getCampaignDetails(id);
      setCurrentCampaign(campaign);
      return campaign;
    } catch (err) {
      handleError(err);
      setCurrentCampaign(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const createCampaign = useCallback(async (payload: CreateCampaignPayload): Promise<Campaign> => {
    setLoading(true);
    setError(null);

    try {
      const campaign = await campaignsApi.createCampaign(payload);
      setCampaigns(prev => [campaign, ...prev]);
      return campaign;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const updateCampaign = useCallback(async (
    id: string,
    payload: UpdateCampaignPayload
  ): Promise<Campaign> => {
    setLoading(true);
    setError(null);

    try {
      const campaign = await campaignsApi.updateCampaign(id, payload);
      setCampaigns(prev => prev.map(c => c.id === id ? campaign : c));
      if (currentCampaign?.id === id) {
        setCurrentCampaign(campaign);
      }
      return campaign;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentCampaign?.id, handleError]);

  const closeCampaign = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const campaign = await campaignsApi.closeCampaign(id);
      setCampaigns(prev => prev.map(c => c.id === id ? campaign : c));
      if (currentCampaign?.id === id) {
        setCurrentCampaign(campaign);
      }
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentCampaign?.id, handleError]);

  const contribute = useCallback(async (campaignId: string, payload: ContributePayload) => {
    setLoading(true);
    setError(null);

    try {
      const result = await campaignsApi.contributeToCampaign(campaignId, payload);

      // Update campaign's currentAmount
      setCampaigns(prev => prev.map(c =>
        c.id === campaignId
          ? { ...c, currentAmount: result.currentAmount }
          : c
      ));

      if (currentCampaign?.id === campaignId) {
        setCurrentCampaign(prev =>
          prev ? { ...prev, currentAmount: result.currentAmount } : null
        );
      }
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentCampaign?.id, handleError]);

  // ── Member Actions ──────────────────────────────────────

  const fetchMembers = useCallback(async (campaignId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await campaignsApi.listMembers(campaignId);
      setMembers(response.members);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const promoteMember = useCallback(async (campaignId: string, userId: string) => {
    setLoading(true);
    setError(null);

    try {
      await campaignsApi.promoteMember(campaignId, userId);
      setMembers(prev => prev.map(m =>
        m.userId === userId ? { ...m, role: 'SUDO' as const } : m
      ));
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const removeMember = useCallback(async (campaignId: string, userId: string) => {
    setLoading(true);
    setError(null);

    try {
      await campaignsApi.removeMember(campaignId, userId);
      setMembers(prev => prev.filter(m => m.userId !== userId));
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // ── Invitation Actions ──────────────────────────────────

  const fetchInvitations = useCallback(async (campaignId: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await campaignsApi.listInvites(campaignId);
      setInvitations(data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const sendInvite = useCallback(async (campaignId: string, payload: InvitePayload) => {
    setLoading(true);
    setError(null);

    try {
      const invitation = await campaignsApi.sendInvite(campaignId, payload);
      setInvitations(prev => [...prev, invitation]);
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const acceptInvite = useCallback(async (inviteId: string) => {
    setLoading(true);
    setError(null);

    try {
      const updated = await campaignsApi.acceptInvite(inviteId);
      setInvitations(prev => prev.map(inv =>
        inv.id === inviteId ? updated : inv
      ));
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const rejectInvite = useCallback(async (inviteId: string) => {
    setLoading(true);
    setError(null);

    try {
      const updated = await campaignsApi.rejectInvite(inviteId);
      setInvitations(prev => prev.map(inv =>
        inv.id === inviteId ? updated : inv
      ));
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // ── Utilities ───────────────────────────────────────────

  const clearCurrentCampaign = useCallback(() => {
    setCurrentCampaign(null);
    setMembers([]);
    setInvitations([]);
  }, []);

  // ── Context Value ───────────────────────────────────────

  const value: VaquinhasContextType = {
    // State
    campaigns,
    currentCampaign,
    members,
    invitations,
    meta,
    loading,
    error,
    isAuthenticated,

    // Campaign actions
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaign,
    closeCampaign,
    contribute,

    // Member actions
    fetchMembers,
    promoteMember,
    removeMember,

    // Invitation actions
    fetchInvitations,
    sendInvite,
    acceptInvite,
    rejectInvite,

    // Utilities
    clearError,
    clearCurrentCampaign,
  };

  return (
    <VaquinhasContext.Provider value={value}>
      {children}
    </VaquinhasContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────

export function useVaquinhasContext() {
  const context = useContext(VaquinhasContext);
  if (!context) {
    throw new Error('useVaquinhasContext must be used within VaquinhasProvider');
  }
  return context;
}
