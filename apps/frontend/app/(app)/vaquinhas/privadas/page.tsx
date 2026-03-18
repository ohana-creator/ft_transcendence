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
  const [selectedVaquinha, setSelectedVaquinha] = useState<Vaquinha | null>(null);
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

  // Dados simulados para demonstração
  const mockVaquinhas: Vaquinha[] = [
    {
      id: 1,
      title: 'Viagem em grupo para Zanzibar',
      description: 'Vamos poupar juntos para uma viagem inesquecível! Sol, praia e muita diversão.',
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
      role: 'OWNER'
    },
    {
      id: 2,
      title: 'Fundo para emergências',
      description: 'Poupança coletiva para situações urgentes. Juntos somos mais fortes!',
      isPrivate: true,
      goalAmount: 2000.00,
      currentAmount: 1500.00,
      goalVisible: false,
      deadline: '2024-12-31T23:59:59Z',
      ownerId: 2,
      ownerUsername: 'maria',
      status: 'ACTIVE',
      memberCount: 5,
      contributionCount: 12,
      role: 'SUDO'
    }
  ];

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

  const handleSelectVaquinha = (vaquinha: Vaquinha) => {
    router.push(`/vaquinhas/privadas/${vaquinha.id}`);
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
    console.log('Promover membro:', userId);
    alert('Membro promovido a admin!');
  };

  const handleRemoveMember = (userId: number) => {
    // TODO: Integrar com API
    console.log('Remover membro:', userId);
    alert('Membro removido!');
    setMembers(prev => prev.filter(m => m.userId !== userId));
  };

  const handleSendInvite = (email: string) => {
    // TODO: Integrar com API
    console.log('Enviar convite para:', email);
    alert(`Convite enviado para ${email}!`);
  };

  const handleSaveSettings = (settings: any) => {
    // TODO: Integrar com API
    console.log('Guardar configurações:', settings);
    alert('Configurações guardadas!');
  };

  const handleContribute = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      alert('Por favor, insira um valor válido');
      return;
    }

    setLoadingContribution(true);
    try {
      // TODO: Integrar com API
      console.log('Contribuir:', {
        amount: contributionAmount,
        message: contributionMessage
      });

      alert(`Contribuição de ${contributionAmount} VAKS enviada!`);
      setContributionAmount('');
      setContributionMessage('');
    } finally {
      setLoadingContribution(false);
    }
  };

  const progressPercentage = selectedVaquinha
    ? (selectedVaquinha.currentAmount / selectedVaquinha.goalAmount) * 100
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
            <p className="text-3xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">4,700 <span className="text-base font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">VAKS</span></p>
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
            <p className="text-3xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">2 <span className="text-base font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{pv.em_progresso}</span></p>
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
            <p className="text-3xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">13 <span className="text-base font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{pv.participantes}</span></p>
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
              {mockVaquinhas.length} {mockVaquinhas.length !== 1 ? pv.ativas : pv.ativa}
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
        {viewModePrivada === 'carousel' ? (
          <CardCarousel>
            {mockVaquinhas.map((vaquinha, index) => {
              const progressPercentage = (vaquinha.currentAmount / vaquinha.goalAmount) * 100;
              return (
                <button
                  key={vaquinha.id}
                  onClick={() => handleSelectVaquinha(vaquinha)}
                  className="flex-shrink-0 w-[340px] group bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-400 text-left border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover hover:-translate-y-1"
                >
                  {/* Card Image Header */}
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={cardImages[index % cardImages.length]}
                      alt={vaquinha.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${cardGradients[index % cardGradients.length]} opacity-40 mix-blend-multiply`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 shadow-sm">{pv.privada_badge}</span>
                    </div>
                    <div className="absolute bottom-4 left-4 flex -space-x-2">
                      {avatarColors.slice(0, Math.min(vaquinha.memberCount, 4)).map((color, i) => (
                        <div key={i} className={`w-8 h-8 rounded-full ${color} border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-md`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                      {vaquinha.memberCount > 4 && (
                        <div className="w-8 h-8 rounded-full bg-gray-800/80 backdrop-blur border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">
                          +{vaquinha.memberCount - 4}
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-4 right-4">
                      <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm">
                        <span className="text-sm font-extrabold text-purple-700">{Math.round(progressPercentage)}%</span>
                      </div>
                    </div>
                  </div>
                  {/* Card Body */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-1 line-clamp-2 group-hover:text-purple-700 transition-colors">{vaquinha.title}</h3>
                    <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-4 line-clamp-2">{vaquinha.description}</p>
                    <div className="mb-4">
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${cardGradients[index % cardGradients.length]} rounded-full transition-all duration-700`}
                          style={{ width: `${Math.min(100, progressPercentage)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-0.5">{t.vaquinhas.arrecadado}</p>
                        <p className="text-base font-extrabold text-purple-600">{vaquinha.currentAmount.toFixed(0)} VAKS</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-0.5">{pv.objetivo}</p>
                        <p className="text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{vaquinha.goalAmount.toFixed(0)} VAKS</p>
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
          {mockVaquinhas.map((vaquinha, index) => {
            const progressPercentage = (vaquinha.currentAmount / vaquinha.goalAmount) * 100;
            return (
              <button
                key={vaquinha.id}
                onClick={() => handleSelectVaquinha(vaquinha)}
                className="group bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-400 text-left border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover hover:-translate-y-1"
              >
                {/* Card Image Header */}
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={cardImages[index % cardImages.length]}
                    alt={vaquinha.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${cardGradients[index % cardGradients.length]} opacity-40 mix-blend-multiply`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  
                  {/* Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 shadow-sm">
                      {pv.privada_badge}
                    </span>
                  </div>

                  {/* Avatares no card */}
                  <div className="absolute bottom-4 left-4 flex -space-x-2">
                    {avatarColors.slice(0, Math.min(vaquinha.memberCount, 4)).map((color, i) => (
                      <div key={i} className={`w-8 h-8 rounded-full ${color} border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-md`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                    {vaquinha.memberCount > 4 && (
                      <div className="w-8 h-8 rounded-full bg-gray-800/80 backdrop-blur border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">
                        +{vaquinha.memberCount - 4}
                      </div>
                    )}
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
                    {vaquinha.title}
                  </h3>
                  <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-4 line-clamp-2">{vaquinha.description}</p>

                  {/* Progress Bar — mais colorida */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${cardGradients[index % cardGradients.length]} rounded-full transition-all duration-700`}
                        style={{ width: `${Math.min(100, progressPercentage)}%` }}
                      />
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-0.5">{t.vaquinhas.arrecadado}</p>
                      <p className="text-base font-extrabold text-purple-600">{vaquinha.currentAmount.toFixed(0)} VAKS</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-0.5">{pv.objetivo}</p>
                      <p className="text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{vaquinha.goalAmount.toFixed(0)} VAKS</p>
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

        {/* Modal de Detalhes - Flutuante */}
        {selectedVaquinha && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedVaquinha(null)} />
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
                  <div className="relative max-h-[90vh] overflow-y-auto">
                    {/* Close Button */}
                    <button
                      onClick={() => setSelectedVaquinha(null)}
                      className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    <div className="space-y-6 p-6">
                      {/* Header Card */}
                      <div className="bg-white rounded-lg border border-gray-100 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">{selectedVaquinha.title}</h2>
                          <p className="text-sm text-gray-500 mt-1">{pv.criada_por} <span className="font-semibold">{selectedVaquinha.ownerUsername}</span></p>
                        </div>
                        <div className="flex items-center gap-2">
                          {(selectedVaquinha.role === 'OWNER' || selectedVaquinha.role === 'SUDO') && (
                            <>
                              <button
                                onClick={handleShowMembers}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                title={pv.gerir_membros}
                              >
                                <Users className="w-5 h-5" />
                              </button>
                              <button
                                onClick={handleShowInvites}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                title={pv.convites}
                              >
                                <Mail className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => setShowSettingsModal(true)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                title={pv.configuracoes}
                              >
                                <Settings className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 mb-6">{selectedVaquinha.description}</p>

                      {/* Progress */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">{pv.progresso}</span>
                          <span className="text-sm font-bold text-vaks-primary dark:text-vaks-purple-nubank">{Math.round(progressPercentage)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-vaks-primary to-vaks-secondary h-3 rounded-full transition-all"
                            style={{ width: `${Math.min(100, progressPercentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{selectedVaquinha.currentAmount.toFixed(2)} {pv.vaks_arrecadados}</span>
                          <span>{selectedVaquinha.goalAmount.toFixed(2)} {pv.vaks_objetivo}</span>
                        </div>
                      </div>
                    </div>

                      {/* Info Cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-lg border border-gray-100 p-4">
                          <div className="text-xs text-gray-500 mb-1">{pv.membros}</div>
                          <div className="text-2xl font-bold text-gray-900">{selectedVaquinha.memberCount}</div>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-100 p-4">
                          <div className="text-xs text-gray-500 mb-1">{pv.contribuicoes}</div>
                          <div className="text-2xl font-bold text-gray-900">{selectedVaquinha.contributionCount}</div>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-100 p-4">
                          <div className="text-xs text-gray-500 mb-1">Status</div>
                          <div className="text-sm font-bold text-emerald-600">{pv.ativo}</div>
                        </div>
                      </div>

                      {/* Regras Internas */}
                      <div className="bg-white rounded-lg border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{pv.regras_internas}</h3>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <Target className="w-5 h-5 text-vaks-primary dark:text-vaks-purple-nubank flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{pv.objetivo} {selectedVaquinha.goalVisible ? `(${pv.objetivo_visivel})` : `(${pv.objetivo_oculto})`}</p>
                              <p className="text-sm text-gray-600">{selectedVaquinha.goalAmount.toFixed(2)} VAKS</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-vaks-primary dark:text-vaks-purple-nubank flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{pv.data_limite}</p>
                              <p className="text-sm text-gray-600">{new Date(selectedVaquinha.deadline).toLocaleDateString('pt-AO')}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Award className="w-5 h-5 text-vaks-primary dark:text-vaks-purple-nubank flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{pv.minimo_contribuicao}</p>
                              <p className="text-sm text-gray-600">{pv.nao_definido}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contribuir */}
                      <div className="bg-gradient-to-r from-vaks-primary to-vaks-secondary rounded-lg p-6 text-white">
                        <h3 className="text-lg font-bold mb-4">{pv.contribuir_titulo}</h3>
                        <div className="space-y-3">
                          <input
                            type="number"
                            placeholder={pv.valor_vaks}
                            value={contributionAmount}
                            onChange={(e) => setContributionAmount(e.target.value)}
                            step="0.01"
                            min="0"
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
                          />
                          <textarea
                            placeholder={pv.mensagem_opcional}
                            value={contributionMessage}
                            onChange={(e) => setContributionMessage(e.target.value)}
                            rows={2}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40"
                          />
                          <button
                            onClick={handleContribute}
                            disabled={loadingContribution}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-vaks-primary dark:text-vaks-purple-nubank rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send className="w-4 h-4" />
                            {loadingContribution ? pv.processando : pv.contribuir_agora}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      {/* Modals */}
      {selectedVaquinha && (
        <>
          <GerirMembrosModal
            isOpen={showMembersModal}
            onClose={() => setShowMembersModal(false)}
            members={members}
            memberCount={selectedVaquinha.memberCount}
            currentUserId={selectedVaquinha.ownerId}
            currentUserRole={selectedVaquinha.role}
            onPromoteMember={handlePromoteMember}
            onRemoveMember={handleRemoveMember}
            onSendInvite={handleSendInvite}
          />

          <GerirConfiguracoesModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            settings={{
              title: selectedVaquinha.title,
              description: selectedVaquinha.description,
              goalAmount: selectedVaquinha.goalAmount,
              goalVisible: selectedVaquinha.goalVisible,
              minContribution: 0,
              deadline: selectedVaquinha.deadline
            }}
            onSave={handleSaveSettings}
            canEdit={selectedVaquinha.role === 'OWNER'}
          />

          <GerirConvitesModal
            isOpen={showInvitesModal}
            onClose={() => setShowInvitesModal(false)}
            campaignId={selectedVaquinha.id}
            invites={invites}
            onSendInvite={handleSendInvite}
            onCancelInvite={() => console.log('Cancelar convite')}
          />
        </>
      )}
      </div>
    </div>
  );
}
