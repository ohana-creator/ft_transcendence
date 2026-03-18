'use client';

import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Users, Lock, Settings, Award, Send, Mail,
  Clock, Target, Edit, Share2
} from 'lucide-react';
import { useState } from 'react';
import { GerirConfiguracoesModal } from '@/components/GerirConfiguracoesModal';
import { GerirConvitesModal } from '@/components/GerirConvitesModal';
import { GerirMembrosModal } from '@/components/GerirMembrosModal';
import { PageTransition } from '@/components';
import { useI18n } from '@/locales';

export default function VaquinhaDetalhePrivadaPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const { t } = useI18n();
  const pv = t.vaquinhas.privada;

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInvitesModal, setShowInvitesModal] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionMessage, setContributionMessage] = useState('');

  // Dados mockados - substituir por chamada real
  const vaquinha = {
    id: parseInt(campaignId),
    title: 'Viagem em grupo para Zanzibar',
    description: 'Vamos poupar juntos para uma viagem inesquecível!',
    isPrivate: true,
    goalAmount: 5000.00,
    currentAmount: 3200.00,
    goalVisible: true,
    deadline: '2024-06-30T23:59:59Z',
    ownerId: 1,
    ownerUsername: 'joao',
    status: 'ACTIVE',
    memberCount: 8,
    contributionCount: 24,
    role: 'OWNER' as const
  };

  const members = [
    { id: 1, userId: 1, username: 'joao', avatarUrl: null, role: 'SUDO' as const, joinedAt: '2024-01-10T12:00:00Z' },
    { id: 2, userId: 3, username: 'carla', avatarUrl: null, role: 'VAKER' as const, joinedAt: '2024-01-12T14:30:00Z' }
  ];

  const invites = [
    { id: 1, invitedEmail: 'pedro@example.com', inviterName: 'joao', status: 'PENDING' as const, createdAt: '2024-01-15T10:00:00Z' }
  ];

  const progressPercentage = (vaquinha.currentAmount / vaquinha.goalAmount) * 100;

  return (
    <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary">
      <PageTransition>

        {/* Header */}
        <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card border-b border-gray-100 dark:border-gray-900">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <button
              onClick={() => router.push('/vaquinhas/privadas')}
              className="flex items-center gap-2 text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.vaquinhas.convite.voltar}
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{vaquinha.title}</h1>
                <p className="text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt mt-2">{pv.criada_por} <span className="font-semibold">{vaquinha.ownerUsername}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMembersModal(true)}
                  className="p-2 text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Gerir membros"
                >
                  <Users className="w-5 h-5" />
                </button>
                <button
                  onClick={handleShowInvites}
                  className="p-2 text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title={pv.convites}
                >
                  <Mail className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2 text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title={pv.configuracoes}
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-6">
            {/* Descrição */}
            <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card  rounded-lg border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover p-6">
              <p className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{vaquinha.description}</p>
            </div>

            {/* Progresso */}
            <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card  rounded-lg border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{pv.progresso}</h3>
                <span className="text-sm font-bold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
                <div
                  className="bg-gradient-to-r from-vaks-primary to-vaks-secondary h-4 rounded-full transition-all"
                  style={{ width: `${Math.min(100, progressPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                <span>{vaquinha.currentAmount.toFixed(2)} {pv.vaks_arrecadados}</span>
                <span>{vaquinha.goalAmount.toFixed(2)} {pv.vaks_objetivo}</span>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card  rounded-lg border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover p-4">
                <div className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-1">{pv.membros}</div>
                <div className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{vaquinha.memberCount}</div>
              </div>
              <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card  rounded-lg border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover p-4">
                <div className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-1">{pv.contribuicoes}</div>
                <div className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{vaquinha.contributionCount}</div>
              </div>
              <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card  rounded-lg border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover p-4">
                <div className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-1">Status</div>
                <div className="text-sm font-bold text-emerald-600">{pv.ativo}</div>
              </div>
            </div>

            {/* Regras Internas */}
            <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card  rounded-lg border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover p-6">
              <h3 className="text-lg font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-4">{pv.regras_internas}</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-vaks-light-main-txt dark:text-vaks-dark-main-txt flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{pv.objetivo} {vaquinha.goalVisible ? `(${pv.objetivo_visivel})` : `(${pv.objetivo_oculto})`}</p>
                    <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{vaquinha.goalAmount.toFixed(2)} VAKS</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-vaks-light-main-txt dark:text-vaks-dark-main-txt flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{pv.data_limite}</p>
                    <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{new Date(vaquinha.deadline).toLocaleDateString('pt-AO')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-vaks-light-main-txt dark:text-vaks-dark-main-txt flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{pv.minimo_contribuicao}</p>
                    <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{pv.nao_definido}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contribuir */}
            <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-lg p-6 text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
              <h3 className="text-lg font-bold mb-4">{pv.contribuir_titulo}</h3>
              <div className="space-y-3">
                <input
                  type="number"
                  placeholder={pv.valor_vaks}
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 bg-vaks-light-input dark:bg-vaks-dark-input border border-vaks-light-stroke dark:border-vaks-dark-stroke rounded-lg text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt placeholder:text-vaks-light-alt-txt/60 dark:placeholder:text-vaks-dark-alt-txt/60 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <textarea
                  placeholder={pv.mensagem_opcional}
                  value={contributionMessage}
                  onChange={(e) => setContributionMessage(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-vaks-light-input dark:bg-vaks-dark-input border border-vaks-light-stroke dark:border-vaks-dark-stroke rounded-lg text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt placeholder:text-vaks-light-alt-txt/60 dark:placeholder:text-vaks-dark-alt-txt/60 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-vaks-primary rounded-lg font-semibold hover:bg-purple-900 transition-colors">
                  <Send className="w-4 h-4" />
                  {pv.contribuir_agora}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <GerirMembrosModal
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          members={members}
          memberCount={vaquinha.memberCount}
          currentUserId={1} // substituir pelo ID real do utilizador logado
          currentUserRole={vaquinha.role === 'OWNER' ? 'SUDO' : 'VAKER'}
          onPromoteMember={(userId) => console.log('Promover:', userId)}
          onRemoveMember={(userId) => console.log('Remover:', userId)}
          onSendInvite={(email) => console.log('Convite para:', email)}
        />

        <GerirConfiguracoesModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          settings={{
            title: vaquinha.title,
            description: vaquinha.description,
            goalAmount: vaquinha.goalAmount,
            goalVisible: vaquinha.goalVisible,
            minContribution: 0,
            deadline: vaquinha.deadline
          }}
          onSave={(settings) => console.log('Guardar:', settings)}
          canEdit={vaquinha.role === 'OWNER'}
        />

        <GerirConvitesModal
          isOpen={showInvitesModal}
          onClose={() => setShowInvitesModal(false)}
          campaignId={vaquinha.id}
          invites={invites}
          onSendInvite={(email) => console.log('Enviar convite:', email)}
          onCancelInvite={(inviteId) => console.log('Cancelar convite:', inviteId)}
        />
      </PageTransition>
    </div>
  );
}

// Funções que faltavam
function handleShowMembers() {
  // Implementar
}

function handleShowInvites() {
  // Implementar
}