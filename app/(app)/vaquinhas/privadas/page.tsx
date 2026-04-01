'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Lock, Settings, Award, Send, Trash2, ShieldPlus,
  ChevronRight, ChevronLeft, Plus, Filter, Search, Clock, Target, Eye, EyeOff, Mail, LayoutGrid
} from 'lucide-react';
import { CardCarousel } from '@/components/ui/card-carousel';
import { GerirConfiguracoesModal } from '@/components/GerirConfiguracoesModal';
import { GerirConvitesModal } from '@/components/GerirConvitesModal';
import { GerirMembrosModal } from '@/components/GerirMembrosModal';
import { useI18n } from '@/locales';
import { useAllVaquinhas } from '@/hooks/vaquinhas/useVaquinhas';
import { toast } from '@/utils/toast';

type MemberRole = 'SUDO' | 'OWNER' | 'VAKER';

interface Vaquinha {
  id: number;
  title: string;
  description: string;
  isPrivate: boolean;
  goalAmount: number;
  currentAmount: number;
  goalVisible: boolean;
  deadline: string;
  ownerId: number;
  ownerUsername: string;
  status: string;
  memberCount: number;
  contributionCount: number;
  role: MemberRole;
}

interface Member {
  id: number;
  userId: number;
  username: string;
  avatarUrl: string | null;
  role: MemberRole;
  joinedAt: string;
}

interface Invite {
  id: number;
  invitedEmail: string;
  inviterName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
}

export default function VaquinhasPrivadasPage() {
  const router = useRouter();
  const { t } = useI18n();
  const pv = t.vaquinhas.privada;

  const { vaquinhas, loading } = useAllVaquinhas(true); // true = isPrivate

  const [selectedVaquinha, setSelectedVaquinha] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionMessage, setContributionMessage] = useState('');

  // Modals state
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInvitesModal, setShowInvitesModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [loadingContribution, setLoadingContribution] = useState(false);
  const [viewModePrivada, setViewModePrivada] = useState<'carousel' | 'grid'>('carousel');

  const mockMembers: Member[] = [
    {
      id: 1,
      userId: 1,
      username: 'joao',
      avatarUrl: 'https://api.example.com/avatars/joao.jpg',
      role: 'SUDO',
      joinedAt: '2024-01-10T12:00:00Z'
    },
    {
      id: 2,
      userId: 3,
      username: 'carla',
      avatarUrl: null,
      role: 'VAKER',
      joinedAt: '2024-01-12T14:30:00Z'
    }
  ];

  const mockInvites: Invite[] = [
    {
      id: 1,
      invitedEmail: 'pedro@example.com',
      inviterName: 'joao',
      status: 'PENDING',
      createdAt: '2024-01-15T10:00:00Z'
    }
  ];

  const handleSelectVaquinha = (vaq: any) => {
    router.push(`/vaquinhas/privadas/${vaq.id}`);
  };

  const handleShowMembers = () => {
    setMembers(mockMembers);
    setShowMembersModal(true);
  };

  const handleShowInvites = () => {
    setInvites(mockInvites);
    setShowInvitesModal(true);
  };

  const handlePromoteMember = (userId: number) => {
    // TODO: Integrar com API
    toast.success(t.alerts.member_promoted_admin);
  };

  const handleRemoveMember = (userId: number) => {
    // TODO: Integrar com API
    toast.success(t.alerts.member_removed);
    setMembers(prev => prev.filter(m => m.userId !== userId));
  };

  const handleSendInvite = (email: string) => {
    // TODO: Integrar com API
    toast.success(t.alerts.invite_sent.replace('{{email}}', email));
  };

  const handleSaveSettings = (settings: any) => {
    // TODO: Integrar com API
    toast.success(t.alerts.settings_saved);
  };

  const handleContribute = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      toast.error(t.alerts.please_enter_valid_value);
      return;
    }

    setLoadingContribution(true);
    try {
      // TODO: Integrar com API
      alert(`Contribuição de ${contributionAmount} VAKS enviada!`);
      setContributionAmount('');
      setContributionMessage('');
    } finally {
      setLoadingContribution(false);
    }
  };

  const progressPercentage = selectedVaquinha
    ? (selectedVaquinha.goalAmount > 0
        ? (selectedVaquinha.currentAmount / selectedVaquinha.goalAmount) * 100
        : 0)
    : 0;

  const cardImages = [
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=600&h=400&fit=crop',
  ];

  const cardGradients = [
    'from-violet-700 via-violet-600 to-violet-500',
    'from-violet-600 via-violet-500 to-violet-400',
  ];

  const avatarColors = [
    'bg-yellow-400', 'bg-pink-400', 'bg-teal-400', 'bg-indigo-400', 'bg-orange-400',
    'bg-emerald-400', 'bg-rose-400', 'bg-cyan-400',
  ];

  // Calcular stats reais baseado nas vaquinhas
  const totalArrecadado = vaquinhas.reduce((acc, v) => acc + v.arrecadado, 0);
  const campanhasAtivas = vaquinhas.filter(v => v.diasRestantes > 0).length;
  const totalContribuidores = new Set(vaquinhas.flatMap(v => v.contribuidores)).size;

  return (
    <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary">
      {/* Hero Banner — vibrante e acolhedor */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/assets/assets4.jpg"
            alt="Amigos juntos"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 via-purple-800/70 to-pink-700/60" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              {pv.hero_titulo}
            </h1>
            <p className="text-lg text-white/85 mb-8 leading-relaxed">
              {pv.hero_descricao}
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push('/vaquinhas/privadas/criar')}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-purple-700 rounded-2xl font-bold hover:bg-gray-50 transition-all duration-300 hover:shadow-xl hover:scale-105 text-sm"
              >
                <Plus className="w-5 h-5" />
                {t.vaquinhas.hub.criar_nova}
              </button>
              <button className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 backdrop-blur-sm border border-white/30 text-white rounded-2xl font-bold hover:bg-white/20 transition-all duration-300 text-sm">
                <ChevronRight className="w-5 h-5" />
                {pv.saiba_mais}
              </button>
            </div>
          </div>
          {/* Avatares flutuantes */}
          <div className="hidden md:flex items-center gap-3 absolute bottom-8 right-8">
            <div className="flex -space-x-3">
              {avatarColors.slice(0, 5).map((color, i) => (
                <div key={i} className={`w-10 h-10 rounded-full ${color} border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                  {['J', 'M', 'C', 'A', 'P'][i]}
                </div>
              ))}
            </div>
            <span className="text-white/80 text-sm font-medium">+13 {pv.membros_ativos}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
        {/* Stats Cards — coloridos e arredondados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          <div className="group bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-700 via-violet-600 to-violet-500 flex items-center justify-center shadow-lg shadow-violet-300 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full">+12%</span>
            </div>
            <p className="text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-1">{pv.total_campanhas}</p>
            <p className="text-3xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{totalArrecadado.toLocaleString('pt-AO', { maximumFractionDigits: 0 })} <span className="text-base font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">VAKS</span></p>
          </div>

          <div className="group bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-700 via-violet-600 to-violet-500 flex items-center justify-center shadow-lg shadow-violet-300 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse delay-100"></span>
              </div>
            </div>
            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-1">{pv.campanhas_ativas}</p>
            <p className="text-3xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{campanhasAtivas} <span className="text-base font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{pv.em_progresso}</span></p>
          </div>

          <div className="group bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-700 via-violet-600 to-violet-500 flex items-center justify-center shadow-lg shadow-violet-300 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex -space-x-2">
                {avatarColors.slice(0, 4).map((color, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full ${color} border-2 border-white text-white text-[10px] font-bold flex items-center justify-center`}>
                    {['J', 'M', 'C', 'A'][i]}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-1">{pv.membros_ativo}</p>
            <p className="text-3xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{totalContribuidores} <span className="text-base font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{pv.participantes}</span></p>
          </div>
        </div>

        {/* Search & Filter — mais suave */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-vaks-light-main-txt dark:text-vaks-dark-main-txt" />
              <input
                type="text"
                placeholder={pv.buscar_campanhas}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-vaks-light-input dark:bg-vaks-dark-input border border-vaks-light-stroke dark:border-vaks-dark-stroke text-vaks-light-main-txt dark:text-vaks-dark-main-txt rounded-2xl text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
          <button className="flex items-center gap-2 px-5 py-3.5 bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-600 hover:border-purple-300 transition-all shadow-sm text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
            <Filter className="w-4 h-4" />
            {pv.filtros}
          </button>
        </div>

        {/* Section Title + View Toggle */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{pv.suas_campanhas}</h3>
            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1">{pv.acompanhe_progresso}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-bold text-purple-600 bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card px-4 py-1.5 rounded-full">
              {vaquinhas.length} {vaquinhas.length !== 1 ? pv.ativas : pv.ativa}
            </div>
            <button
              onClick={() => setViewModePrivada(v => v === 'carousel' ? 'grid' : 'carousel')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover hover:border-purple-300 rounded-xl text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:text-purple-700 transition-all shadow-sm hover:shadow-md"
            >
              {viewModePrivada === 'carousel' ? (
                <><LayoutGrid className="w-4 h-4" /> {t.vaquinhas.hub.ver_tudo}</>
              ) : (
                <><ChevronLeft className="w-4 h-4" /> {t.vaquinhas.hub.ver_menos}</>
              )}
            </button>
          </div>
        </div>

        {/* Campanhas Privadas — Carrossel ou Grade */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
            <p className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt text-sm">{pv.carregando}</p>
          </div>
        ) : vaquinhas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Lock className="w-16 h-16 text-gray-300" />
            <p className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt text-sm">{pv.nenhuma_encontrada}</p>
            <button
              onClick={() => router.push('/vaquinhas/privadas/criar')}
              className="text-purple-600 hover:text-purple-500 font-semibold transition-colors"
            >
              {pv.criar_primeira}
            </button>
          </div>
        ) : viewModePrivada === 'carousel' ? (
          <CardCarousel>
            {vaquinhas.map((vaquinha, index) => {
              const progressPercentage = vaquinha.meta > 0 ? (vaquinha.arrecadado / vaquinha.meta) * 100 : 0;
              return (
                <button
                  key={vaquinha.id}
                  onClick={() => handleSelectVaquinha(vaquinha)}
                  className="flex-shrink-0 w-[280px] sm:w-[340px] group bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-400 text-left border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover hover:-translate-y-1"
                >
                  {/* Card Image Header */}
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={vaquinha.imagem}
                      alt={vaquinha.nome}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t from-violet-700 via-violet-600 to-violet-500 opacity-40 mix-blend-multiply`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 shadow-sm">{pv.privada_badge}</span>
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm">
                        <span className="text-sm font-extrabold text-purple-700">{Math.round(progressPercentage)}%</span>
                      </div>
                    </div>
                  </div>
                  {/* Card Body */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-1 line-clamp-2 group-hover:text-purple-700 transition-colors">{vaquinha.nome}</h3>
                    <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-4 line-clamp-2">{vaquinha.descricao}</p>
                    <div className="mb-4">
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-700 via-violet-600 to-violet-500 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, progressPercentage)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-0.5">{t.vaquinhas.arrecadado}</p>
                        <p className="text-base font-extrabold text-purple-600">{vaquinha.arrecadado.toFixed(0)} VAKS</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-0.5">{pv.objetivo}</p>
                        <p className="text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{vaquinha.meta.toFixed(0)} VAKS</p>
                      </div>
                    </div>
                  </div>
                  {/* Card Footer */}
                  <div className="px-5 py-3.5 bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card border-t border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover flex items-center gap-2 transition-colors">
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300 flex-1">{pv.ver_detalhes}</span>
                    <ChevronRight className="w-4 h-4 text-purple-500 dark:text-purple-100 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </CardCarousel>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {vaquinhas.map((vaquinha, index) => {
            const progressPercentage = vaquinha.meta > 0 ? (vaquinha.arrecadado / vaquinha.meta) * 100 : 0;
            return (
              <button
                key={vaquinha.id}
                onClick={() => handleSelectVaquinha(vaquinha)}
                className="group bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-400 text-left border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover hover:-translate-y-1"
              >
                {/* Card Image Header */}
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={vaquinha.imagem}
                    alt={vaquinha.nome}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-violet-700 via-violet-600 to-violet-500 opacity-40 mix-blend-multiply" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                  {/* Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 shadow-sm">
                      {pv.privada_badge}
                    </span>
                  </div>

                  {/* Percentage badge */}
                  <div className="absolute bottom-4 right-4">
                    <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm">
                      <span className="text-sm font-extrabold text-purple-700">{Math.round(progressPercentage)}%</span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-1 line-clamp-2 group-hover:text-purple-700 transition-colors">
                    {vaquinha.nome}
                  </h3>
                  <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-4 line-clamp-2">{vaquinha.descricao}</p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-700 via-violet-600 to-violet-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, progressPercentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-0.5">{t.vaquinhas.arrecadado}</p>
                      <p className="text-base font-extrabold text-purple-600">{vaquinha.arrecadado.toFixed(0)} VAKS</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-0.5">{pv.objetivo}</p>
                      <p className="text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{vaquinha.meta.toFixed(0)} VAKS</p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3.5 bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card border-t border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover flex items-center gap-2 group-hover:from-purple-100 group-hover:to-pink-100 transition-colors">
                  <span className="text-sm font-bold text-purple-700 dark:text-purple-300 flex-1">{pv.ver_detalhes}</span>
                  <ChevronRight className="w-4 h-4 text-purple-500 dark:text-purple-100 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}

          {/* Card "Criar Nova" — convite visual */}
          <button
            onClick={() => router.push('/vaquinhas/privadas/criar')}
            className="group rounded-3xl border-2 border-dashed border-violet-200 hover:border-violet-400 bg-gradient-to-br from-violet-50/50 to-violet-100/50 hover:from-violet-50 hover:to-violet-100 flex flex-col items-center justify-center min-h-[380px] transition-all duration-300 hover:shadow-lg"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-700 via-violet-600 to-violet-500 flex items-center justify-center mb-4 shadow-lg shadow-violet-300 group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <p className="text-lg font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-1">{pv.criar_nova}</p>
            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{pv.comece_poupar}</p>
          </button>
        </div>
        )}
      {/* Modals */}
      </div>
    </div>
  );
}
