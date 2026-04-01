'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Globe, Plus, Search, TrendingUp, Heart, Sparkles, Filter, ArrowRight } from 'lucide-react';
import { useI18n } from '@/locales';

type VaquinhaTab = 'publicas' | 'privadas';

const CATEGORIAS = [
  { nome: 'Todas', icon: '🌟', cor: 'from-purple-500 to-pink-500' },
  { nome: 'Educação', icon: '📚', cor: 'from-blue-500 to-cyan-500' },
  { nome: 'Saúde', icon: '❤️', cor: 'from-red-500 to-pink-500' },
  { nome: 'Comunidade', icon: '🌱', cor: 'from-green-500 to-emerald-500' },
  { nome: 'Emergência', icon: '🚨', cor: 'from-orange-500 to-red-500' },
  { nome: 'Eventos', icon: '🎉', cor: 'from-purple-500 to-indigo-500' },
  { nome: 'Animais', icon: '🐾', cor: 'from-amber-500 to-yellow-500' },
];

export default function VaquinhasLayoutPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<VaquinhaTab>('publicas');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
  const [busca, setBusca] = useState('');

  const handleTabChange = (tab: VaquinhaTab) => {
    setActiveTab(tab);
    router.push(`/vaquinhas/${tab}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Header com gradiente */}
      <div className="relative bg-gradient-to-br from-vaks-primary via-vaks-secondary to-vaks-cobalt text-white overflow-hidden">
        {/* Elementos decorativos */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-8 h-8" />
                <h1 className="text-4xl md:text-5xl font-black">{t.headings.vaks_campaigns}</h1>
              </div>
              <p className="text-lg md:text-xl text-white/90 max-w-2xl font-medium">
                {t.vaquinhas.hub.hero_descricao_alt}
              </p>
              
              {/* Stats rápidas */}
              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">1.2K+</p>
                    <p className="text-xs text-white/80">{t.headings.active_campaigns}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">500K</p>
                    <p className="text-xs text-white/80">{t.headings.vaks_raised}</p>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/vaquinhas/privadas/criar')}
              className="flex items-center gap-2 px-6 py-3 bg-white text-vaks-primary rounded-xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
            >
              <Plus className="w-5 h-5" />
              {t.vaquinhas.criar}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Barra de busca moderna */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t.placeholders.search_campaigns_title}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/95 backdrop-blur-sm text-gray-900 rounded-xl border-2 border-white/50 focus:border-white focus:outline-none shadow-xl placeholder-gray-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Tabs de navegação */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button
                onClick={() => handleTabChange('publicas')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                  activeTab === 'publicas'
                    ? 'bg-gradient-to-r from-vaks-primary to-vaks-secondary text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Globe className="w-5 h-5" />
                {t.vaquinhas.publicas}
              </button>
              <button
                onClick={() => handleTabChange('privadas')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                  activeTab === 'privadas'
                    ? 'bg-gradient-to-r from-vaks-primary to-vaks-secondary text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Lock className="w-5 h-5" />
                {t.vaquinhas.privadas}
              </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Filter className="w-4 h-4" />
              {t.vaquinhas.privada.filtros}
            </button>
          </div>
        </div>
      </div>

      {/* Pills de categorias */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.nome}
                onClick={() => setCategoriaAtiva(cat.nome)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-all duration-300 ${
                  categoriaAtiva === cat.nome
                    ? `bg-gradient-to-r ${cat.cor} text-white shadow-lg scale-105`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-lg">{cat.icon}</span>
                {cat.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'publicas' && (
          <div className="space-y-8">
            {/* Seção em destaque */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-vaks-primary" />
                  <h2 className="text-2xl font-bold text-gray-900">{t.headings.featured}</h2>
                </div>
                <button className="text-vaks-primary font-semibold hover:underline flex items-center gap-1">
                  {t.vaquinhas.hub.ver_tudo}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 text-center">
                <TrendingUp className="w-16 h-16 text-vaks-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t.headings.featured}</h3>
                <p className="text-gray-600 mb-4">
                  {t.vaquinhas.hub.destaque_desc_alt}
                </p>
                <button className="px-6 py-3 bg-vaks-primary text-white rounded-xl font-bold hover:bg-vaks-secondary transition-colors">
                  {t.vaquinhas.hub.explorar_agora}
                </button>
              </div>
            </section>

            {/* Grid de vaquinhas */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{t.headings.all_campaigns}</h2>
                <p className="text-sm text-gray-500">{t.headings.showing_campaigns}</p>
              </div>
              
              {/* Placeholder para o grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 text-center animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'privadas' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-vaks-primary/5 to-vaks-secondary/5 rounded-2xl p-12 text-center border-2 border-dashed border-vaks-primary/20">
              <Lock className="w-20 h-20 text-vaks-primary/40 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{t.vaquinhas.hub.suas_campanhas_privadas}</h2>
              <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                {t.vaquinhas.hub.desc_campanhas_privadas}
              </p>
              <button
                onClick={() => router.push('/vaquinhas/privadas/criar')}
                className="px-8 py-4 bg-gradient-to-r from-vaks-primary to-vaks-secondary text-white rounded-xl font-bold hover:shadow-xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {t.vaquinhas.hub.criar_primeira_privada}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
