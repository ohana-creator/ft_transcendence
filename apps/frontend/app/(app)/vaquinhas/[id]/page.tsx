/**
 * Página: Detalhe da Vaquinha
 * Exibe informações detalhadas de uma vaquinha específica
 * Mostra progresso, histórico de doações e permite contribuições
 * Suporta vaquinhas públicas e privadas
 */

'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trash2, Edit3, Users, Mail, X } from 'lucide-react';
import { useVaquinhaDetalhe } from '@/hooks/vaquinhas';
import { api, ApiClient } from '@/utils/api/api';
import { listMembers, removeMember, sendInvite } from '@/utils/campaigns';
import type { CampaignMember } from '@/types/campaigns';
import { EditarVaquinhaModal, VaquinhaDetalhe, ContribuicaoForm, HistoricoContribuicoes } from '@/components/vaquinhas';
import { useI18n } from '@/locales';
import { VaquinhaNaoEncontrada } from '@/components/vaquinhas/vaquinha-nao-encontrada';
import { PageTransition } from '@/components';
import { toast } from '@/utils/toast';

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}

export default function VaquinhaPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter();
  const { id } = use(params);
  const { vaquinha, contribuicoes, loading, error, refetch, addOptimisticContribution } = useVaquinhaDetalhe(id);
  const { t } = useI18n();
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [redirectingToPrivate, setRedirectingToPrivate] = useState(false);

  // Extrair user ID do token JWT
  const getUserIdFromToken = (): string | null => {
    try {
      const token = ApiClient.getToken();
      if (!token) return null;

      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const decoded = JSON.parse(atob(parts[1]));
      return decoded.sub || decoded.userId || decoded.id || null;
    } catch {
      return null;
    }
  };

  const currentUserId = getUserIdFromToken();
  const isOwner = vaquinha && currentUserId && currentUserId === vaquinha.criador.id;

  const loadMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const response = await listMembers(id, { page: 1, limit: 100 });
      setMembers(Array.isArray(response.members) ? response.members : []);
    } catch (err: unknown) {
      toast.error(t.campaign_detail.error_loading_members, getErrorMessage(err, t.campaign_detail.error_loading_members_desc));
      setMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleOpenMembersModal = async () => {
    setShowMembersModal(true);
    await loadMembers();
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error(t.errors.email_required, t.errors.enter_valid_email_invite);
      return;
    }

    try {
      setIsInviting(true);
      await sendInvite(id, { email: inviteEmail.trim() });
      toast.success(t.campaign_detail.invite_sent, t.campaign_detail.invite_sent_desc.replace('{{email}}', inviteEmail.trim()));
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (err: unknown) {
      toast.error(t.campaign_detail.error_inviting, getErrorMessage(err, t.campaign_detail.error_inviting_desc));
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (member: CampaignMember) => {
    if (!isOwner) return;

    try {
      await removeMember(id, member.userId);
      toast.success(t.campaign_detail.member_removed, t.campaign_detail.member_removed_desc.replace('{{username}}', member.username));
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
    } catch (err: unknown) {
      toast.error(t.campaign_detail.error_removing_member, getErrorMessage(err, t.campaign_detail.error_removing_member_desc));
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeletingLoading(true);
      
      await api.delete(`/campaigns/${id}`);
      
      toast.success(t.campaign_detail.campaign_deleted, t.campaign_detail.campaign_deleted_desc);
      
      setTimeout(() => {
        router.push('/vaquinhas');
      }, 1500);
    } catch (err: unknown) {
      toast.error(t.campaign_detail.error_deleting, getErrorMessage(err, t.campaign_detail.error_deleting_desc));
      toast.error('Erro ao eliminar', getErrorMessage(err, 'Não foi possível eliminar a vaquinha'));
      setIsDeletingLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    if (loading || vaquinha || redirectingToPrivate) return;
    if (!error) return;

    // Se for erro de autenticação, redirecionar para login
    if (error === 'unauthorized') {
      router.replace('/login');
      return;
    }

    setRedirectingToPrivate(true);
    router.replace(`/vaquinhas/privadas/${id}`);
  }, [loading, vaquinha, error, redirectingToPrivate, router, id]);

  if (loading || redirectingToPrivate) {
    return (
      <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary flex items-center justify-center">
        <p>{t.vaquinhas.detalhe.carregando}</p>
      </div>
    );
  }

  // Se for erro de autenticação, mostramos carregando enquanto redireciona
  if (error === 'unauthorized') {
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
              {t.campaign_detail.back}
            </button>

            {isOwner && (
              <div className="flex gap-3">
                {!vaquinha.publica && (
                  <>
                    <button
                      onClick={handleOpenMembersModal}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors font-semibold text-sm"
                    >
                      <Users className="w-4 h-4" />
                      {t.campaign_detail.members}
                    </button>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-semibold text-sm"
                    >
                      <Mail className="w-4 h-4" />
                      {t.campaign_detail.invite}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-semibold text-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  {t.campaign_detail.edit}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeletingLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white rounded-lg transition-colors font-semibold text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeletingLoading ? t.campaign_detail.deleting : t.campaign_detail.delete}
                </button>
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

                  // Evita sobrescrever a atualização otimista com dados ainda não propagados no backend.
                  setTimeout(() => {
                    refetch?.();
                  }, 1500);
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
              // TODO: Refresh da página ou refetch dos dados
              window.location.reload();
            }}
            onClose={() => setShowEditModal(false)}
          />
        )}

        {/* Modal de Confirmação de Delete */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t.headings.delete_campaign_question}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {t.messages.confirm_delete_campaign}
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
                  {isDeletingLoading ? t.campaign_detail.deleting : t.campaign_detail.delete}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Membros */}
        {showMembersModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.headings.campaign_members}</h2>
                <button
                  onClick={() => setShowMembersModal(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </button>
              </div>

              {isLoadingMembers ? (
                <p className="text-gray-600 dark:text-gray-300">{t.messages.loading_members}</p>
              ) : members.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">{t.messages.no_members_found}</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{member.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{member.role}</p>
                      </div>

                      {member.userId !== vaquinha.criador.id && (
                        <button
                          onClick={() => handleRemoveMember(member)}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-semibold"
                        >
                          {t.campaign_detail.remove}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Convite */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t.headings.invite_member}</h2>

              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {t.labels.invited_email}
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t.placeholders.example_email}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />

              <div className="flex gap-3 justify-end mt-5">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                  }}
                  disabled={isInviting}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-900 dark:text-white font-semibold disabled:opacity-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleInviteMember}
                  disabled={isInviting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded font-semibold disabled:opacity-50"
                >
                  {isInviting ? t.buttons.sending : t.buttons.send_invite}
                </button>
              </div>
            </div>
          </div>
        )}
      </PageTransition>
    </div>
  );
}