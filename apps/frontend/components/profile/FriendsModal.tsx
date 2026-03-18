'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock3, ShieldBan, UserMinus, Users, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { UserAvatar } from '@/components/profile/useAvatar';
import {
  DEFAULT_CURRENT_USERNAME,
  FriendRequest,
  SocialUser,
  useSocialGraph,
} from '@/hooks/social/useSocialGraph';
import { useI18n } from '@/locales';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FriendsTab = 'friends' | 'outgoing' | 'incoming';

function RequestRow({
  user,
  date,
  actions,
}: {
  user?: SocialUser;
  date: string;
  actions: React.ReactNode;
}) {
  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-vaks-light-stroke/40 bg-vaks-light-primary/70 px-4 py-3 dark:border-vaks-dark-stroke/30 dark:bg-vaks-dark-primary/60">
      <UserAvatar username={user.username} avatarUrl={user.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
          @{user.username}
        </p>
        <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
          {new Date(date).toLocaleDateString('pt-AO')}
        </p>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input">
        {icon}
      </div>
      <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{label}</p>
    </div>
  );
}

export function FriendsModal({ isOpen, onClose }: FriendsModalProps) {
  const { t } = useI18n();
  const profile = t.perfil;
  const [tab, setTab] = useState<FriendsTab>('friends');
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    getUser,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    blockUser,
  } = useSocialGraph(DEFAULT_CURRENT_USERNAME);

  const tabs: { key: FriendsTab; label: string; count: number }[] = [
    { key: 'friends', label: profile.modal_amigos.tabs.amigos, count: friends.length },
    { key: 'outgoing', label: profile.modal_amigos.tabs.enviados, count: outgoingRequests.length },
    { key: 'incoming', label: profile.modal_amigos.tabs.pendentes, count: incomingRequests.length },
  ];

  const renderIncomingActions = (request: FriendRequest) => (
    <>
      <button
        onClick={() => acceptFriendRequest(request.id)}
        className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
      >
        <Check className="h-3.5 w-3.5" />
        {profile.modal_amigos.aceitar}
      </button>
      <button
        onClick={() => declineFriendRequest(request.id)}
        className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-vaks-light-alt-txt transition-colors hover:bg-vaks-light-input dark:text-vaks-dark-alt-txt dark:hover:bg-vaks-dark-input"
      >
        <X className="h-3.5 w-3.5" />
        {profile.modal_amigos.recusar}
      </button>
    </>
  );

  const renderOutgoingActions = (request: FriendRequest) => (
    <button
      onClick={() => declineFriendRequest(request.id)}
      className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-vaks-light-alt-txt transition-colors hover:bg-vaks-light-input dark:text-vaks-dark-alt-txt dark:hover:bg-vaks-dark-input"
    >
      <X className="h-3.5 w-3.5" />
      {profile.modal_amigos.cancelar}
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-3xl overflow-hidden rounded-3xl border border-vaks-light-stroke/40 bg-vaks-light-purple-card shadow-2xl dark:border-vaks-dark-stroke/25 dark:bg-vaks-dark-purple-card"
          >
            <div className="flex items-start justify-between border-b border-vaks-light-stroke/30 px-6 py-5 dark:border-vaks-dark-stroke/20">
              <div>
                <h2 className="text-lg font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                  {profile.modal_amigos.titulo}
                </h2>
                <p className="mt-1 text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                  {friends.length} {profile.amigos.toLowerCase()}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-vaks-light-alt-txt transition-colors hover:bg-vaks-light-input dark:text-vaks-dark-alt-txt dark:hover:bg-vaks-dark-input"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-vaks-light-stroke/30 px-6 py-3 dark:border-vaks-dark-stroke/20">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    tab === item.key
                      ? 'bg-vaks-light-purple-button/10 text-vaks-light-purple-button dark:bg-vaks-dark-purple-button/20 dark:text-vaks-dark-secondary'
                      : 'text-vaks-light-alt-txt hover:bg-vaks-light-input dark:text-vaks-dark-alt-txt dark:hover:bg-vaks-dark-input'
                  }`}
                >
                  {item.label}
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] dark:bg-black/20">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="max-h-120 overflow-y-auto px-6 py-5">
              {tab === 'friends' && (
                <div className="space-y-3">
                  {friends.length === 0 ? (
                    <EmptyState
                      icon={<Users className="h-5 w-5 text-vaks-light-alt-txt/40 dark:text-vaks-dark-alt-txt/40" />}
                      label={profile.modal_amigos.vazio_amigos}
                    />
                  ) : (
                    friends.map((friend) => (
                      <div
                        key={friend.username}
                        className="flex items-center gap-3 rounded-2xl border border-vaks-light-stroke/40 bg-vaks-light-primary/70 px-4 py-3 dark:border-vaks-dark-stroke/30 dark:bg-vaks-dark-primary/60"
                      >
                        <UserAvatar username={friend.username} avatarUrl={friend.avatarUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                            @{friend.username}
                          </p>
                          <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                            {friend.nome}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFriend(friend.username)}
                            className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            {profile.modal_amigos.remover}
                          </button>
                          <button
                            onClick={() => blockUser(friend.username)}
                            className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            <ShieldBan className="h-3.5 w-3.5" />
                            {profile.modal_amigos.bloquear}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'outgoing' && (
                <div className="space-y-3">
                  {outgoingRequests.length === 0 ? (
                    <EmptyState
                      icon={<UserPlus className="h-5 w-5 text-vaks-light-alt-txt/40 dark:text-vaks-dark-alt-txt/40" />}
                      label={profile.modal_amigos.vazio_enviados}
                    />
                  ) : (
                    outgoingRequests.map((request) => (
                      <RequestRow
                        key={request.id}
                        user={getUser(request.toUsername)}
                        date={request.createdAt}
                        actions={renderOutgoingActions(request)}
                      />
                    ))
                  )}
                </div>
              )}

              {tab === 'incoming' && (
                <div className="space-y-3">
                  {incomingRequests.length === 0 ? (
                    <EmptyState
                      icon={<Clock3 className="h-5 w-5 text-vaks-light-alt-txt/40 dark:text-vaks-dark-alt-txt/40" />}
                      label={profile.modal_amigos.vazio_pendentes}
                    />
                  ) : (
                    incomingRequests.map((request) => (
                      <RequestRow
                        key={request.id}
                        user={getUser(request.fromUsername)}
                        date={request.createdAt}
                        actions={renderIncomingActions(request)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-vaks-light-stroke/30 bg-vaks-light-primary/50 px-6 py-4 dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-primary/40">
              <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                {profile.modal_amigos.rodape}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}