/**
 * Página: Detalhe da Vaquinha Privada
 * Exibe informações detalhadas de uma vaquinha privada específica
 * Mostra progresso, histórico de doações e permite contribuições
 * Suporta gestão de membros e convites
 */

'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trash2, Edit3, Users, Mail, Crown, Shield, UserX, AlertCircle } from 'lucide-react';
import { useVaquinhaDetalhe } from '@/hooks/vaquinhas';
import { api, ApiClient } from '@/utils/api/api';
import { EditarVaquinhaModal, VaquinhaDetalhe, ContribuicaoForm, HistoricoContribuicoes, MemberSearch } from '@/components/vaquinhas';
import { useI18n } from '@/locales';
import { VaquinhaNaoEncontrada } from '@/components/vaquinhas/vaquinha-nao-encontrada';
import { PageTransition } from '@/components';
import { toast } from '@/utils/toast';
import { useCampaignMembers } from '@/hooks/campaigns/useCampaigns';
import { CampaignMember } from '@/types/campaigns';

export default function VaquinhaPrivadaPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter();
  const { id } = use(params);
  const { vaquinha, contribuicoes, loading, error, refetch, addOptimisticContribution } = useVaquinhaDetalhe(id);
  const { t } = useI18n();
  const gm = t.gerirMembros;
  const { members, loading: loadingMembers, promote, remove, refetch: refetchMembers } = useCampaignMembers(id);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [selectedMemberForAction, setSelectedMemberForAction] = useState<CampaignMember | null>(null);
  const [actionInProgress, setActionInProgress] = useState<{ userId: string; action: string } | null>(null);

  // Extrair user ID do token JWT
  const getUserIdFromToken = (): string | null => {
    try {
      const token = ApiClient.getToken();
      if (!token) return null;

      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const decoded = JSON.parse(atob(parts[1]));
      return decoded.sub || decoded.userId || decoded.id || null;
    } catch (e) {
      return null;
    }
  };

  const currentUserId = getUserIdFromToken();
  const isOwner = vaquinha && currentUserId && currentUserId === vaquinha.criador.id;
  
  // Verificar se sou um admin (SUDO) - mas não sou o criador
  const currentUserMember = members.find(m => m.userId === currentUserId);
  const isAdmin = !isOwner && currentUserMember?.role === 'SUDO';

  // Verificar se o membro é o criador da vaquinha
  const isMemberTheOwner = (memberId: string) => memberId === vaquinha?.criador.id;
  
  // Verificar se posso executar ações sobre um membro
  const canManageMember = (memberId: string) => {
    // Não posso mexer comigo mesmo
    if (currentUserId === memberId) return false;
    // Não posso mexer com o criador (nem como owner, mas owner já pode tudo)
    if (!isOwner && isMemberTheOwner(memberId)) return false;
    // Só owner ou admin podem gerenciar
    return isOwner || isAdmin;
  };

  // Carregar membros quando modal abre
  useEffect(() => {
    if (showMembersModal) {
      refetchMembers();
    }
  }, [showMembersModal, refetchMembers]);

  const handlePromoteToAdmin = async (member: CampaignMember) => {
    // Verificar permissões
    if (!canManageMember(member.userId)) {
      toast.error('Permissão negada', 'Você não tem permissão para promover este membro');
      return;
    }

    setActionInProgress({ userId: member.userId, action: 'promote' });

    try {
      await promote(member.userId);
      toast.success(gm.promoteSuccess);
      await refetchMembers();
    } catch (err: any) {
      toast.error(gm.promoteError, err?.message || t.common.try_again);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemoveAdmin = async (member: CampaignMember) => {
    // Verificar permissões
    if (!canManageMember(member.userId)) {
      toast.error('Permissão negada', 'Você não tem permissão para remover este admin');
      return;
    }

    setActionInProgress({ userId: member.userId, action: 'removeAdmin' });

    try {
      await remove(member.userId);
      toast.success(gm.removeAdminSuccess);
      await refetchMembers();
    } catch (err: any) {
      toast.error(gm.removeAdminError, err?.message || t.common.try_again);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemoveMember = async (member: CampaignMember) => {
    // Verificar permissões
    if (!canManageMember(member.userId)) {
      toast.error('Permissão negada', 'Você não tem permissão para remover este membro');
      return;
    }

    setActionInProgress({ userId: member.userId, action: 'remove' });

    try {
      await remove(member.userId);
      toast.success(gm.removeMemberSuccess);
      await refetchMembers();
    } catch (err: any) {
      toast.error(gm.removeMemberError, err?.message || t.common.try_again);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeletingLoading(true);
      await api.delete(`/campaigns/${id}`);
      toast.success(t.alerts.campaign_deleted_success);
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (err: any) {
      toast.error(t.alerts.error_deleting_campaign, err?.message || err?.error || t.common.try_again);
      setIsDeletingLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary flex items-center justify-center">
        <p>{t.vaquinhas.detalhe.carregando}</p>
      </div>
    );
  }

  if (error || !vaquinha) {
    return (
      <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary flex items-center justify-center">
        <VaquinhaNaoEncontrada />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary">
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          {/* Header com botões */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:text-purple-600 transition-colors font-semibold"
            >
              <ChevronLeft className="w-5 h-5" />
              {t.paginas.voltar}
            </button>

            {(isOwner || isAdmin) && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMembersModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-semibold text-sm"
                  title={t.titles.manage_members}
                >
                  <Users className="w-4 h-4" />
                  {t.gerirMembros.tabs.members}
                </button>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-semibold text-sm"
                  title={t.titles.invite}
                >
                  <Mail className="w-4 h-4" />
                  {t.titles.invite}
                </button>
                {isOwner && (
                  <>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-semibold text-sm"
                    >
                      <Edit3 className="w-4 h-4" />
                      {t.common.edit}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeletingLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white rounded-lg transition-colors font-semibold text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isDeletingLoading ? t.buttons.deleting : t.common.delete}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <VaquinhaDetalhe vaquinha={vaquinha} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Formulário de contribuição */}
            <div className="lg:col-span-2">
              <ContribuicaoForm
                vaquinhaId={id}
                onSuccess={({ newAmount, contribution }) => {
                  addOptimisticContribution({
                    valor: contribution.valor,
                    mensagem: contribution.mensagem,
                    anonimo: contribution.anonimo,
                    newAmount,
                  });
                  refetch?.();
                }}
              />
            </div>

            {/* Histórico de contribuições */}
            <div>
              <HistoricoContribuicoes contribuicoes={contribuicoes || []} />
            </div>
          </div>
        </div>

        {/* Modal de Edição */}
        {showEditModal && (
          <EditarVaquinhaModal
            id={id}
            titulo={vaquinha.titulo}
            descricao={vaquinha.descricao}
            meta={vaquinha.meta}
            deadline={null}
            onSuccess={() => {
              setShowEditModal(false);
              window.location.reload();
            }}
            onClose={() => setShowEditModal(false)}
          />
        )}

        {/* Modal de Confirmação de Delete */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t.headings.delete_private_campaign_question}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {t.messages.confirm_delete_private_campaign}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeletingLoading}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-900 dark:text-white font-semibold disabled:opacity-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeletingLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded font-semibold disabled:opacity-50"
                >
                  {isDeletingLoading ? t.buttons.deleting : t.common.delete}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Membros */}
        {showMembersModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {gm.titulo}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {gm.memberCount.replace('{count}', members.length.toString())}
                </p>
              </div>

              <div className="p-6">
                {loadingMembers ? (
                  <p className="text-center text-gray-600 dark:text-gray-300">{t.messages.loading_members}</p>
                ) : members.length === 0 ? (
                  <p className="text-center text-gray-600 dark:text-gray-300">{gm.noMembers}</p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {member.username}
                                {currentUserId === member.userId && (
                                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                    {gm.me}
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                  member.role === 'SUDO'
                                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                    : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                }`}>
                                  {member.role === 'SUDO' && <Shield className="w-3 h-3" />}
                                  {gm.roles[member.role as keyof typeof gm.roles] || member.role}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {(isOwner || isAdmin) && currentUserId !== member.userId && !isMemberTheOwner(member.userId) && (
                          <div className="flex items-center gap-2">
                            {member.role !== 'SUDO' ? (
                              <button
                                onClick={() => handlePromoteToAdmin(member)}
                                disabled={actionInProgress?.userId === member.userId}
                                className="flex items-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-lg text-sm font-medium transition-colors"
                                title={gm.promoteAdmin}
                              >
                                <Shield className="w-4 h-4" />
                                {gm.promoteAdmin}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRemoveAdmin(member)}
                                disabled={actionInProgress?.userId === member.userId}
                                className="flex items-center gap-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white rounded-lg text-sm font-medium transition-colors"
                                title={gm.removeAdmin}
                              >
                                <AlertCircle className="w-4 h-4" />
                                {gm.removeAdmin}
                              </button>
                            )}

                            <button
                              onClick={() => handleRemoveMember(member)}
                              disabled={actionInProgress?.userId === member.userId}
                              className="flex items-center gap-2 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg text-sm font-medium transition-colors"
                              title={gm.removeMember}
                            >
                              <UserX className="w-4 h-4" />
                              {gm.removeMember}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 p-6 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowMembersModal(false);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded text-gray-900 dark:text-white font-semibold transition-colors"
                >
                  {t.common.close}
                </button>
                {(isOwner || isAdmin) && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white font-semibold transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {gm.tabs.invite}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Convite */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {gm.tabs.invite}
              </h2>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {gm.invite.description}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  {gm.invite.emailLabel}
                </label>
                <MemberSearch
                  onMemberSelected={async (member) => {
                    try {
                      setIsInviting(true);
                      if (member.id) {
                        await api.post(`/campaigns/${id}/invite`, { userId: member.id });
                      } else if (member.email) {
                        await api.post(`/campaigns/${id}/invite`, { email: member.email });
                      } else {
                        throw new Error('Provide userId or email');
                      }
                      toast.success(gm.invite.success);
                      setShowInviteModal(false);
                      await refetchMembers();
                    } catch (err: any) {
                      toast.error(t.alerts.error_sending_invite, err?.message || t.common.try_again);
                    } finally {
                      setIsInviting(false);
                    }
                  }}
                  existingMembers={members.map(m => m.username)}
                  placeholder={gm.invite.emailPlaceholder}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                  }}
                  disabled={isInviting}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 rounded text-gray-900 dark:text-white font-semibold transition-colors"
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageTransition>
    </div>
  );
}
