'use client';

import Link from 'next/link';
import {
  Search,
  X,
  Lock,
  Globe,
  PiggyBank,
  Send,
  ArrowDownToLine,
  ArrowRightLeft,
  HandCoins,
  Plus,
  Receipt,
  Wallet,
  Landmark,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/profile/useAvatar';
import { useI18n } from '@/locales';
import { api } from '@/utils/api/api';
import { useAuth } from '@/contexts/auth';

interface StaticSearchItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

interface SearchApiItem {
  id: string;
  label: string;
  type: string;
  href?: string;
}

type SearchApiPayload =
  | SearchApiItem[]
  | { results?: SearchApiItem[]; data?: SearchApiItem[] | { results?: SearchApiItem[] } };

type WrappedData<T> = T | { data?: T; success?: boolean };

interface SearchUserResult {
  id: string;
  username: string;
  nome: string;
  href: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

interface SearchCampaignResult {
  id: string;
  title: string;
  href: string;
  visibility?: 'publica' | 'privada';
  ownerUsername?: string;
}

interface CampaignListItem {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  isPrivate?: boolean;
  ownerUsername?: string;
  ownerId?: string;
}

interface CampaignListResponse {
  campaigns?: CampaignListItem[];
  data?: CampaignListItem[] | { campaigns?: CampaignListItem[] };
}

interface ApiLikeError {
  status?: number;
  message?: string;
}

interface OnlineStatusUser {
  id?: string;
  userId?: string;
  username?: string;
  userName?: string;
  lastSeen?: string;
  lastHeartbeat?: string;
}

type OnlineStatusApiResponse = {
  [key: string]: unknown;
  onlineUsers?: OnlineStatusUser[];
  data?: {
    [key: string]: unknown;
    onlineUsers?: OnlineStatusUser[];
  };
};

const ONLINE_TIMEOUT_MS = 60 * 1000;

type UsersSearchResponse = {
  users?: Array<{ id: string; username: string; name?: string; bio?: string; avatarUrl?: string; avatar?: string; photoUrl?: string; image?: string; picture?: string }>;
  items?: Array<{ id: string; username: string; name?: string; avatarUrl?: string; avatar?: string; photoUrl?: string; image?: string; picture?: string }>;
  data?: {
    users?: Array<{ id: string; username: string; name?: string; bio?: string; avatarUrl?: string; avatar?: string; photoUrl?: string; image?: string; picture?: string }>;
    items?: Array<{ id: string; username: string; name?: string; avatarUrl?: string; avatar?: string; photoUrl?: string; image?: string; picture?: string }>;
  };
};

function unwrapData<T>(payload: WrappedData<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data as T;
  }
  return payload as T;
}

function extractSearchItems(payload: SearchApiPayload): SearchApiItem[] {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && typeof payload.data === 'object' && Array.isArray(payload.data.results)) {
      return payload.data.results;
    }
  }

  return [];
}

function isUserResult(item: SearchApiItem): boolean {
  const normalizedType = (item.type || '').toLowerCase();
  return (
    normalizedType === 'user' ||
    normalizedType === 'usuario' ||
    normalizedType === 'utilizador' ||
    normalizedType === 'profile' ||
    normalizedType === 'perfil' ||
    (!!item.href && item.href.includes('/perfil/'))
  );
}

function isCampaignResult(item: SearchApiItem): boolean {
  const normalizedType = (item.type || '').toLowerCase();
  return (
    normalizedType === 'vaquinha' ||
    normalizedType === 'campaign' ||
    normalizedType === 'campanha' ||
    (!!item.href && item.href.includes('/vaquinhas/'))
  );
}

function uniqueCampaigns(campaigns: SearchCampaignResult[]): SearchCampaignResult[] {
  const seen = new Set<string>();
  const deduped: SearchCampaignResult[] = [];

  campaigns.forEach((campaign) => {
    const key = campaign.id || campaign.href;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(campaign);
  });

  return deduped;
}

function extractCampaigns(payload: CampaignListResponse): CampaignListItem[] {
  if (Array.isArray(payload.campaigns)) {
    return payload.campaigns;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload.data && typeof payload.data === 'object' && Array.isArray(payload.data.campaigns)) {
    return payload.data.campaigns;
  }

  return [];
}

function uniqueUsers(users: SearchUserResult[]): SearchUserResult[] {
  const seen = new Set<string>();
  const deduped: SearchUserResult[] = [];

  users.forEach((user) => {
    const key = user.username.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(user);
  });

  return deduped;
}

function scoreUserMatch(user: SearchUserResult, normalizedQuery: string): number {
  const username = user.username.toLowerCase();
  const nome = user.nome.toLowerCase();

  if (username === normalizedQuery) return 100;
  if (username.startsWith(normalizedQuery)) return 80;
  if (nome.startsWith(normalizedQuery)) return 65;
  if (username.includes(normalizedQuery)) return 45;
  if (nome.includes(normalizedQuery)) return 30;
  return 0;
}

function sortUsersByRelevance(users: SearchUserResult[], normalizedQuery: string): SearchUserResult[] {
  return [...users].sort((a, b) => {
    const scoreA = scoreUserMatch(a, normalizedQuery);
    const scoreB = scoreUserMatch(b, normalizedQuery);

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    return a.username.localeCompare(b.username);
  });
}

function normalizeUsername(value: string): string {
  return value.replace(/^@/, '').trim().toLowerCase();
}

function extractUsersFromSearch(response: UsersSearchResponse): Array<{ id: string; username: string; name?: string; avatarUrl?: string; avatar?: string; photoUrl?: string; image?: string; picture?: string }> {
  if (Array.isArray(response.users)) return response.users;
  if (Array.isArray(response.items)) return response.items;
  if (response.data?.users) return response.data.users;
  if (response.data?.items) return response.data.items;
  return [];
}

function resolveAvatarUrl(user: { avatarUrl?: string; avatar?: string; photoUrl?: string; image?: string; picture?: string }): string | undefined {
  return user.avatarUrl || user.avatar || user.photoUrl || user.image || user.picture;
}

function extractOnlineUsers(payload: OnlineStatusApiResponse): OnlineStatusUser[] {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.onlineUsers)) return payload.onlineUsers;
  if (payload.data && Array.isArray(payload.data.onlineUsers)) return payload.data.onlineUsers;
  return [];
}

function extractOnlineStatusMap(payload: OnlineStatusApiResponse): Record<string, boolean> {
  if (!payload || typeof payload !== 'object') return {};

  const rootMap = Object.entries(payload).reduce<Record<string, boolean>>((acc, [key, value]) => {
    if (typeof value === 'boolean') {
      acc[key] = value;
    }
    return acc;
  }, {});
  if (Object.keys(rootMap).length > 0) return rootMap;

  if (payload.data && typeof payload.data === 'object') {
    const dataMap = Object.entries(payload.data).reduce<Record<string, boolean>>((acc, [key, value]) => {
      if (typeof value === 'boolean') {
        acc[key] = value;
      }
      return acc;
    }, {});
    if (Object.keys(dataMap).length > 0) return dataMap;
  }

  return {};
}

function isPresenceOnline(lastSeen: string | undefined): boolean {
  if (!lastSeen) return true;
  const ts = new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts <= ONLINE_TIMEOUT_MS;
}

export function GlobalSearch() {
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const d = t.dashboard;
  const gs = d.global_search;
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [users, setUsers] = useState<SearchUserResult[]>([]);
  const [campaigns, setCampaigns] = useState<SearchCampaignResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const friendshipLookupCacheRef = useRef<Record<string, boolean>>({});
  const onlineStatusEndpointUnavailableRef = useRef(false);

  const campaignVisibilityLabel = (visibility: 'publica' | 'privada') =>
    visibility === 'publica' ? gs.visibility.publico : gs.visibility.privado;

  const frequentOperations: StaticSearchItem[] = [
    {
      id: 'operation-transferir',
      label: d.op_transferir,
      description: d.transferencia_rapida,
      href: '/carteira/transferir',
      icon: <Send className="h-4 w-4" />,
    },
    {
      id: 'operation-carregar',
      label: d.op_carregar,
      description: d.cartao_vaks,
      href: '/carteira/carregar',
      icon: <ArrowDownToLine className="h-4 w-4" />,
    },
    {
      id: 'operation-converter',
      label: d.op_converter,
      description: d.link_converter,
      href: '/carteira/converter',
      icon: <ArrowRightLeft className="h-4 w-4" />,
    },
    {
      id: 'operation-contribuir',
      label: d.op_contribuir,
      description: d.vaquinhas_recentes,
      href: '/vaquinhas',
      icon: <HandCoins className="h-4 w-4" />,
    },
    {
      id: 'operation-nova-vaquinha',
      label: d.op_nova_vaquinha,
      description: d.publica,
      href: '/vaquinhas/privadas/criar',
      icon: <Plus className="h-4 w-4" />,
    },
    {
      id: 'operation-historico',
      label: d.op_historico,
      description: d.saldos_movimentos,
      href: '/carteira?secao=historico',
      icon: <Receipt className="h-4 w-4" />,
    },
  ];

  const quickLinks: StaticSearchItem[] = [
    {
      id: 'link-transferencias',
      label: d.link_transferencias,
      description: d.transferencia_rapida,
      href: '/carteira/transferir',
      icon: <Send className="h-4 w-4" />,
    },
    {
      id: 'link-carregar',
      label: d.op_carregar,
      description: d.cartao_vaks,
      href: '/carteira/carregar',
      icon: <ArrowDownToLine className="h-4 w-4" />,
    },
    {
      id: 'link-carteira',
      label: d.link_carteira,
      description: d.patrimonio,
      href: '/carteira',
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      id: 'link-converter',
      label: d.link_converter,
      description: d.links_rapidos,
      href: '/carteira/converter',
      icon: <Landmark className="h-4 w-4" />,
    },
  ];

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const fetchUserOnlineStatus = async (
      limit: number,
      signal: AbortSignal,
    ): Promise<{ onlineUsers: OnlineStatusUser[]; onlineMap: Record<string, boolean> }> => {
      if (signal.aborted) return { onlineUsers: [], onlineMap: {} };
      if (onlineStatusEndpointUnavailableRef.current) return { onlineUsers: [], onlineMap: {} };
      try {
        const response = await api.get<OnlineStatusApiResponse>('/users/online-status', {
          params: { limit },
          signal,
        });
        return {
          onlineUsers: extractOnlineUsers(response),
          onlineMap: extractOnlineStatusMap(response),
        };
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return { onlineUsers: [], onlineMap: {} };
        if ((err as ApiLikeError)?.status === 404) {
          onlineStatusEndpointUnavailableRef.current = true;
        }
        return { onlineUsers: [], onlineMap: {} };
      }
    };

    // Fetch users directly from /users/search endpoint using the gateway
    const fetchUsersBySearch = async (searchTerm: string, signal: AbortSignal): Promise<SearchUserResult[]> => {
      try {
        const response = await api.get<UsersSearchResponse>('/users/search', {
          params: { q: searchTerm, page: 1, limit: 10 },
          signal,
        });
        const users = extractUsersFromSearch(response);
        const currentUsername = normalizeUsername(user?.username || '');
        const currentUserId = user?.id;

        return users.map((u) => ({
          id: u.id,
          username: u.username,
          nome: u.name || u.username,
          href: `/perfil/${encodeURIComponent(u.username)}`,
          avatarUrl: resolveAvatarUrl(u),
          isOnline:
            (!!currentUserId && u.id === currentUserId) ||
            (!!currentUsername && normalizeUsername(u.username) === currentUsername)
              ? true
              : undefined,
        }));
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return [];
        return [];
      }
    };

    const fetchCampaignsSafe = async (limit: number, search: string | null, signal: AbortSignal): Promise<CampaignListItem[]> => {
      if (signal.aborted) return [];
      try {
        const response = await api.get<CampaignListResponse>('/campaigns', {
          params: {
            limit,
            status: 'ACTIVE',
            sortBy: 'createdAt',
            search: search || undefined,
          },
          signal,
        });
        return extractCampaigns(response);
      } catch (error: unknown) {
        const apiError = error as ApiLikeError;
        if ((error as DOMException)?.name === 'AbortError') return [];
        if (apiError?.status !== 400) {
          return [];
        }

        try {
          const response = await api.get<CampaignListResponse>('/campaigns', {
            params: {
              limit: Math.min(limit, 20),
              status: 'ACTIVE',
              sortBy: 'createdAt',
              search: search || undefined,
            },
            signal,
          });
          return extractCampaigns(response);
        } catch (innerError) {
          if ((innerError as DOMException)?.name === 'AbortError') return [];
          try {
            const response = await api.get<CampaignListResponse>('/campaigns', {
              params: {
                status: 'ACTIVE',
                sortBy: 'createdAt',
                search: search || undefined,
              },
              signal,
            });
            return extractCampaigns(response);
          } catch {
            return [];
          }
        }
      }
    };

    const loadSuggestions = async (signal: AbortSignal) => {
      try {
        const normalized = query.trim();
        const normalizedLower = normalized.toLowerCase();
        const currentUsername = user?.username?.trim() || '';
        const currentUsernameLower = currentUsername.toLowerCase();

        // Se vazio, mostrar campanhas recentes
        if (!normalized) {
          const campaignList = await fetchCampaignsSafe(8, null, signal);

          if (cancelled || signal.aborted) return;

          const realCampaigns = campaignList
            .filter((campaign) => !campaign.isPrivate)
            .map((campaign) => ({
            id: campaign.id,
            title: campaign.title || campaign.name || 'Vaquinha',
            href: `/vaquinhas/${campaign.id}`,
            visibility: campaign.isPrivate ? ('privada' as const) : ('publica' as const),
            ownerUsername: campaign.ownerUsername,
          }));

          setUsers([]);
          setCampaigns(realCampaigns);
          return;
        }

        // Buscar apenas com 2+ caracteres
        if (normalized.length < 2) {
          setUsers([]);
          setCampaigns([]);
          return;
        }

        if (currentUsername && currentUsernameLower === normalizedLower) {
          setUsers([
            {
              id: user?.id || `user-${normalizedLower}`,
              username: currentUsername,
              nome: user?.name || currentUsername,
              href: '/perfil',
            },
          ]);
        }

        let realUsers: SearchUserResult[] = [];
        let realCampaigns: SearchCampaignResult[] = [];
        if (!cancelled) {
          let searchUsers: SearchUserResult[] = [];
          let searchCampaigns: SearchCampaignResult[] = [];

          // Search users via /users/search endpoint (primary method)
          try {
            const directUserSearch = await fetchUsersBySearch(normalized, signal);
            searchUsers = directUserSearch;
          } catch {
            searchUsers = [];
          }

          // Fetch campaigns (max 50 per backend limit)
          const campaignList = await fetchCampaignsSafe(50, normalized, signal);

          // Local filtering for campaigns
          const campaignSearchFallback = campaignList
            .filter((campaign) => !campaign.isPrivate)
            .filter((campaign) => {
              const title = (campaign.title || campaign.name || '').toLowerCase();
              const description = (campaign.description || '').toLowerCase();
              const owner = (campaign.ownerUsername || '').toLowerCase();
              return title.includes(normalizedLower) || description.includes(normalizedLower) || owner.includes(normalizedLower);
            })
            .map((campaign) => ({
              id: campaign.id,
              title: campaign.title || campaign.name || 'Vaquinha',
              href: `/vaquinhas/${campaign.id}`,
              visibility: campaign.isPrivate ? ('privada' as const) : ('publica' as const),
              ownerUsername: campaign.ownerUsername,
            }));

          realCampaigns = uniqueCampaigns([...searchCampaigns, ...campaignSearchFallback]);

          const ownerUsers = campaignList
            .filter((campaign) => !campaign.isPrivate)
            .filter((campaign) => (campaign.ownerUsername || '').toLowerCase().includes(normalizedLower))
            .map((campaign) => {
              const username = campaign.ownerUsername || '';
              return {
                id: `owner-${campaign.id}`,
                username,
                nome: username,
                href: `/perfil/${encodeURIComponent(username)}`,
              };
            });

          let directLookupUsers: SearchUserResult[] = [];
          if (currentUsername && currentUsernameLower === normalizedLower) {
            directLookupUsers = [
              {
                id: user?.id || `user-${normalizedLower}`,
                username: currentUsername,
                nome: user?.name || currentUsername,
                href: '/perfil',
              },
            ];
          }

          const dedupedUsers = uniqueUsers([...searchUsers, ...ownerUsers, ...directLookupUsers]);
          realUsers = sortUsersByRelevance(dedupedUsers, normalizedLower);

          // Fetch online status for all found users
          if (realUsers.length > 0) {
            const { onlineUsers, onlineMap } = await fetchUserOnlineStatus(
              Math.max(100, realUsers.length * 4),
              signal,
            );

            if (onlineUsers.length > 0) {
              const nextCache = { ...friendshipLookupCacheRef.current };
              onlineUsers.forEach((onlineUser) => {
                const resolvedId = onlineUser.id || onlineUser.userId;
                const resolvedUsername = onlineUser.username || onlineUser.userName;
                const normalizedUsername = normalizeUsername(resolvedUsername || '');
                const isOnlineNow = isPresenceOnline(onlineUser.lastSeen || onlineUser.lastHeartbeat);
                if (resolvedId) nextCache[resolvedId] = isOnlineNow;
                if (resolvedUsername) nextCache[resolvedUsername] = isOnlineNow;
                if (normalizedUsername) nextCache[normalizedUsername] = isOnlineNow;
              });
              friendshipLookupCacheRef.current = nextCache;
            }

            const currentUsername = normalizeUsername(user?.username || '');
            const currentUserId = user?.id;

            realUsers = realUsers.map((u) => {
              const lookup = normalizeUsername(u.username);
              const snapshot = onlineUsers.find((onlineUser) => {
                const resolvedId = onlineUser.id || onlineUser.userId;
                const resolvedUsername = onlineUser.username || onlineUser.userName;
                const snapshotUsername = normalizeUsername(resolvedUsername || '');
                return (
                  (!!resolvedId && resolvedId === u.id)
                  || (!!snapshotUsername && snapshotUsername === lookup)
                );
              });
              return {
                ...u,
                isOnline:
                  (snapshot ? isPresenceOnline(snapshot.lastSeen || snapshot.lastHeartbeat) : undefined)
                  ?? onlineMap[u.id]
                  ?? onlineMap[u.username]
                  ?? onlineMap[lookup]
                  ?? friendshipLookupCacheRef.current[lookup]
                  ?? friendshipLookupCacheRef.current[u.username]
                  ?? friendshipLookupCacheRef.current[u.id]
                  ?? ((!!currentUserId && u.id === currentUserId) || (!!currentUsername && lookup === currentUsername) ? true : false),
              };
            });
          }
        }

        if (cancelled || signal.aborted) return;
        setUsers(sortUsersByRelevance(uniqueUsers(realUsers), normalizedLower));
        setCampaigns(realCampaigns);
      } catch (err) {
        if (cancelled || (err as DOMException)?.name === 'AbortError') return;
        // Preserva os utilizadores já resolvidos quando possível; apenas limpa campanhas em erro global.
        setCampaigns([]);
      }
    };

    const timer = setTimeout(() => {
      loadSuggestions(controller.signal);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, user?.id, user?.name, user?.username]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOperations = frequentOperations.filter((item) => {
    if (!normalizedQuery) {
      return true;
    }

    return `${item.label} ${item.description}`.toLowerCase().includes(normalizedQuery);
  });
  const filteredQuickLinks = quickLinks.filter((item) => {
    if (!normalizedQuery) {
      return true;
    }

    return `${item.label} ${item.description}`.toLowerCase().includes(normalizedQuery);
  });
  const totalResults =
    users.length + campaigns.length + filteredOperations.length + filteredQuickLinks.length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocused(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      if (event.key === 'Escape') {
        setIsOpen(false);
        setFocused(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div
        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-all duration-200
          bg-vaks-light-input dark:bg-vaks-dark-input
          ${
            focused
              ? 'border-vaks-light-purple-button shadow-md shadow-purple-200/30 dark:border-vaks-dark-purple-button dark:shadow-purple-900/30'
              : 'border-vaks-light-stroke dark:border-vaks-dark-stroke'
          }`}
      >
        <Search className="h-4 w-4 shrink-0 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            const searchTerm = query.trim();
            if (!searchTerm) return;
            setIsOpen(false);
            setFocused(false);
            inputRef.current?.blur();
            router.push(`/pesquisar?q=${encodeURIComponent(searchTerm)}`);
          }}
          onFocus={() => {
            setFocused(true);
            setIsOpen(true);
          }}
          placeholder={gs.placeholder}
          className="flex-1 bg-transparent text-sm text-vaks-light-main-txt outline-none placeholder:text-vaks-light-alt-txt dark:text-vaks-dark-main-txt dark:placeholder:text-vaks-dark-alt-txt"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4 text-vaks-light-alt-txt transition-colors hover:text-vaks-light-main-txt dark:text-vaks-dark-alt-txt dark:hover:text-vaks-dark-main-txt" />
          </button>
        )}
        <kbd className="hidden items-center gap-0.5 rounded border border-vaks-light-stroke bg-vaks-light-primary px-1.5 py-0.5 text-xs text-vaks-light-alt-txt dark:border-vaks-dark-stroke dark:bg-vaks-dark-primary dark:text-vaks-dark-alt-txt sm:flex">
          ⌘K
        </kbd>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-vaks-light-stroke bg-vaks-light-purple-card shadow-xl dark:border-vaks-dark-stroke dark:bg-vaks-dark-purple-card">
          <div className="border-b border-vaks-light-stroke px-4 py-3 dark:border-vaks-dark-stroke flex items-center justify-between">
            <span className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              {query ? `${totalResults} ${gs.results_for} "${query}"` : gs.suggestions}
            </span>
            {query && users.length > 0 && (
              <Link
                href={`/pesquisar?q=${encodeURIComponent(query)}`}
                onClick={() => {
                  setIsOpen(false);
                }}
                className="text-xs text-vaks-light-purple-button hover:underline dark:text-vaks-dark-purple-button"
              >
                {gs.view_all_results}
              </Link>
            )}
          </div>

          {totalResults > 0 ? (
            <div className="max-h-80 overflow-y-auto py-2">
              {users.length > 0 && (
                <div>
                  <div className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-vaks-light-alt-txt/80 dark:text-vaks-dark-alt-txt/80">
                    {gs.sections.users}
                  </div>
                  <ul className="space-y-1 px-2 pb-2">
                    {users.map((searchUser) => (
                      <li key={searchUser.id}>
                        <Link
                          href={searchUser.href}
                          onClick={() => {
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
                        >
                          <div className="relative">
                            <UserAvatar username={searchUser.username} avatarUrl={searchUser.avatarUrl} size="sm" />
                            {searchUser.isOnline !== undefined && (
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-vaks-light-purple-card dark:border-vaks-dark-purple-card ${
                                  searchUser.isOnline
                                  ? 'bg-green-500'
                                    : 'bg-gray-400'
                                }`}
                                title={searchUser.isOnline ? gs.online : gs.offline}
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="block truncate text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                                @{searchUser.username}
                              </span>
                              {searchUser.isOnline !== undefined && (
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    searchUser.isOnline
                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                      : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      searchUser.isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                                    }`}
                                  />
                                  {searchUser.isOnline ? gs.online : gs.offline}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                              {searchUser.nome}
                            </p>
                          </div>
                          <span className="rounded-full bg-vaks-light-primary px-2 py-1 text-[10px] font-semibold text-vaks-light-alt-txt dark:bg-vaks-dark-primary dark:text-vaks-dark-alt-txt">
                            <User className="h-3 w-3" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {filteredOperations.length > 0 && (
                <div>
                  <div className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-vaks-light-alt-txt/80 dark:text-vaks-dark-alt-txt/80">
                    {gs.sections.operations}
                  </div>
                  <ul className="space-y-1 px-2 pb-2">
                    {filteredOperations.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() => {
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-vaks-light-primary text-vaks-light-purple-button dark:bg-vaks-dark-primary dark:text-vaks-dark-secondary">
                            {item.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                              {item.label}
                            </span>
                            <p className="truncate text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {filteredQuickLinks.length > 0 && (
                <div>
                  <div className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-vaks-light-alt-txt/80 dark:text-vaks-dark-alt-txt/80">
                    {gs.sections.quick_links}
                  </div>
                  <ul className="space-y-1 px-2 pb-2">
                    {filteredQuickLinks.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() => {
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-vaks-light-primary text-vaks-light-purple-button dark:bg-vaks-dark-primary dark:text-vaks-dark-secondary">
                            {item.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                              {item.label}
                            </span>
                            <p className="truncate text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {campaigns.length > 0 && (
                <div>
                  <div className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-vaks-light-alt-txt/80 dark:text-vaks-dark-alt-txt/80">
                    {gs.sections.campaigns}
                  </div>
                  <ul className="space-y-1 px-2">
                    {campaigns.map((campaign) => (
                      <li key={campaign.id}>
                        <Link
                          href={campaign.href}
                          onClick={() => {
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-vaks-light-primary text-vaks-light-purple-button dark:bg-vaks-dark-primary dark:text-vaks-dark-secondary">
                            <PiggyBank className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                                {campaign.title}
                              </span>
                              {campaign.visibility && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-vaks-light-primary px-2 py-0.5 text-[10px] font-semibold text-vaks-light-alt-txt dark:bg-vaks-dark-primary dark:text-vaks-dark-alt-txt">
                                  {campaign.visibility === 'publica' ? (
                                    <Globe className="h-3 w-3" />
                                  ) : (
                                    <Lock className="h-3 w-3" />
                                  )}
                                  {campaignVisibilityLabel(campaign.visibility)}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                              {campaign.ownerUsername ? `${gs.created_by} @${campaign.ownerUsername}` : gs.sections.campaigns}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{gs.empty}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
