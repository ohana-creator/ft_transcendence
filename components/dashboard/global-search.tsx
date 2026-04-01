'use client';

// Last updated: 2026-04-01T09:49:00Z - Fixed abortRef cache issue

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
import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/profile/useAvatar';
import { useI18n } from '@/locales';
import { useAuth } from '@/contexts/auth';
import { useDebounce, useCampaignSearch, useUserSearch } from '@/hooks/react-query';

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
  isOnline?: boolean;
  avatarUrl?: string | null;
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

type UsersSearchResponse = {
  users?: Array<{ id: string; username: string; name?: string; bio?: string; avatarUrl?: string }>;
  items?: Array<{ id: string; username: string; name?: string }>;
  data?: {
    users?: Array<{ id: string; username: string; name?: string; bio?: string; avatarUrl?: string }>;
    items?: Array<{ id: string; username: string; name?: string }>;
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

function extractUsersFromSearch(response: UsersSearchResponse): Array<{ id: string; username: string; name?: string }> {
  if (Array.isArray(response.users)) return response.users;
  if (Array.isArray(response.items)) return response.items;
  if (response.data?.users) return response.data.users;
  if (response.data?.items) return response.data.items;
  return [];
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
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search query for better UX
  const debouncedQuery = useDebounce(query, 300);

  // Use React Query hooks for caching
  const { data: userSearchData, isLoading: isLoadingUsers } = useUserSearch(debouncedQuery);
  const { data: campaignSearchData, isLoading: isLoadingCampaigns } = useCampaignSearch(debouncedQuery);

  // Transform data to component format
  const users: SearchUserResult[] = useMemo(() => {
    if (!userSearchData?.users) return [];
    return userSearchData.users.map((u: any) => ({
      id: u.id,
      username: u.username,
      nome: u.nome || u.username,
      href: `/perfil/${encodeURIComponent(u.username)}`,
      avatarUrl: u.avatar,
    }));
  }, [userSearchData]);

  const campaigns: SearchCampaignResult[] = useMemo(() => {
    if (!campaignSearchData?.campaigns) return [];
    return campaignSearchData.campaigns.map((c: any) => ({
      id: c.id,
      title: c.titulo,
      visibility: c.publica ? 'publica' as const : 'privada' as const,
      href: `/vaquinhas/${c.publica ? 'publicas' : 'privadas'}/${c.id}`,
    }));
  }, [campaignSearchData]);

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

  // Filter frequent operations based on query (React Query optimized v2)
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
                                    : 'bg-gray-400 dark:bg-gray-600'
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
                                  className={`text-[10px] font-medium ${
                                    searchUser.isOnline
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`}
                                >
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
