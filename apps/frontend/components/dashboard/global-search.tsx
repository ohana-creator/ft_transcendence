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
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { UserAvatar } from '@/components/profile/useAvatar';
import {
  DEFAULT_CURRENT_USERNAME,
  FriendshipStatus,
  searchPlatform,
  useSocialGraph,
} from '@/hooks/social/useSocialGraph';
import { useI18n } from '@/locales';

interface StaticSearchItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

export function GlobalSearch() {
  const { t } = useI18n();
  const d = t.dashboard;
  const gs = d.global_search;
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, getFriendshipStatus } = useSocialGraph(DEFAULT_CURRENT_USERNAME);

  const friendshipBadgeLabel = (status: FriendshipStatus) => {
    switch (status) {
      case 'friends':
        return gs.friendship_badges.friends;
      case 'outgoing':
        return gs.friendship_badges.outgoing;
      case 'incoming':
        return gs.friendship_badges.incoming;
      case 'blocked':
        return gs.friendship_badges.blocked;
      default:
        return gs.friendship_badges.profile;
    }
  };

  const userVisibilityLabel = (visibility: 'publico' | 'privado') =>
    visibility === 'publico' ? gs.visibility.publico : gs.visibility.privado;

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

  const { users, campaigns } = searchPlatform(state, DEFAULT_CURRENT_USERNAME, query);
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
          <div className="border-b border-vaks-light-stroke px-4 py-3 dark:border-vaks-dark-stroke">
            <span className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              {query ? `${totalResults} ${gs.results_for} "${query}"` : gs.suggestions}
            </span>
          </div>

          {totalResults > 0 ? (
            <div className="max-h-80 overflow-y-auto py-2">
              {users.length > 0 && (
                <div>
                  <div className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-vaks-light-alt-txt/80 dark:text-vaks-dark-alt-txt/80">
                    {gs.sections.users}
                  </div>
                  <ul className="space-y-1 px-2 pb-2">
                    {users.map((user) => (
                      <li key={user.id}>
                        <Link
                          href={`/perfil/${user.username}`}
                          onClick={() => {
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
                        >
                          <UserAvatar username={user.username} avatarUrl={user.avatarUrl} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                                @{user.username}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-vaks-light-primary px-2 py-0.5 text-[10px] font-semibold text-vaks-light-alt-txt dark:bg-vaks-dark-primary dark:text-vaks-dark-alt-txt">
                                {user.profileVisibility === 'publico' ? (
                                  <Globe className="h-3 w-3" />
                                ) : (
                                  <Lock className="h-3 w-3" />
                                )}
                                {userVisibilityLabel(user.profileVisibility)}
                              </span>
                            </div>
                            <p className="truncate text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                              {user.nome}
                            </p>
                          </div>
                          <span className="rounded-full bg-vaks-light-purple-button/10 px-2.5 py-1 text-[10px] font-semibold text-vaks-light-purple-button dark:bg-vaks-dark-purple-button/15 dark:text-vaks-dark-secondary">
                            {friendshipBadgeLabel(getFriendshipStatus(user.username))}
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
                              <span className="inline-flex items-center gap-1 rounded-full bg-vaks-light-primary px-2 py-0.5 text-[10px] font-semibold text-vaks-light-alt-txt dark:bg-vaks-dark-primary dark:text-vaks-dark-alt-txt">
                                {campaign.visibility === 'publica' ? (
                                  <Globe className="h-3 w-3" />
                                ) : (
                                  <Lock className="h-3 w-3" />
                                )}
                                {campaignVisibilityLabel(campaign.visibility)}
                              </span>
                            </div>
                            <p className="truncate text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                              {gs.created_by} @{campaign.ownerUsername}
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
