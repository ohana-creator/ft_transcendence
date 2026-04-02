/**
 * Página: Pesquisar Utilizadores
 * Página de resultados de pesquisa com filtros, ordenação e paginação
 */

"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  UserPlus,
  X,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { useI18n } from "@/locales";
import { api } from "@/utils/api/api";
import { UserAvatar } from "@/components/profile/useAvatar";
import { PAGINATION_DEFAULTS } from "@/utils/config/pagination";
import { useAuth } from "@/contexts/auth";

interface SearchUser {
  id: string;
  username: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  isOnline: boolean;
  isFriend?: boolean;
  createdAt?: string;
}

interface SearchUsersResponse {
  users?: Array<{
    id: string;
    username: string;
    name?: string;
    bio?: string;
    avatarUrl?: string;
    avatar?: string;
    photoUrl?: string;
    image?: string;
    picture?: string;
  }>;
  items?: Array<{
    id: string;
    username: string;
    name?: string;
    bio?: string;
    avatarUrl?: string;
    avatar?: string;
    photoUrl?: string;
    image?: string;
    picture?: string;
  }>;
  data?: {
    users?: Array<{
      id: string;
      username: string;
      name?: string;
      bio?: string;
      avatarUrl?: string;
      avatar?: string;
      photoUrl?: string;
      image?: string;
      picture?: string;
    }>;
    items?: Array<{
      id: string;
      username: string;
      name?: string;
      bio?: string;
      avatarUrl?: string;
      avatar?: string;
      photoUrl?: string;
      image?: string;
      picture?: string;
    }>;
  };
  meta?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
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

type SortField = "username" | "name" | "recent";
type SortOrder = "asc" | "desc";
type FilterType = "all" | "online" | "friends";
type ApiLikeError = { status?: number; message?: string };

const normalizeUsername = (value: string) => value.replace(/^@/, "").trim().toLowerCase();

const extractUsersFromSearch = (response: SearchUsersResponse) => {
  if (Array.isArray(response.users)) return response.users;
  if (Array.isArray(response.items)) return response.items;
  if (response.data?.users) return response.data.users;
  if (response.data?.items) return response.data.items;
  return [];
};

const resolveAvatarUrl = (user: {
  avatarUrl?: string;
  avatar?: string;
  photoUrl?: string;
  image?: string;
  picture?: string;
}) => user.avatarUrl || user.avatar || user.photoUrl || user.image || user.picture;

const extractOnlineUsers = (payload: OnlineStatusApiResponse): OnlineStatusUser[] => {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.onlineUsers)) return payload.onlineUsers;
  if (payload.data && Array.isArray(payload.data.onlineUsers)) return payload.data.onlineUsers;
  return [];
};

const extractOnlineStatusMap = (payload: OnlineStatusApiResponse): Record<string, boolean> => {
  if (!payload || typeof payload !== "object") return {};

  const rootMap = Object.entries(payload).reduce<Record<string, boolean>>((acc, [key, value]) => {
    if (typeof value === "boolean") {
      acc[key] = value;
    }
    return acc;
  }, {});
  if (Object.keys(rootMap).length > 0) return rootMap;

  if (payload.data && typeof payload.data === "object") {
    const dataMap = Object.entries(payload.data).reduce<Record<string, boolean>>((acc, [key, value]) => {
      if (typeof value === "boolean") {
        acc[key] = value;
      }
      return acc;
    }, {});
    if (Object.keys(dataMap).length > 0) return dataMap;
  }

  return {};
};

const isPresenceOnline = (lastSeen: string | undefined): boolean => {
  if (!lastSeen) return true;
  const ts = new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts <= ONLINE_TIMEOUT_MS;
};

export default function PesquisarPage() {
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sr = t.dashboard.search_results;
  const gs = t.dashboard.global_search;

  // URL query params
  const initialQuery = searchParams.get("q") || "";

  // State
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [perPage, setPerPage] = useState<number>(PAGINATION_DEFAULTS.FRIENDS);

  // Filters & Sorting
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortField, setSortField] = useState<SortField>("username");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const onlineStatusEndpointUnavailableRef = useRef(false);
  const onlineStatusCacheRef = useRef<Record<string, boolean>>({});

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update URL when search changes
  useEffect(() => {
    if (debouncedQuery) {
      router.replace(`/pesquisar?q=${encodeURIComponent(debouncedQuery)}`, {
        scroll: false,
      });
    } else {
      router.replace("/pesquisar", { scroll: false });
    }
  }, [debouncedQuery, router]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number | boolean> = {
        page: currentPage,
        limit: perPage,
      };

      if (debouncedQuery) {
        params.q = debouncedQuery;
      }

      if (filterType === "online") {
        params.online = true;
      } else if (filterType === "friends") {
        params.friends = true;
      }

      params.sortBy = sortField;
      params.sortOrder = sortOrder.toUpperCase();

      const response = await api.get<SearchUsersResponse>("/users/search", {
        params,
      });

      const rawUsers = extractUsersFromSearch(response);
      const currentUsername = normalizeUsername(currentUser?.username || "");
      const currentUserId = currentUser?.id;
      const userData: SearchUser[] = rawUsers.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        bio: u.bio,
        avatarUrl: resolveAvatarUrl(u),
        isOnline:
          (!!currentUserId && u.id === currentUserId) ||
          (!!currentUsername && normalizeUsername(u.username) === currentUsername),
      }));
      const meta = response.meta;

      // Fetch online status for users
      if (userData.length > 0 && !onlineStatusEndpointUnavailableRef.current) {
        try {
          const statusResponse = await api.get<OnlineStatusApiResponse>("/users/online-status", {
            params: { limit: 500 },
          });
          const onlineUsers = extractOnlineUsers(statusResponse);
          const onlineMap = extractOnlineStatusMap(statusResponse);

          if (onlineUsers.length > 0) {
            const nextCache = { ...onlineStatusCacheRef.current };
            onlineUsers.forEach((onlineUser) => {
              const resolvedId = onlineUser.id || onlineUser.userId;
              const resolvedUsername = onlineUser.username || onlineUser.userName;
              const normalizedUsername = normalizeUsername(resolvedUsername || "");
              const isOnlineNow = isPresenceOnline(onlineUser.lastSeen || onlineUser.lastHeartbeat);
              if (resolvedId) nextCache[resolvedId] = isOnlineNow;
              if (resolvedUsername) nextCache[resolvedUsername] = isOnlineNow;
              if (normalizedUsername) nextCache[normalizedUsername] = isOnlineNow;
            });
            onlineStatusCacheRef.current = nextCache;
          }

          userData.forEach((user) => {
            const lookup = normalizeUsername(user.username);
            const snapshotUser = onlineUsers.find((onlineUser) => {
              const resolvedId = onlineUser.id || onlineUser.userId;
              const resolvedUsername = onlineUser.username || onlineUser.userName;
              const snapshotUsername = normalizeUsername(resolvedUsername || "");
              return (
                (!!resolvedId && resolvedId === user.id) ||
                (!!snapshotUsername && snapshotUsername === lookup)
              );
            });

            user.isOnline =
              (snapshotUser ? isPresenceOnline(snapshotUser.lastSeen || snapshotUser.lastHeartbeat) : undefined) ??
              onlineMap[user.id] ??
              onlineMap[user.username] ??
              onlineMap[lookup] ??
              onlineStatusCacheRef.current[lookup] ??
              onlineStatusCacheRef.current[user.username] ??
              onlineStatusCacheRef.current[user.id] ??
              ((!!currentUserId && user.id === currentUserId) || (!!currentUsername && lookup === currentUsername));
          });
        } catch (error: unknown) {
          if ((error as ApiLikeError)?.status === 404) {
            onlineStatusEndpointUnavailableRef.current = true;
          }
          // Keep default isOnline values
        }
      }

      setUsers(userData);
      if (meta) {
        setTotalPages(meta.pages);
        setTotalResults(meta.total);
      } else {
        setTotalPages(1);
        setTotalResults(userData.length);
      }
    } catch (err) {
      setError(t.common.error_get_data);
      setUsers([]);
    } finally {
      setHasLoadedOnce(true);
      setLoading(false);
    }
  }, [
    currentPage,
    perPage,
    debouncedQuery,
    filterType,
    sortField,
    sortOrder,
    currentUser?.id,
    currentUser?.username,
    t.common.error_get_data,
  ]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Stats
  const onlineCount = useMemo(
    () => users.filter((u) => u.isOnline).length,
    [users]
  );

  // Sort options
  const sortOptions = [
    { value: "username", order: "asc", label: sr.sort.username_asc },
    { value: "username", order: "desc", label: sr.sort.username_desc },
    { value: "name", order: "asc", label: sr.sort.name_asc },
    { value: "name", order: "desc", label: sr.sort.name_desc },
    { value: "recent", order: "desc", label: sr.sort.recent },
  ];

  const currentSortLabel = useMemo(() => {
    const option = sortOptions.find(
      (o) => o.value === sortField && o.order === sortOrder
    );
    return option?.label || sr.sort.username_asc;
  }, [sortField, sortOrder, sortOptions, sr.sort.username_asc]);

  const handleSortChange = (value: string, order: string) => {
    setSortField(value as SortField);
    setSortOrder(order as SortOrder);
    setShowSort(false);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: FilterType) => {
    setFilterType(filter);
    setShowFilters(false);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterType("all");
    setSortField("username");
    setSortOrder("asc");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filterType !== "all" ||
    sortField !== "username" ||
    sortOrder !== "asc" ||
    searchQuery !== "";

  return (
    <div className="min-h-full bg-vaks-light-primary dark:bg-vaks-dark-primary p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
            {sr.title}
          </h1>
          <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
            {sr.subtitle}
          </p>
        </motion.div>

        {/* Search Bar & Filters */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 space-y-4"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={sr.search_placeholder}
                className="w-full pl-12 pr-10 py-3 rounded-xl border border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-light-input dark:bg-vaks-dark-input text-vaks-light-main-txt dark:text-vaks-dark-main-txt placeholder:text-vaks-light-alt-txt dark:placeholder:text-vaks-dark-alt-txt focus:outline-none focus:border-vaks-light-purple-button dark:focus:border-vaks-dark-purple-button transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-vaks-light-alt-txt hover:text-vaks-light-main-txt dark:text-vaks-dark-alt-txt dark:hover:text-vaks-dark-main-txt transition-colors" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowFilters(!showFilters);
                  setShowSort(false);
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                  filterType !== "all"
                    ? "border-vaks-light-purple-button bg-vaks-light-purple-button/10 text-vaks-light-purple-button dark:border-vaks-dark-purple-button dark:bg-vaks-dark-purple-button/10 dark:text-vaks-dark-purple-button"
                    : "border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-light-input dark:bg-vaks-dark-input text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:bg-vaks-light-purple-card dark:hover:bg-vaks-dark-purple-card"
                }`}
              >
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">{sr.filters.title}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl border border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card shadow-lg overflow-hidden"
                  >
                    {(["all", "online", "friends"] as FilterType[]).map(
                      (filter) => (
                        <button
                          key={filter}
                          onClick={() => handleFilterChange(filter)}
                          className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                            filterType === filter
                              ? "bg-vaks-light-purple-button/10 text-vaks-light-purple-button dark:bg-vaks-dark-purple-button/10 dark:text-vaks-dark-purple-button font-medium"
                              : "text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
                          }`}
                        >
                          {filter === "all" && sr.filters.all}
                          {filter === "online" && sr.filters.online_only}
                          {filter === "friends" && sr.filters.friends_only}
                        </button>
                      )
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sort Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSort(!showSort);
                  setShowFilters(false);
                }}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-light-input dark:bg-vaks-dark-input text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:bg-vaks-light-purple-card dark:hover:bg-vaks-dark-purple-card transition-colors"
              >
                {sortOrder === "asc" ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
                <span className="text-sm font-medium hidden sm:inline">
                  {currentSortLabel}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showSort ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {showSort && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card shadow-lg overflow-hidden"
                  >
                    <div className="px-4 py-2 border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/20">
                      <span className="text-xs font-bold uppercase tracking-wider text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                        {sr.sort.title}
                      </span>
                    </div>
                    {sortOptions.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          handleSortChange(option.value, option.order)
                        }
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                          sortField === option.value &&
                          sortOrder === option.order
                            ? "bg-vaks-light-purple-button/10 text-vaks-light-purple-button dark:bg-vaks-dark-purple-button/10 dark:text-vaks-dark-purple-button font-medium"
                            : "text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Active Filters & Clear */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              {filterType !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-vaks-light-purple-button/10 text-vaks-light-purple-button dark:bg-vaks-dark-purple-button/10 dark:text-vaks-dark-purple-button text-xs font-medium">
                  {filterType === "online"
                    ? sr.filters.online_only
                    : sr.filters.friends_only}
                  <button onClick={() => setFilterType("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-vaks-light-input dark:bg-vaks-dark-input text-vaks-light-main-txt dark:text-vaks-dark-main-txt text-xs font-medium">
                  "{searchQuery}"
                  <button onClick={() => setSearchQuery("")}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-vaks-light-alt-txt hover:text-vaks-light-purple-button dark:text-vaks-dark-alt-txt dark:hover:text-vaks-dark-purple-button underline"
              >
                {sr.filters.clear}
              </button>
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 flex items-center gap-4 text-sm"
        >
          <span className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
            <strong className="text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
              {totalResults}
            </strong>{" "}
            {sr.stats.total_users}
          </span>
          <span className="w-1 h-1 rounded-full bg-vaks-light-alt-txt/30 dark:bg-vaks-dark-alt-txt/30" />
          <span className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
            <strong className="text-green-500">{onlineCount}</strong>{" "}
            {sr.stats.online_users}
          </span>
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {loading || !hasLoadedOnce ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-vaks-light-purple-button/30 border-t-vaks-light-purple-button dark:border-vaks-dark-purple-button/30 dark:border-t-vaks-dark-purple-button rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-sm text-vaks-light-error dark:text-vaks-dark-error">
                {error}
              </p>
              <button
                onClick={fetchUsers}
                className="mt-4 text-sm text-vaks-light-purple-button dark:text-vaks-dark-purple-button hover:underline"
              >
                {t.common.try_again}
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-16 h-16 mx-auto mb-4 text-vaks-light-alt-txt/30 dark:text-vaks-dark-alt-txt/30" />
              <p className="text-lg font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
                {debouncedQuery ? sr.not_found_label : sr.empty}
              </p>
              <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                {sr.empty_description}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {users.map((user, index) => (
                  <motion.div
                    key={user.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/perfil/${encodeURIComponent(user.username)}`}
                      className="block p-4 rounded-2xl border border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card hover:bg-vaks-light-purple-card-hover dark:hover:bg-vaks-dark-purple-card-hover transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <UserAvatar username={user.username} avatarUrl={user.avatarUrl} size="md" />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-vaks-light-purple-card dark:border-vaks-dark-purple-card ${
                              user.isOnline
                                ? "bg-green-500"
                                : "bg-gray-400 dark:bg-gray-600"
                            }`}
                            title={user.isOnline ? gs.online : gs.offline}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          {user.name && (
                            <p className="text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt truncate">
                              {user.name}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt truncate group-hover:text-vaks-light-purple-button dark:group-hover:text-vaks-dark-purple-button transition-colors">
                              @{user.username}
                            </h3>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                user.isOnline
                                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                  : "bg-gray-500/10 text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {user.isOnline ? gs.online : gs.offline}
                            </span>
                          </div>
                          {user.bio && (
                            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt truncate">
                              {user.bio}
                            </p>
                          )}
                        </div>
                        {user.isFriend && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-vaks-light-primary dark:bg-vaks-dark-primary text-[10px] font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                            <UserPlus className="h-3 w-3" />
                            {gs.friendship_badges.friends}
                          </span>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              <span>{sr.pagination.showing}</span>
              <span className="font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                {(currentPage - 1) * perPage + 1}
              </span>
              <span>{sr.pagination.to}</span>
              <span className="font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                {Math.min(currentPage * perPage, totalResults)}
              </span>
              <span>{sr.pagination.of}</span>
              <span className="font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                {totalResults}
              </span>
              <span>{sr.pagination.results}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Per page selector */}
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl border border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-light-input dark:bg-vaks-dark-input text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt focus:outline-none focus:border-vaks-light-purple-button dark:focus:border-vaks-dark-purple-button"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} {sr.pagination.per_page.toLowerCase()}
                  </option>
                ))}
              </select>

              {/* Page navigation */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-light-input dark:bg-vaks-dark-input text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:bg-vaks-light-purple-card dark:hover:bg-vaks-dark-purple-card disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-3 py-2 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                {sr.pagination.page} {currentPage} {sr.pagination.of}{" "}
                {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-light-input dark:bg-vaks-dark-input text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:bg-vaks-light-purple-card dark:hover:bg-vaks-dark-purple-card disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
