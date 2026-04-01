'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, Mail, User as UserIcon } from 'lucide-react';
import { api } from '@/utils/api/api';
import { useI18n } from '@/locales';

interface MemberSearchResult {
  id: string;
  username: string;
  name?: string;
  avatarUrl?: string | null;
  type: 'user' | 'email';
}

interface MemberSearchProps {
  onMemberSelected: (member: { email?: string; username?: string; id?: string }) => void;
  existingMembers?: string[]; // emails or usernames to exclude
  placeholder?: string;
}

type UsersSearchResponse = {
  users?: Array<{ id: string; username: string; name?: string; avatarUrl?: string }>;
  items?: Array<{ id: string; username: string; name?: string }>;
  data?: {
    users?: Array<{ id: string; username: string; name?: string; avatarUrl?: string }>;
    items?: Array<{ id: string; username: string; name?: string }>;
  };
};

function extractUsersFromSearch(response: UsersSearchResponse): Array<{ id: string; username: string; name?: string; avatarUrl?: string }> {
  if (Array.isArray(response.users)) return response.users;
  if (Array.isArray(response.items)) return response.items;
  if (response.data?.users) return response.data.users;
  if (response.data?.items) return response.data.items;
  return [];
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function normalizeInput(value: string): string {
  return value.replace(/^@/, '').trim().toLowerCase();
}

export function MemberSearch({ onMemberSelected, existingMembers = [], placeholder }: MemberSearchProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<MemberSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Buscar utilizadores por username
  const fetchUsersBySearch = async (searchTerm: string, signal: AbortSignal): Promise<MemberSearchResult[]> => {
    try {
      const response = await api.get<UsersSearchResponse>('/users/search', {
        params: { q: searchTerm, page: 1, limit: 10 },
        signal,
      });
      const users = extractUsersFromSearch(response);
      return users
        .map((u) => ({
          id: u.id,
          username: u.username,
          name: u.name || u.username,
          avatarUrl: u.avatarUrl,
          type: 'user' as const,
        }))
        .filter((u) => !existingMembers.includes(u.username.toLowerCase()) && !existingMembers.includes(u.id));
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return [];
      return [];
    }
  };

  // Efeito para buscar sugestões
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const loadSuggestions = async () => {
      const normalizedQuery = normalizeInput(query);

      if (!normalizedQuery || normalizedQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);

      const results: MemberSearchResult[] = [];

      // Se for um email válido, adicionar como sugestão
      if (isValidEmail(normalizedQuery) && !existingMembers.includes(normalizedQuery.toLowerCase())) {
        results.push({
          id: normalizedQuery,
          username: normalizedQuery,
          type: 'email',
        });
      }

      // Buscar utilizadores por username
      const userResults = await fetchUsersBySearch(normalizedQuery, controller.signal);

      if (cancelled || controller.signal.aborted) return;

      setSuggestions([...results, ...userResults]);
      setLoading(false);
    };

    // Delay de debounce
    const timer = setTimeout(loadSuggestions, 300);

    return () => {
      clearTimeout(timer);
      cancelled = true;
      controller.abort();
    };
  }, [query, existingMembers]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion: MemberSearchResult) => {
    if (suggestion.type === 'email') {
      onMemberSelected({ email: suggestion.username });
    } else {
      onMemberSelected({ username: suggestion.username, id: suggestion.id });
    }
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || 'Procurar por utilizador ou email...'}
          className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Dropdown de sugestões */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
          <div className="max-h-64 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.type === 'email' ? suggestion.username : suggestion.id}
                onClick={() => handleSelect(suggestion)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
              >
                <div className="shrink-0">
                  {suggestion.type === 'email' ? (
                    <Mail className="h-4 w-4 text-gray-400" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-linear-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
                      {suggestion.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {suggestion.username}
                  </p>
                  {suggestion.type === 'user' && suggestion.name && suggestion.name !== suggestion.username && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {suggestion.name}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {suggestion.type === 'email' ? 'Email' : 'User'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Estado de carregamento */}
      {isOpen && loading && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            A procurar...
          </p>
        </div>
      )}

      {/* Sem resultados */}
      {isOpen && !loading && query.length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Nenhum resultado encontrado
          </p>
        </div>
      )}
    </div>
  );
}
