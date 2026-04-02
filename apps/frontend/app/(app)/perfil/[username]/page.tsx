'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Clock3, Lock, ShieldBan, UserCheck, UserPlus } from 'lucide-react';
import { ContributionGraph } from '@/components/profile/contribution-graph';
import { UserAvatar } from '@/components/profile/useAvatar';
import { useI18n } from '@/locales';
import { useAuth } from '@/contexts/auth';
import { api } from '@/utils/api/api';
import { useEffect, useState } from 'react';
import { toast } from '@/utils/toast';

type FriendshipStatus = 'friends' | 'outgoing' | 'incoming' | 'blocked' | 'can-send';

type FriendUser = {
  id: string;
  username: string;
  nome: string;
  avatarUrl?: string | null;
  avatar?: string | null;
  photoUrl?: string | null;
  image?: string | null;
  picture?: string | null;
};

type FriendRequestItem = {
  id: string;
  fromUser: FriendUser;
  toUser: FriendUser;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED';
  createdAt: string;
};

type WrappedData<T> = T | { data?: T; success?: boolean };

type FriendshipStatusResponse = WrappedData<{ status?: FriendshipStatus }>;
type FriendRequestsResponse = WrappedData<{ requests?: FriendRequestItem[] }>;
type FriendsResponse = WrappedData<{ friends?: FriendUser[] }>;
type UsersSearchResponse = WrappedData<{
  users?: Array<{ id: string; username: string; name?: string; avatarUrl?: string | null; avatar?: string | null; photoUrl?: string | null; image?: string | null; picture?: string | null }>;
  items?: Array<{ id: string; username: string; name?: string; avatarUrl?: string | null; avatar?: string | null; photoUrl?: string | null; image?: string | null; picture?: string | null }>;
}>;
type UserSettingsResponse = WrappedData<{
  privacy?: {
    profilePublic?: boolean;
    showBalance?: boolean;
    showContributions?: boolean;
    showCampaigns?: boolean;
  };
}>;

type ProfileApiData = {
  saldoVaks?: number | string;
  avatarUrl?: string | null;
  avatar?: string | null;
  photoUrl?: string | null;
  image?: string | null;
  picture?: string | null;
};

type CampaignApiItem = {
  id: string;
  ownerUsername?: string;
};

type CampaignListResponse = {
  campaigns?: CampaignApiItem[];
  data?: CampaignApiItem[] | { campaigns?: CampaignApiItem[] };
  meta?: { pages?: number };
};

type UserFriendsResponse = WrappedData<{
  friends?: FriendUser[];
  data?: FriendUser[] | { friends?: FriendUser[] };
  count?: number;
}>;

type UserContributionsResponse = WrappedData<{
  contributions?: Array<{ id: string }>;
  data?: Array<{ id: string }> | { contributions?: Array<{ id: string }> };
  total?: number;
  count?: number;
}>;

type ViewedProfileStats = {
  saldo: number | null;
  contribuicoes: number | null;
  vaquinhas: number | null;
  amigos: number | null;
};

type ViewedPrivacySettings = {
  profilePublic: boolean;
  showBalance: boolean;
  showContributions: boolean;
  showCampaigns: boolean;
};
type ApiLikeError = { status?: number; message?: string };

type OnlineStatusUser = {
  id?: string;
  userId?: string;
  username?: string;
  userName?: string;
  lastSeen?: string;
  lastHeartbeat?: string;
};

type OnlineStatusApiResponse =
  | Record<string, boolean>
  | { data?: Record<string, boolean> }
  | { onlineUsers?: OnlineStatusUser[] }
  | { data?: { onlineUsers?: OnlineStatusUser[] } };

const ONLINE_TIMEOUT_MS = 60 * 1000;

function unwrapData<T>(payload: WrappedData<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data as T;
  }
  return payload as T;
}

function extractSearchUsers(payload: UsersSearchResponse): Array<{ id: string; username: string; name?: string; avatarUrl?: string | null; avatar?: string | null; photoUrl?: string | null; image?: string | null; picture?: string | null }> {
  const data = payload as {
    data?: {
      users?: Array<{ id: string; username: string; name?: string; avatarUrl?: string | null; avatar?: string | null; photoUrl?: string | null; image?: string | null; picture?: string | null }>;
      items?: Array<{ id: string; username: string; name?: string; avatarUrl?: string | null; avatar?: string | null; photoUrl?: string | null; image?: string | null; picture?: string | null }>;
    };
    users?: Array<{ id: string; username: string; name?: string; avatarUrl?: string | null; avatar?: string | null; photoUrl?: string | null; image?: string | null; picture?: string | null }>;
    items?: Array<{ id: string; username: string; name?: string; avatarUrl?: string | null; avatar?: string | null; photoUrl?: string | null; image?: string | null; picture?: string | null }>;
  };

  if (Array.isArray(data.data?.users)) return data.data.users;
  if (Array.isArray(data.data?.items)) return data.data.items;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function resolveAvatarUrl(user: {
  avatarUrl?: string | null;
  avatar?: string | null;
  photoUrl?: string | null;
  image?: string | null;
  picture?: string | null;
} | null | undefined): string | null {
  if (!user) return null;
  return user.avatarUrl || user.avatar || user.photoUrl || user.image || user.picture || null;
}

function toNumber(value: number | string | undefined | null): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function extractCampaigns(payload: CampaignListResponse): CampaignApiItem[] {
  if (Array.isArray(payload.campaigns)) return payload.campaigns;
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && typeof payload.data === 'object' && Array.isArray(payload.data.campaigns)) {
    return payload.data.campaigns;
  }
  return [];
}

function extractUserFriends(payload: UserFriendsResponse): FriendUser[] {
  const data = unwrapData(payload);
  if (Array.isArray(data.friends)) return data.friends;
  if (Array.isArray(data.data)) return data.data;
  if (data.data && typeof data.data === 'object' && 'friends' in data.data && Array.isArray(data.data.friends)) {
    return data.data.friends;
  }
  return [];
}

function extractContributionsCount(payload: UserContributionsResponse): number | null {
  const data = unwrapData(payload);
  if (typeof data.count === 'number') return data.count;
  if (typeof data.total === 'number') return data.total;
  if (Array.isArray(data.contributions)) return data.contributions.length;
  if (Array.isArray(data.data)) return data.data.length;
  return null;
}

function normalizeIdentity(value: string | undefined): string {
  return (value || '').trim().replace(/^@/, '').toLowerCase();
}

function extractOnlineUsers(payload: OnlineStatusApiResponse): OnlineStatusUser[] {
  if (!payload || typeof payload !== 'object') return [];
  if ('onlineUsers' in payload && Array.isArray(payload.onlineUsers)) return payload.onlineUsers;
  if ('data' in payload && payload.data && typeof payload.data === 'object' && Array.isArray(payload.data.onlineUsers)) {
    return payload.data.onlineUsers;
  }
  return [];
}

function extractOnlineStatusMap(payload: OnlineStatusApiResponse): Record<string, boolean> {
  if (!payload || typeof payload !== 'object') return {};

  const direct = payload as Record<string, unknown>;
  const rootBooleans = Object.entries(direct).reduce<Record<string, boolean>>((acc, [key, value]) => {
    if (typeof value === 'boolean') {
      acc[key] = value;
    }
    return acc;
  }, {});
  if (Object.keys(rootBooleans).length > 0) return rootBooleans;

  if ('data' in payload && payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    const fromData = Object.entries(payload.data as Record<string, unknown>).reduce<Record<string, boolean>>((acc, [key, value]) => {
      if (typeof value === 'boolean') {
        acc[key] = value;
      }
      return acc;
    }, {});
    if (Object.keys(fromData).length > 0) return fromData;
  }

  return {};
}

function isPresenceOnline(lastSeen: string | undefined): boolean {
  if (!lastSeen) return true;
  const ts = new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts <= ONLINE_TIMEOUT_MS;
}

function resolveOnlineFromList(onlineUsers: OnlineStatusUser[], id: string, username: string): boolean | null {
  const normalizedId = normalizeIdentity(id);
  const normalizedUsername = normalizeIdentity(username);

  const match = onlineUsers.find((item) => {
    const itemId = normalizeIdentity(item.id || item.userId);
    const itemUsername = normalizeIdentity(item.username || item.userName);
    return (
      (!!normalizedId && !!itemId && normalizedId === itemId)
      || (!!normalizedUsername && !!itemUsername && normalizedUsername === itemUsername)
    );
  });

  if (!match) return false;
  return isPresenceOnline(match.lastSeen || match.lastHeartbeat);
}

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const rawUsername = Array.isArray(params.username) ? params.username[0] : params.username;
  const username = decodeURIComponent(rawUsername);
  const { t } = useI18n();
  const { user } = useAuth();
  const profile = t.perfil;
  const gs = t.dashboard.global_search;
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('can-send');
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [viewedUser, setViewedUser] = useState<FriendUser | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [isViewedUserOnline, setIsViewedUserOnline] = useState<boolean | null>(null);
  const [viewedPrivacy, setViewedPrivacy] = useState<ViewedPrivacySettings>({
    profilePublic: true,
    showBalance: false,
    showContributions: true,
    showCampaigns: true,
  });
  const [viewedStats, setViewedStats] = useState<ViewedProfileStats>({
    saldo: null,
    contribuicoes: null,
    vaquinhas: null,
    amigos: null,
  });

  const isOwnProfile = user?.username?.toLowerCase() === username.toLowerCase();
  const canViewFullProfile = isOwnProfile || friendshipStatus === 'friends' || isProfilePublic;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (isOwnProfile) {
        setNotFound(false);
        setIsProfilePublic(true);
        setIsViewedUserOnline(true);
        setViewedUser({
          id: user?.id || username,
          username,
          nome: user?.name || user?.username || username,
          avatarUrl: user?.avatarUrl || null,
        });
        setViewedPrivacy({
          profilePublic: true,
          showBalance: true,
          showContributions: true,
          showCampaigns: true,
        });
        setViewedStats((prev) => ({ ...prev, amigos: null }));
        return;
      }

      try {
        const [statusResponse, incomingResponse, friendsResponse] = await Promise.all([
          api.get<FriendshipStatusResponse>(`/friendship-status/${encodeURIComponent(username)}`),
          api.get<FriendRequestsResponse>('/friend-requests', {
            params: { direction: 'incoming', status: 'PENDING' },
          }),
          api.get<FriendsResponse>('/friends').catch(() => ({ data: { friends: [] } } as FriendsResponse)),
        ]);

        const searchResponse = await api.get<UsersSearchResponse>('/users/search', {
          params: { q: username, page: 1, limit: 10 },
        });

        if (cancelled) return;

        const statusData = unwrapData(statusResponse);
        const incomingData = unwrapData(incomingResponse);
        const friendsData = unwrapData(friendsResponse);
        const searchUsers = extractSearchUsers(searchResponse);
        const exactUser = searchUsers.find((item) => item.username.toLowerCase() === username.toLowerCase());

        if (!exactUser) {
          setNotFound(true);
          setViewedUser(null);
          setIncomingRequestId(null);
          setFriendshipStatus('can-send');
          setIsProfilePublic(true);
          setIsViewedUserOnline(null);
          return;
        }

        let onlineStatus: boolean | null = null;
        try {
          const onlineStatusResponse = await api.get<OnlineStatusApiResponse>('/users/online-status', {
            params: { limit: 500 },
          });
          const onlineMap = extractOnlineStatusMap(onlineStatusResponse);
          const normalizedId = normalizeIdentity(exactUser.id);
          const normalizedUsername = normalizeIdentity(exactUser.username);
          const legacyValue =
            onlineMap[exactUser.id]
            ?? onlineMap[exactUser.username]
            ?? (normalizedId ? onlineMap[normalizedId] : undefined)
            ?? (normalizedUsername ? onlineMap[normalizedUsername] : undefined);

          if (typeof legacyValue === 'boolean') {
            onlineStatus = legacyValue;
          } else {
            const onlineUsers = extractOnlineUsers(onlineStatusResponse);
            onlineStatus = resolveOnlineFromList(onlineUsers, exactUser.id, exactUser.username);
          }
        } catch {
          onlineStatus = null;
        }

        let settingsData: ReturnType<typeof unwrapData<UserSettingsResponse>> | null = null;
        try {
          const settingsResponse = await api.get<UserSettingsResponse>(`/users/${exactUser.id}/settings`);
          settingsData = unwrapData(settingsResponse);
        } catch (settingsError: unknown) {
          const settingsApiError = settingsError as ApiLikeError;
          if (settingsApiError?.status !== 404) {
            throw settingsError;
          }
        }

        let profileData: ProfileApiData | null = null;
        try {
          const profileResponse = await api.get<WrappedData<ProfileApiData>>(`/users/${exactUser.id}`);
          profileData = unwrapData(profileResponse);
        } catch {
          profileData = null;
        }

        let campaignsCount: number | null = null;
        try {
          let totalPages = 1;
          let currentPage = 1;
          const allCampaigns: CampaignApiItem[] = [];

          do {
            const campaignsResponse = await api.get<CampaignListResponse>('/campaigns', {
              params: { page: currentPage, limit: 50 },
            });
            const pageCampaigns = extractCampaigns(campaignsResponse);
            allCampaigns.push(...pageCampaigns);

            const pages = campaignsResponse?.meta?.pages;
            if (typeof pages === 'number' && pages > 0) {
              totalPages = pages;
            } else if (pageCampaigns.length < 50) {
              totalPages = currentPage;
            } else {
              totalPages = currentPage + 1;
            }

            currentPage += 1;
          } while (currentPage <= totalPages);

          const normalizedUsername = normalizeIdentity(exactUser.username);
          campaignsCount = allCampaigns.filter(
            (campaign) => normalizeIdentity(campaign.ownerUsername) === normalizedUsername,
          ).length;
        } catch {
          campaignsCount = null;
        }

        // Buscar amigos do utilizador visualizado
        let friendsCount: number | null = null;
        try {
          const friendsResponse = await api.get<UserFriendsResponse>(`/users/${exactUser.id}/friends`);
          const friends = extractUserFriends(friendsResponse);
          friendsCount = friends.length;
        } catch {
          // Se o endpoint não existir, tentar alternativa
          try {
            const altResponse = await api.get<UserFriendsResponse>(`/friends`, {
              params: { userId: exactUser.id },
            });
            const friends = extractUserFriends(altResponse);
            friendsCount = friends.length;
          } catch {
            friendsCount = null;
          }
        }

        // Buscar contribuições do utilizador visualizado
        let contributionsCount: number | null = null;
        try {
          const contribResponse = await api.get<UserContributionsResponse>(`/users/${exactUser.id}/contributions`);
          contributionsCount = extractContributionsCount(contribResponse);
        } catch {
          // Se não existir endpoint específico, tentar contar de campanhas
          try {
            const contribAltResponse = await api.get<UserContributionsResponse>('/contributions', {
              params: { userId: exactUser.id },
            });
            contributionsCount = extractContributionsCount(contribAltResponse);
          } catch {
            contributionsCount = null;
          }
        }

        const resolvedStatus = statusData.status || 'can-send';
        const incoming = (incomingData.requests || []).find(
          (request) => request.fromUser.username.toLowerCase() === username.toLowerCase(),
        );
        const friend = (friendsData.friends || []).find(
          (item) => item.username.toLowerCase() === username.toLowerCase(),
        );

        setNotFound(false);
        setFriendshipStatus(resolvedStatus);
        setIncomingRequestId(incoming?.id || null);
        const resolvedPrivacy: ViewedPrivacySettings = {
          profilePublic: settingsData?.privacy?.profilePublic ?? true,
          showBalance: settingsData?.privacy?.showBalance ?? false,
          showContributions: settingsData?.privacy?.showContributions ?? true,
          showCampaigns: settingsData?.privacy?.showCampaigns ?? true,
        };
        setIsProfilePublic(resolvedPrivacy.profilePublic);
        setViewedPrivacy(resolvedPrivacy);
        setIsViewedUserOnline(onlineStatus);
        const resolvedAvatar = resolveAvatarUrl(exactUser) || resolveAvatarUrl(profileData);

        setViewedStats({
          saldo: profileData?.saldoVaks !== undefined ? toNumber(profileData.saldoVaks) : null,
          contribuicoes: contributionsCount,
          vaquinhas: campaignsCount,
          amigos: friendsCount,
        });
        if (friend) {
          setViewedUser({
            ...friend,
            avatarUrl: resolveAvatarUrl(friend) || resolvedAvatar,
          });
        } else {
          setViewedUser({
            id: exactUser.id,
            username: exactUser.username,
            nome: exactUser.name || exactUser.username,
            avatarUrl: resolvedAvatar,
          });
        }
      } catch (error: unknown) {
        if (cancelled) return;
        const apiError = error as ApiLikeError;

        if (apiError?.status === 404) {
          setNotFound(true);
          setViewedUser(null);
          setIncomingRequestId(null);
          setFriendshipStatus('can-send');
          setIsViewedUserOnline(null);
          setViewedStats({ saldo: null, contribuicoes: null, vaquinhas: null, amigos: null });
          return;
        }

        setNotFound(false);
        setFriendshipStatus('can-send');
        setIncomingRequestId(null);
        setViewedUser(null);
        setIsProfilePublic(true);
        setIsViewedUserOnline(null);
        setViewedStats({ saldo: null, contribuicoes: null, vaquinhas: null, amigos: null });
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isOwnProfile, user?.avatarUrl, user?.id, user?.name, username]);

  const statValue = (visible: boolean, value: number | null) => {
    if (!visible) return '•••';
    if (typeof value !== 'number') return '-';
    return value.toLocaleString('pt-AO');
  };

  if (!viewedUser || notFound) {
    return (
      <div className="min-h-screen bg-vaks-light-primary px-6 py-10 dark:bg-vaks-dark-primary">
        <div className="mx-auto max-w-3xl rounded-3xl border border-vaks-light-stroke/40 bg-vaks-light-purple-card p-10 text-center shadow-card-light dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card dark:shadow-card-dark">
          <p className="text-lg font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
            {profile.perfil_visitado.nao_encontrado}
          </p>
          <Link
            href="/perfil"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-vaks-light-purple-button px-4 py-2 text-sm font-semibold text-white dark:bg-vaks-dark-purple-button"
          >
            <ArrowLeft className="h-4 w-4" />
            {profile.perfil_visitado.voltar}
          </Link>
        </div>
      </div>
    );
  }

  const actionButton = () => {
    if (isOwnProfile) {
      return (
        <Link
          href="/perfil"
          className="inline-flex items-center gap-2 rounded-xl bg-vaks-light-purple-button px-4 py-2 text-sm font-semibold text-white dark:bg-vaks-dark-purple-button"
        >
          <UserCheck className="h-4 w-4" />
          {profile.perfil_visitado.ver_meu_perfil}
        </Link>
      );
    }

    if (friendshipStatus === 'friends') {
      return (
        <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <UserCheck className="h-4 w-4" />
          {profile.perfil_visitado.ja_amigos}
        </span>
      );
    }

    if (friendshipStatus === 'outgoing') {
      return (
        <span className="inline-flex items-center gap-2 rounded-xl bg-vaks-light-input px-4 py-2 text-sm font-semibold text-vaks-light-alt-txt dark:bg-vaks-dark-input dark:text-vaks-dark-alt-txt">
          <Clock3 className="h-4 w-4" />
          {profile.perfil_visitado.pedido_enviado}
        </span>
      );
    }

    if (friendshipStatus === 'incoming' && incomingRequestId) {
      return (
        <button
          onClick={async () => {
            try {
              await api.patch(`/friend-requests/${incomingRequestId}/accept`);
              setFriendshipStatus('friends');
              setIncomingRequestId(null);
              toast.success('Pedido aceite com sucesso.');
            } catch {
              toast.error('Erro', 'Nao foi possivel aceitar o pedido agora.');
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
        >
          <Check className="h-4 w-4" />
          {profile.perfil_visitado.aceitar_pedido}
        </button>
      );
    }

    if (friendshipStatus === 'blocked') {
      return (
        <span className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <ShieldBan className="h-4 w-4" />
          {profile.perfil_visitado.bloqueado}
        </span>
      );
    }

    return (
      <button
        onClick={async () => {
          try {
            await api.post('/friend-requests', { targetUsername: viewedUser.username });
            setFriendshipStatus('outgoing');
            toast.success('Pedido de amizade enviado.');
          } catch {
            toast.error('Erro', 'Nao foi possivel enviar o pedido de amizade.');
          }
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-vaks-light-purple-button px-4 py-2 text-sm font-semibold text-white dark:bg-vaks-dark-purple-button"
      >
        <UserPlus className="h-4 w-4" />
        {profile.perfil_visitado.adicionar_amigo}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-vaks-light-primary px-6 py-8 dark:bg-vaks-dark-primary">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/perfil"
          className="inline-flex items-center gap-2 text-sm font-medium text-vaks-light-alt-txt transition-colors hover:text-vaks-light-main-txt dark:text-vaks-dark-alt-txt dark:hover:text-vaks-dark-main-txt"
        >
          <ArrowLeft className="h-4 w-4" />
          {profile.perfil_visitado.voltar}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-4xl border border-vaks-light-stroke/40 bg-vaks-light-purple-card shadow-card-light dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card dark:shadow-card-dark"
        >
          <div className="h-36 bg-[linear-gradient(135deg,#0F766E_0%,#14B8A6_48%,#A7F3D0_100%)]" />
          <div className="px-8 pb-8">
            <div className="-mt-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col items-start gap-4">
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-vaks-light-purple-card bg-vaks-light-input shadow-lg dark:border-vaks-dark-purple-card dark:bg-vaks-dark-input">
                  <UserAvatar username={viewedUser.username} avatarUrl={viewedUser.avatarUrl} size="fill" />
                </div>

                {canViewFullProfile ? (
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                        @{viewedUser.username}
                      </h1>
                      {isViewedUserOnline !== null && (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isViewedUserOnline
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isViewedUserOnline ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          {isViewedUserOnline ? gs.online : gs.offline}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                      {viewedUser.nome}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-vaks-light-input px-3 py-1 text-xs font-semibold text-vaks-light-alt-txt dark:bg-vaks-dark-input dark:text-vaks-dark-alt-txt">
                      <Lock className="h-3.5 w-3.5" />
                      {profile.perfil_visitado.perfil_privado}
                    </span>
                    <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                      {profile.perfil_visitado.perfil_privado_label}
                    </p>
                  </div>
                )}
              </div>

              <div>{actionButton()}</div>
            </div>

            {canViewFullProfile && (
              <div className="mt-6 flex items-stretch divide-x divide-vaks-light-stroke/50 dark:divide-vaks-dark-stroke/40 border border-vaks-light-stroke/50 dark:border-vaks-dark-stroke/30 rounded-2xl overflow-hidden bg-vaks-light-input/60 dark:bg-vaks-dark-input/60 backdrop-blur-sm">
                <div className="flex flex-1 flex-col items-center justify-center px-5 py-3 gap-0.5">
                  <span className="text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt leading-none">
                    {viewedPrivacy.showBalance ? `${statValue(true, viewedStats.saldo)} Kz` : statValue(false, null)}
                  </span>
                  <span className="text-[10px] font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5">
                    {profile.saldo}
                  </span>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center px-5 py-3 gap-0.5">
                  <span className="text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt leading-none">
                    {statValue(viewedPrivacy.showCampaigns, viewedStats.vaquinhas)}
                  </span>
                  <span className="text-[10px] font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5">
                    {profile.vaquinhas}
                  </span>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center px-5 py-3 gap-0.5">
                  <span className="text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt leading-none">
                    {statValue(viewedPrivacy.showContributions, viewedStats.contribuicoes)}
                  </span>
                  <span className="text-[10px] font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5">
                    {profile.contribuicoes}
                  </span>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center px-5 py-3 gap-0.5">
                  <span className="text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt leading-none">
                    {statValue(viewedPrivacy.profilePublic || friendshipStatus === 'friends', viewedStats.amigos)}
                  </span>
                  <span className="text-[10px] font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5">
                    {profile.amigos}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}