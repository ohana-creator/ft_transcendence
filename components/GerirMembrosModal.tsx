'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Shield, User, UserMinus, UserPlus, Mail, Send, Trash2 } from 'lucide-react';
import { useI18n } from '@/locales';

type MemberRole = 'SUDO' | 'OWNER' | 'VAKER';

interface Member {
  id: number;
  userId: number;
  username: string;
  avatarUrl: string | null;
  role: MemberRole;
  joinedAt: string;
}

interface GerirMembrosModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  memberCount: number;
  currentUserId: number; // ID do utilizador logado
  currentUserRole: MemberRole; // papel do utilizador logado
  onPromoteMember: (userId: number) => void;
  onRemoveMember: (userId: number) => void;
  onSendInvite: (email: string) => void;
}

type Tab = 'members' | 'invite';

export function GerirMembrosModal({
  isOpen,
  onClose,
  members,
  memberCount,
  currentUserId,
  currentUserRole,
  onPromoteMember,
  onRemoveMember,
  onSendInvite,
}: GerirMembrosModalProps) {
  const { t } = useI18n();
  const gm = t.gerirMembros;
  
  const ROLE_CONFIG: Record<MemberRole, { label: string; icon: React.ReactNode; color: string }> = {
    SUDO: {
      label: gm.roles.SUDO,
       icon: <Shield className="w-3.5 h-3.5" />,
      color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    },
    OWNER: {
      label: gm.roles.OWNER,
      icon: <Crown className="w-3.5 h-3.5" />,
      color: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    VAKER: {
      label: gm.roles.VAKER,
      icon: <User className="w-3.5 h-3.5" />,
      color: 'text-vaks-light-alt-txt bg-vaks-light-input dark:bg-vaks-dark-input dark:text-vaks-dark-alt-txt',
    },
  };
  
  const [tab, setTab] = useState<Tab>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);
  const [sent, setSent] = useState(false);

  const canManage = currentUserRole === 'SUDO' || currentUserRole === 'OWNER';

  const handleSendInvite = () => {
    if (!inviteEmail) return;
    onSendInvite(inviteEmail);
    setInviteEmail('');
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };

  const handleRemove = (userId: number) => {
    if (confirmRemoveId === userId) {
      onRemoveMember(userId);
      setConfirmRemoveId(null);
    } else {
      setConfirmRemoveId(userId);
    }
  };

  // ordena: SUDO → OWNER → VAKER
  const sortedMembers = [...members].sort((a, b) => {
    const order = { SUDO: 0, OWNER: 1, VAKER: 2 };
    return order[a.role] - order[b.role];
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative z-10 w-full max-w-md bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-lg shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-vaks-light-stroke dark:border-vaks-dark-stroke">
              <div>
                <h2 className="text-base font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                  {gm.titulo}
                </h2>
                <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5">
                  {memberCount} {gm.memberCount}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-vaks-light-stroke dark:border-vaks-dark-stroke">
              {([
                { key: 'members', label: gm.tabs.members, icon: <User className="w-3.5 h-3.5" /> },
                { key: 'invite', label: gm.tabs.invite, icon: <Mail className="w-3.5 h-3.5" /> },
              ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative flex items-center gap-1.5 px-6 py-3 text-sm font-medium transition-colors flex-1 justify-center
                    ${tab === t.key
                      ? 'text-vaks-light-purple-button dark:text-vaks-dark-secondary'
                      : 'text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-vaks-light-main-txt dark:hover:text-vaks-dark-main-txt'
                    }`}
                >
                  {t.icon}
                  {t.label}
                  {tab === t.key && (
                    <motion.div
                      layoutId="modal-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Conteúdo */}
            <AnimatePresence mode="wait">
              {tab === 'members' ? (
                <motion.div
                  key="members"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="p-4 flex flex-col gap-2 max-h-96 overflow-y-auto"
                >
                  {sortedMembers.map(member => {
                    const isMe = member.userId === currentUserId;
                    const role = ROLE_CONFIG[member.role];
                    const isConfirming = confirmRemoveId === member.id;
                    const canRemoveThis =
                      canManage &&
                      !isMe &&
                      member.role !== 'SUDO' &&
                      !(currentUserRole === 'OWNER' && member.role === 'OWNER');

                    return (
                      <motion.div
                        key={member.id}
                        layout
                        className="flex items-center gap-3 p-3 rounded-xl border border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-light-primary dark:bg-vaks-dark-primary"
                      >
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-vaks-light-input dark:bg-vaks-dark-input flex items-center justify-center text-sm font-bold text-vaks-light-purple-button dark:text-vaks-dark-secondary shrink-0">
                          {member.username[0].toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt truncate">
                              @{member.username}
                            </span>
                            {isMe && (
                              <span className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                                {gm.me}
                              </span>
                            )}
                            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${role.color}`}>
                              {role.icon}
                              {role.label}
                            </span>
                          </div>
                          <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5">
                            {gm.joinedAt} {new Date(member.joinedAt).toLocaleDateString('pt-AO')}
                          </p>
                        </div>

                        {/* Ações */}
                        {canRemoveThis && (
                          <div className="flex items-center gap-1 shrink-0">
                            {isConfirming ? (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-1"
                              >
                                <span className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{gm.removeConfirm}</span>
                                <button
                                  onClick={() => handleRemove(member.id)}
                                  className="text-xs text-vaks-light-error dark:text-vaks-dark-error font-semibold hover:underline"
                                >
                                  {gm.yes}
                                </button>
                                <button
                                  onClick={() => setConfirmRemoveId(null)}
                                  className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:underline"
                                >
                                  {gm.no}
                                </button>
                              </motion.div>
                            ) : (
                              <>
                                {/* Promover para admin (só SUDO pode) */}
                                {currentUserRole === 'SUDO' && member.role === 'VAKER' && (
                                  <button
                                    onClick={() => onPromoteMember(member.userId)}
                                    title={gm.promoteAdmin}
                                    className="p-1.5 rounded-lg text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                  >
                                    <Shield className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => setConfirmRemoveId(member.id)}
                                  title={gm.removeMember}
                                  className="p-1.5 rounded-lg text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-vaks-light-error dark:hover:text-vaks-dark-error hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="invite"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="p-6"
                >
                  {canManage ? (
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                        {gm.invite.description}
                      </p>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                          {gm.invite.emailLabel}
                        </label>
                        <input
                          type="email"
                          placeholder={gm.invite.emailPlaceholder}
                          value={inviteEmail}
                          onChange={e => setInviteEmail(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border text-sm
                            bg-vaks-light-input dark:bg-vaks-dark-input
                            border-vaks-light-stroke dark:border-vaks-dark-stroke
                            text-vaks-light-main-txt dark:text-vaks-dark-main-txt
                            placeholder:text-vaks-light-alt-txt dark:placeholder:text-vaks-dark-alt-txt
                            focus:outline-none focus:border-vaks-light-purple-button dark:focus:border-vaks-dark-purple-button"
                        />
                      </div>

                      <AnimatePresence>
                        {sent && (
                          <motion.p
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-xs text-green-500 font-medium"
                          >
                            {gm.invite.success}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <button
                        onClick={handleSendInvite}
                        disabled={!inviteEmail}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
                          bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white
                          hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                        {gm.invite.sendButton}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt text-center py-6">
                      {gm.invite.notAllowed}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}