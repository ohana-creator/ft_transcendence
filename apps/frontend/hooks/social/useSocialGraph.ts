'use client';

import { useEffect, useState } from 'react';

export const DEFAULT_CURRENT_USERNAME = 'melzira_ebo';

const STORAGE_KEY = 'vaks:social-graph';
const STORAGE_EVENT = 'vaks:social-graph:updated';
const AVATAR_STORAGE_KEY = 'vaks:avatar';

export type ProfileVisibility = 'publico' | 'privado';
export type FriendshipStatus =
  | 'self'
  | 'friends'
  | 'outgoing'
  | 'incoming'
  | 'blocked'
  | 'can-send';

export interface SocialUser {
  id: string;
  username: string;
  nome: string;
  email: string;
  avatarUrl?: string;
  profileVisibility: ProfileVisibility;
  contributionCount: number;
  contributionValue: number;
  vaquinhaCount: number;
  saldo: number;
  location: string;
}

export interface SocialCampaign {
  id: string;
  title: string;
  visibility: 'publica' | 'privada';
  href: string;
  ownerUsername: string;
  memberUsernames: string[];
}

export interface FriendRequest {
  id: string;
  fromUsername: string;
  toUsername: string;
  createdAt: string;
}

interface BlockRelation {
  blockerUsername: string;
  blockedUsername: string;
}

interface Friendship {
  id: string;
  usernames: [string, string];
  createdAt: string;
}

export interface SocialState {
  users: SocialUser[];
  campaigns: SocialCampaign[];
  friendRequests: FriendRequest[];
  friendships: Friendship[];
  blocks: BlockRelation[];
}

const INITIAL_SOCIAL_STATE: SocialState = {
  users: [
    {
      id: 'u-1',
      username: 'melzira_ebo',
      nome: 'Melquisedeque Ebo',
      email: 'user@example.com',
      profileVisibility: 'publico',
      contributionCount: 24,
      contributionValue: 12450,
      vaquinhaCount: 4,
      saldo: 12450,
      location: 'Luanda, Angola',
    },
    {
      id: 'u-2',
      username: 'ana_silva',
      nome: 'Ana Silva',
      email: 'ana@example.com',
      profileVisibility: 'publico',
      contributionCount: 18,
      contributionValue: 8400,
      vaquinhaCount: 3,
      saldo: 8300,
      location: 'Benguela, Angola',
    },
    {
      id: 'u-3',
      username: 'joao_matos',
      nome: 'Joao Matos',
      email: 'joao@example.com',
      profileVisibility: 'privado',
      contributionCount: 11,
      contributionValue: 3300,
      vaquinhaCount: 2,
      saldo: 5100,
      location: 'Lisboa, Portugal',
    },
    {
      id: 'u-4',
      username: 'carla_dev',
      nome: 'Carla Ventura',
      email: 'carla@example.com',
      profileVisibility: 'publico',
      contributionCount: 29,
      contributionValue: 15420,
      vaquinhaCount: 6,
      saldo: 16000,
      location: 'Porto, Portugal',
    },
    {
      id: 'u-5',
      username: 'maria_luisa',
      nome: 'Maria Luisa',
      email: 'maria@example.com',
      profileVisibility: 'privado',
      contributionCount: 9,
      contributionValue: 2100,
      vaquinhaCount: 1,
      saldo: 2900,
      location: 'Huambo, Angola',
    },
  ],
  campaigns: [
    {
      id: '1',
      title: 'Viagem para Portugal',
      visibility: 'privada',
      href: '/vaquinhas/privadas/1',
      ownerUsername: 'melzira_ebo',
      memberUsernames: ['melzira_ebo', 'ana_silva', 'joao_matos'],
    },
    {
      id: '2',
      title: 'Presente da turma',
      visibility: 'publica',
      href: '/vaquinhas/2',
      ownerUsername: 'ana_silva',
      memberUsernames: ['melzira_ebo', 'ana_silva', 'carla_dev'],
    },
    {
      id: '3',
      title: 'Equipamento de estudio',
      visibility: 'privada',
      href: '/vaquinhas/privadas/3',
      ownerUsername: 'carla_dev',
      memberUsernames: ['melzira_ebo', 'carla_dev'],
    },
    {
      id: '4',
      title: 'Aniversario da Maria',
      visibility: 'privada',
      href: '/vaquinhas/privadas/4',
      ownerUsername: 'maria_luisa',
      memberUsernames: ['maria_luisa', 'ana_silva'],
    },
    {
      id: '5',
      title: 'Bolsa para conferencia tech',
      visibility: 'publica',
      href: '/vaquinhas/5',
      ownerUsername: 'joao_matos',
      memberUsernames: ['joao_matos', 'carla_dev'],
    },
  ],
  friendRequests: [
    {
      id: 'fr-1',
      fromUsername: 'melzira_ebo',
      toUsername: 'carla_dev',
      createdAt: '2026-03-14T10:30:00.000Z',
    },
    {
      id: 'fr-2',
      fromUsername: 'maria_luisa',
      toUsername: 'melzira_ebo',
      createdAt: '2026-03-15T08:45:00.000Z',
    },
  ],
  friendships: [
    {
      id: 'fs-1',
      usernames: ['ana_silva', 'melzira_ebo'],
      createdAt: '2026-02-12T11:00:00.000Z',
    },
    {
      id: 'fs-2',
      usernames: ['joao_matos', 'melzira_ebo'],
      createdAt: '2026-01-20T17:00:00.000Z',
    },
  ],
  blocks: [],
};

function getStoredAvatar(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return localStorage.getItem(AVATAR_STORAGE_KEY) || undefined;
}

function hydrateCurrentUserAvatar(state: SocialState): SocialState {
  const avatarUrl = getStoredAvatar();

  if (!avatarUrl) {
    return state;
  }

  return {
    ...state,
    users: state.users.map((user) =>
      user.username === DEFAULT_CURRENT_USERNAME ? { ...user, avatarUrl } : user,
    ),
  };
}

function sortPair(first: string, second: string): [string, string] {
  return [first, second].sort((left, right) => left.localeCompare(right)) as [string, string];
}

function persistState(state: SocialState) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
}

export function loadSocialState(): SocialState {
  if (typeof window === 'undefined') {
    return hydrateCurrentUserAvatar(INITIAL_SOCIAL_STATE);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      persistState(INITIAL_SOCIAL_STATE);
      return hydrateCurrentUserAvatar(INITIAL_SOCIAL_STATE);
    }

    return hydrateCurrentUserAvatar(JSON.parse(raw) as SocialState);
  } catch {
    persistState(INITIAL_SOCIAL_STATE);
    return hydrateCurrentUserAvatar(INITIAL_SOCIAL_STATE);
  }
}

export function getUserByUsername(state: SocialState, username: string) {
  return state.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
}

function isBlockedBetween(state: SocialState, currentUsername: string, targetUsername: string) {
  return state.blocks.some(
    (relation) =>
      (relation.blockerUsername === currentUsername && relation.blockedUsername === targetUsername) ||
      (relation.blockerUsername === targetUsername && relation.blockedUsername === currentUsername),
  );
}

export function getFriendUsernames(state: SocialState, currentUsername: string) {
  return state.friendships.reduce<string[]>((friendUsernames, friendship) => {
    if (!friendship.usernames.includes(currentUsername)) {
      return friendUsernames;
    }

    const friendUsername = friendship.usernames.find((username) => username !== currentUsername);

    if (!friendUsername || isBlockedBetween(state, currentUsername, friendUsername)) {
      return friendUsernames;
    }

    return [...friendUsernames, friendUsername];
  }, []);
}

export function getFriendUsers(state: SocialState, currentUsername: string) {
  return getFriendUsernames(state, currentUsername)
    .map((username) => getUserByUsername(state, username))
    .filter((user): user is SocialUser => Boolean(user));
}

export function getIncomingFriendRequests(state: SocialState, currentUsername: string) {
  return state.friendRequests.filter(
    (request) =>
      request.toUsername === currentUsername &&
      !isBlockedBetween(state, currentUsername, request.fromUsername),
  );
}

export function getOutgoingFriendRequests(state: SocialState, currentUsername: string) {
  return state.friendRequests.filter(
    (request) =>
      request.fromUsername === currentUsername &&
      !isBlockedBetween(state, currentUsername, request.toUsername),
  );
}

export function getBlockedUsers(state: SocialState, currentUsername: string) {
  return state.blocks
    .filter((relation) => relation.blockerUsername === currentUsername)
    .map((relation) => getUserByUsername(state, relation.blockedUsername))
    .filter((user): user is SocialUser => Boolean(user));
}

export function getFriendshipStatus(
  state: SocialState,
  currentUsername: string,
  targetUsername: string,
): FriendshipStatus {
  if (currentUsername === targetUsername) {
    return 'self';
  }

  if (isBlockedBetween(state, currentUsername, targetUsername)) {
    return 'blocked';
  }

  if (state.friendships.some((friendship) => friendship.usernames.includes(currentUsername) && friendship.usernames.includes(targetUsername))) {
    return 'friends';
  }

  if (state.friendRequests.some((request) => request.fromUsername === currentUsername && request.toUsername === targetUsername)) {
    return 'outgoing';
  }

  if (state.friendRequests.some((request) => request.fromUsername === targetUsername && request.toUsername === currentUsername)) {
    return 'incoming';
  }

  return 'can-send';
}

export function getDiscoverableCampaigns(state: SocialState, currentUsername: string) {
  return state.campaigns.filter(
    (campaign) =>
      campaign.visibility === 'publica' || campaign.memberUsernames.includes(currentUsername),
  );
}

export function searchPlatform(state: SocialState, currentUsername: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  const users = state.users
    .filter((user) => user.username !== currentUsername)
    .filter((user) => !isBlockedBetween(state, currentUsername, user.username))
    .filter((user) => {
      if (!normalizedQuery) {
        return true;
      }

      return `${user.username} ${user.nome}`.toLowerCase().includes(normalizedQuery);
    });

  const campaigns = getDiscoverableCampaigns(state, currentUsername).filter((campaign) => {
    if (!normalizedQuery) {
      return true;
    }

    return campaign.title.toLowerCase().includes(normalizedQuery);
  });

  return { users, campaigns };
}

function updateState(transformer: (state: SocialState) => SocialState) {
  const nextState = transformer(loadSocialState());
  persistState(nextState);
  return nextState;
}

export function useSocialGraph(currentUsername = DEFAULT_CURRENT_USERNAME) {
  const [state, setState] = useState<SocialState>(() => loadSocialState());

  useEffect(() => {
    const syncState = () => {
      setState(loadSocialState());
    };

    syncState();
    window.addEventListener('storage', syncState);
    window.addEventListener(STORAGE_EVENT, syncState as EventListener);

    return () => {
      window.removeEventListener('storage', syncState);
      window.removeEventListener(STORAGE_EVENT, syncState as EventListener);
    };
  }, []);

  const replaceState = (transformer: (previousState: SocialState) => SocialState) => {
    const nextState = updateState(transformer);
    setState(nextState);
  };

  return {
    state,
    currentUser: getUserByUsername(state, currentUsername),
    friends: getFriendUsers(state, currentUsername),
    incomingRequests: getIncomingFriendRequests(state, currentUsername),
    outgoingRequests: getOutgoingFriendRequests(state, currentUsername),
    blockedUsers: getBlockedUsers(state, currentUsername),
    getUser: (username: string) => getUserByUsername(state, username),
    getFriendshipStatus: (targetUsername: string) => getFriendshipStatus(state, currentUsername, targetUsername),
    sendFriendRequest: (targetUsername: string) => {
      replaceState((previousState) => {
        if (getFriendshipStatus(previousState, currentUsername, targetUsername) !== 'can-send') {
          return previousState;
        }

        return {
          ...previousState,
          friendRequests: [
            ...previousState.friendRequests,
            {
              id: `fr-${Date.now()}`,
              fromUsername: currentUsername,
              toUsername: targetUsername,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });
    },
    acceptFriendRequest: (requestId: string) => {
      replaceState((previousState) => {
        const request = previousState.friendRequests.find((item) => item.id === requestId);

        if (!request || request.toUsername !== currentUsername) {
          return previousState;
        }

        const usernames = sortPair(request.fromUsername, request.toUsername);

        return {
          ...previousState,
          friendRequests: previousState.friendRequests.filter((item) => item.id !== requestId),
          friendships: previousState.friendships.some(
            (friendship) => friendship.usernames[0] === usernames[0] && friendship.usernames[1] === usernames[1],
          )
            ? previousState.friendships
            : [
                ...previousState.friendships,
                {
                  id: `fs-${Date.now()}`,
                  usernames,
                  createdAt: new Date().toISOString(),
                },
              ],
        };
      });
    },
    declineFriendRequest: (requestId: string) => {
      replaceState((previousState) => ({
        ...previousState,
        friendRequests: previousState.friendRequests.filter((request) => request.id !== requestId),
      }));
    },
    removeFriend: (targetUsername: string) => {
      replaceState((previousState) => ({
        ...previousState,
        friendships: previousState.friendships.filter(
          (friendship) =>
            !(friendship.usernames.includes(currentUsername) && friendship.usernames.includes(targetUsername)),
        ),
      }));
    },
    blockUser: (targetUsername: string) => {
      replaceState((previousState) => {
        if (
          previousState.blocks.some(
            (relation) => relation.blockerUsername === currentUsername && relation.blockedUsername === targetUsername,
          )
        ) {
          return previousState;
        }

        return {
          ...previousState,
          blocks: [
            ...previousState.blocks,
            { blockerUsername: currentUsername, blockedUsername: targetUsername },
          ],
          friendships: previousState.friendships.filter(
            (friendship) =>
              !(friendship.usernames.includes(currentUsername) && friendship.usernames.includes(targetUsername)),
          ),
          friendRequests: previousState.friendRequests.filter(
            (request) =>
              !(
                (request.fromUsername === currentUsername && request.toUsername === targetUsername) ||
                (request.fromUsername === targetUsername && request.toUsername === currentUsername)
              ),
          ),
        };
      });
    },
  };
}