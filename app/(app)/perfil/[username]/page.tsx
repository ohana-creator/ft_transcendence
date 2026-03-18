'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Clock3, Lock, ShieldBan, UserCheck, UserPlus } from 'lucide-react';
import { ContributionGraph } from '@/components/profile/contribution-graph';
import { UserAvatar } from '@/components/profile/useAvatar';
import { DEFAULT_CURRENT_USERNAME, useSocialGraph } from '@/hooks/social/useSocialGraph';
import { useI18n } from '@/locales';

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const rawUsername = Array.isArray(params.username) ? params.username[0] : params.username;
  const username = decodeURIComponent(rawUsername);
  const { t } = useI18n();
  const profile = t.perfil;
  const {
    getUser,
    getFriendshipStatus,
    incomingRequests,
    sendFriendRequest,
    acceptFriendRequest,
  } = useSocialGraph(DEFAULT_CURRENT_USERNAME);
  const viewedUser = getUser(username);
  const friendshipStatus = viewedUser ? getFriendshipStatus(viewedUser.username) : 'can-send';
  const incomingRequest = incomingRequests.find((request) => request.fromUsername === viewedUser?.username);
  const canViewFullProfile =
    viewedUser?.profileVisibility === 'publico' ||
    friendshipStatus === 'friends' ||
    viewedUser?.username === DEFAULT_CURRENT_USERNAME;

  if (!viewedUser) {
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
    if (viewedUser.username === DEFAULT_CURRENT_USERNAME) {
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

    if (friendshipStatus === 'incoming' && incomingRequest) {
      return (
        <button
          onClick={() => acceptFriendRequest(incomingRequest.id)}
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
        onClick={() => sendFriendRequest(viewedUser.username)}
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
                    <h1 className="text-3xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                      @{viewedUser.username}
                    </h1>
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
          </div>
        </motion.div>

        {canViewFullProfile && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <ContributionGraph seed={viewedUser.username} />
          </motion.div>
        )}
      </div>
    </div>
  );
}