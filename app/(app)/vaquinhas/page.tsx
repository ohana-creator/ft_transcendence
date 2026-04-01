'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Lock, Globe, Plus, Search, ChevronRight, ChevronLeft, Target, Users, LayoutGrid } from 'lucide-react';
import { CardCarousel } from '@/components/ui/card-carousel';
import { useI18n } from '@/locales';
import { useVaquinhas, type VaquinhaPublica } from '@/hooks/vaquinhas/useVaquinhas';

// ─── Tipos ──────────────────────────────────────────────────────────────

type VaquinhaTab = 'publicas' | 'privadas';

// ─── Social Proof Ticker ────────────────────────────────────────────────
function SocialProofTicker() {
  const { t } = useI18n();
  const tk = t.vaquinhas.ticker;

  const items = [
    { nome: 'Alguem', valor: 50, vaquinha: 'Ajuda ao Abrigo' },
    { nome: 'Um amigo', valor: 120, vaquinha: 'Festival de Verao' },
    { nome: 'Contribuidor', valor: 30, vaquinha: 'Material Escolar' },
    { nome: 'Anonimo', valor: 200, vaquinha: 'Viagem Solidaria' },
    { nome: 'Alguem generoso', valor: 75, vaquinha: 'Projeto Comunitario' },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setIsVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, [items.length]);

  const current = items[currentIndex];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 backdrop-blur-sm border border-purple-300/30 rounded-2xl px-6 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
        </div>
        <span className="text-xs font-bold text-purple-500 uppercase tracking-wider flex-shrink-0">{tk.em_direto}</span>
        <div className="h-4 w-px bg-gray-300 flex-shrink-0" />
        <p
          className={`text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt transition-all duration-400 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
          }`}
        >
          <span className="font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{current.nome}</span>
          {' '}{tk.acabou_de_doar}{' '}
          <span className="font-extrabold text-purple-600">{current.valor} VAKS</span>
          {' '}{tk.para}{' '}
          <span className="font-bold text-pink-600">"{current.vaquinha}"</span>
        </p>
      </div>
    </div>
  );
}

// ─── Avatar Stack ───────────────────────────────────────────────────────
function AvatarStack({ contribuidores, max = 4 }: { contribuidores: string[]; max?: number }) {
  const visible = contribuidores.slice(0, max);
  const remaining = contribuidores.length - max;
  const colors = [
    'bg-yellow-400', 'bg-pink-400', 'bg-teal-400', 'bg-indigo-400',
    'bg-orange-400', 'bg-emerald-400', 'bg-rose-400', 'bg-cyan-400',
  ];

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2.5">
        {visible.map((nome, i) => (
          <div
            key={i}
            className={`w-8 h-8 rounded-full ${colors[i % colors.length]} border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-md`}
            title={nome}
          >
            {nome.charAt(0).toUpperCase()}
          </div>
        ))}
        {remaining > 0 && (
          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-[10px] font-bold">
            +{remaining}
          </div>
        )}
      </div>
      <span className="ml-2.5 text-xs text-gray-400">{contribuidores.length} contribuidores</span>
    </div>
  );
}

// ─── Category Pill ──────────────────────────────────────────────────────
function CategoryPill({ label, active, onClick, count }: {
  label: string; active: boolean; onClick: () => void; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
        active
          ? 'bg-gradient-to-br from-violet-700 via-violet-600 to-violet-500 text-white shadow-lg shadow-violet-300'
          : 'bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:bg-vaks-light-purple-button dark:hover:bg-vaks-dark-purple-button hover:text-vaks-dark-main-txt dark:text-vaks-dark-main-txt'
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`ml-2 text-xs ${active ? 'text-white/80' : 'text-vaks-light-main-txt dark:text-vaks-dark-main-txt'}`}>{count}</span>
      )}
    </button>
  );
}

// ─── Stats ──────────────────────────────────────────────────────────────
function StatsBar({ vaquinhas }: { vaquinhas: VaquinhaPublica[] }) {
  const { t } = useI18n();
  const st = t.vaquinhas.stats;

  const totalArrecadado = vaquinhas.reduce((acc, v) => acc + v.arrecadado, 0);
  const totalContribuidores = new Set(vaquinhas.flatMap((v) => v.contribuidores)).size;
  const vaquinhasAtivas = vaquinhas.filter((v) => v.diasRestantes > 0).length;

  const stats = [
    { label: st.total_arrecadado, value: `${totalArrecadado.toLocaleString()} VAKS`, gradient: 'from-violet-700 via-violet-600 to-violet-500', shadow: 'shadow-violet-300', icon: Target },
    { label: st.contribuidores, value: totalContribuidores.toString(), gradient: 'from-violet-600 via-violet-500 to-violet-400', shadow: 'shadow-violet-200', icon: Users },
    { label: st.vaquinhas_ativas, value: vaquinhasAtivas.toString(), gradient: 'from-violet-700 via-violet-600 to-violet-500', shadow: 'shadow-violet-300', icon: Globe },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
      {stats.map((stat) => (
        <div key={stat.label} className="group bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover">
          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-3 shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform`}>
            <stat.icon className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{stat.value}</p>
          <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1 uppercase tracking-wider">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Hero Destaque Card ─────────────────────────────────────────────────
function DestaqueHero({ vaquinha }: { vaquinha: VaquinhaPublica }) {
  const router = useRouter();
  const { t } = useI18n();
  const hb = t.vaquinhas.hub;
  const percent = vaquinha.meta > 0
    ? Math.min((vaquinha.arrecadado / vaquinha.meta) * 100, 100)
    : 0;

  const avatarColors = [
    'bg-emerald-400', 'bg-pink-400', 'bg-yellow-400', 'bg-cyan-400', 'bg-purple-400', 'bg-rose-400',
  ];

  return (
    <div
      onClick={() => router.push(`/vaquinhas/${vaquinha.id}`)}
      className="group cursor-pointer relative rounded-3xl overflow-hidden border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card shadow-sm hover:shadow-2xl transition-all duration-300"
    >
      <div className="grid md:grid-cols-2 gap-0">
        {/* Imagem */}
        <div className="relative h-72 md:h-auto overflow-hidden rounded-3xl m-4">
          <img
            src={vaquinha.imagem}
            alt={vaquinha.nome}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 rounded-2xl"
          />
          <div className="absolute top-5 left-5">
            <div className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl text-sm font-bold text-white shadow-lg">
              {hb.vaquinha_destaque}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-8 flex flex-col justify-center space-y-5">
          <div>
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">{vaquinha.categoria.toUpperCase()}</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mt-2 group-hover:text-purple-700 transition-colors">
              {vaquinha.nome}
            </h2>
            <p className="mt-3 text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt leading-relaxed line-clamp-2">{vaquinha.descricao}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{vaquinha.arrecadado.toLocaleString()} VAKS</span>
              <span className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{t.vaquinhas.meta}: {vaquinha.meta.toLocaleString()}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-700 via-violet-600 to-violet-500 transition-all duration-1000"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex -space-x-2.5">
                {vaquinha.contribuidores.slice(0, 6).map((nome, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full ${avatarColors[i % avatarColors.length]} border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-md`}
                  >
                    {nome.charAt(0).toUpperCase()}
                  </div>
                ))}
                {vaquinha.contribuidores.length > 6 && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-[10px] font-bold">
                    +{vaquinha.contribuidores.length - 6}
                  </div>
                )}
              </div>
              <span className="ml-3 text-xs text-gray-400">{vaquinha.contribuidores.length} {hb.contribuidores}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${vaquinha.diasRestantes <= 3 ? 'bg-red-400' : 'bg-emerald-400'}`} />
              {vaquinha.diasRestantes} {hb.dias}
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/vaquinhas/${vaquinha.id}`); }}
            className="w-full py-3.5 bg-gradient-to-br from-violet-700 via-violet-600 to-violet-500 hover:from-violet-600 hover:via-violet-500 hover:to-violet-400 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-violet-300 hover:shadow-xl hover:shadow-violet-400 hover:scale-[1.01] text-sm"
          >
            {hb.contribuir_agora}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vaquinha Card ──────────────────────────────────────────────────────
function VaquinhaPublicaCard({ vaquinha, index }: { vaquinha: VaquinhaPublica; index: number }) {
  const router = useRouter();
  const percent = vaquinha.meta > 0
    ? Math.min((vaquinha.arrecadado / vaquinha.meta) * 100, 100)
    : 0;

  const categoryColors: Record<string, string> = {
    'Solidariedade': 'bg-rose-50 text-rose-600 border-rose-200',
    'Educacao': 'bg-blue-50 text-blue-600 border-blue-200',
    'Eventos': 'bg-amber-50 text-amber-600 border-amber-200',
    'Comunidade': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'Desporto': 'bg-cyan-50 text-cyan-600 border-cyan-200',
    'Cultura': 'bg-purple-50 text-purple-600 border-purple-200',
  };

  const gradients = [
    'from-violet-700 via-violet-600 to-violet-500',
    'from-violet-600 via-violet-500 to-violet-400',
    'from-violet-700 via-violet-600 to-violet-500',
    'from-violet-600 via-violet-500 to-violet-400',
    'from-violet-700 via-violet-600 to-violet-500',
    'from-violet-600 via-violet-500 to-violet-400',
  ];

  const catColor = categoryColors[vaquinha.categoria] || 'bg-gray-50 text-gray-600 border-gray-200';

  return (
    <button
      onClick={() => router.push(`/vaquinhas/${vaquinha.id}`)}
      className="group bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-400 text-left border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover hover:-translate-y-1"
    >
      {/* Imagem de Capa */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={vaquinha.imagem}
          alt={vaquinha.nome}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className={`absolute inset-0 bg-gradient-to-t ${gradients[index % gradients.length]} opacity-30 mix-blend-multiply`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Destaque Badge */}
        {vaquinha.destaque && (
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-amber-200">
              Em Destaque
            </span>
          </div>
        )}

        {/* Categoria */}
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border backdrop-blur-sm bg-white/80 ${catColor}`}>
            {vaquinha.categoria}
          </span>
        </div>

        {/* Percentagem */}
        <div className="absolute bottom-4 right-4">
          <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm">
            <span className="text-sm font-extrabold text-purple-700">{Math.round(percent)}%</span>
          </div>
        </div>

        {/* Dias Restantes */}
        <div className="absolute bottom-4 left-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-xl">
            <div className={`w-1.5 h-1.5 rounded-full ${vaquinha.diasRestantes <= 3 ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span className="text-xs font-medium text-white">
              {vaquinha.diasRestantes <= 0 ? 'Encerrada' : `${vaquinha.diasRestantes} dias`}
            </span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt group-hover:text-purple-700 transition-colors line-clamp-1">
            {vaquinha.nome}
          </h3>
          <p className="mt-1.5 text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt line-clamp-2 leading-relaxed">{vaquinha.descricao}</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-extrabold text-purple-600">{vaquinha.arrecadado.toLocaleString()} VAKS</span>
            <span className="text-xs text-gray-400">de {vaquinha.meta.toLocaleString()}</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${gradients[index % gradients.length]} transition-all duration-1000`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Rodape: Criador + Avatares */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-700 via-violet-600 to-violet-500 flex items-center justify-center text-[10px] font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
              {vaquinha.criador.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{vaquinha.criador}</span>
          </div>
          <AvatarStack contribuidores={vaquinha.contribuidores} max={3} />
        </div>
      </div>
    </button>
  );
}


// ─── Page Component ─────────────────────────────────────────────────────
export default function VaquinhasLayoutPage() {
  const router = useRouter();
  const { t } = useI18n();
  const hb = t.vaquinhas.hub;

  const [search, setSearch] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>('carousel');

  const { vaquinhas, loading } = useVaquinhas();

  const categorias = useMemo(() => {
    const cats = Array.from(new Set(vaquinhas.map((v) => v.categoria)));
    return ['Todas', ...cats];
  }, [vaquinhas]);

  const categoriaCounts = useMemo(() => {
    const counts: Record<string, number> = { Todas: vaquinhas.length };
    vaquinhas.forEach((v) => {
      counts[v.categoria] = (counts[v.categoria] || 0) + 1;
    });
    return counts;
  }, [vaquinhas]);

  const filteredVaquinhas = useMemo(() => {
    return vaquinhas.filter((v) => {
      const matchSearch = v.nome.toLowerCase().includes(search.toLowerCase()) ||
                          v.descricao.toLowerCase().includes(search.toLowerCase());
      const matchCategoria = categoriaAtiva === 'Todas' || v.categoria === categoriaAtiva;
      return matchSearch && matchCategoria;
    });
  }, [vaquinhas, search, categoriaAtiva]);

  const destaque = vaquinhas.find((v) => v.destaque);
  const restantes = filteredVaquinhas.filter((v) => !v.destaque || categoriaAtiva !== 'Todas');

  const avatarColors = [
    'bg-yellow-400', 'bg-pink-400', 'bg-teal-400', 'bg-indigo-400', 'bg-orange-400',
  ];

  return (
    <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary">
      {/* Header com Hero Banner */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/assets/overview.jpg"
            alt="Comunidade unida"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 via-purple-800/70 to-pink-700/60" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              {hb.hero_titulo}
            </h1>
            <p className="text-lg text-white/85 mb-8 leading-relaxed">
              {hb.hero_descricao}
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => router.push('/vaquinhas/publicas/criar')}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-purple-700 rounded-2xl font-bold hover:bg-gray-50 transition-all duration-300 hover:shadow-xl hover:scale-105 text-sm"
              >
                <Plus className="w-5 h-5" />
                {hb.criar_nova}
              </button>
            </div>
          </div>
          {/* Avatares flutuantes */}
          <div className="hidden md:flex items-center gap-3 absolute bottom-8 right-8">
            <div className="flex -space-x-3">
              {avatarColors.map((color, i) => (
                <div key={i} className={`w-10 h-10 rounded-full ${color} border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                  {['M', 'A', 'P', 'S', 'R'][i]}
                </div>
              ))}
            </div>
            <span className="text-white/80 text-sm font-medium">+42 {hb.contribuidores_ativos}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="space-y-8">
          {/* Social Proof Ticker */}
          <SocialProofTicker />

          {/* Stats */}
          <StatsBar vaquinhas={vaquinhas} />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
              <p className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt text-sm">{hb.carregando}</p>
            </div>
          ) : (
            <>
          {/* Destaque Hero */}
          {destaque && categoriaAtiva === 'Todas' && !search && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{hb.em_destaque}</h3>
                  <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1">{hb.destaque_desc}</p>
                </div>
              </div>
              <DestaqueHero vaquinha={destaque} />
            </div>
          )}

          {/* Search + Categorias */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={hb.procurar}
                className="w-full pl-12 pr-4 py-3.5 bg-vaks-light-input dark:bg-vaks-dark-input border border-vaks-light-stroke dark:border-vaks-dark-stroke text-vaks-light-main-txt dark:text-vaks-dark-main-txt rounded-2xl text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition-all shadow-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <CategoryPill
                  key={cat}
                  label={cat}
                  active={categoriaAtiva === cat}
                  onClick={() => setCategoriaAtiva(cat)}
                  count={categoriaCounts[cat]}
                />
              ))}
            </div>
          </div>

          {/* Section Title */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                {categoriaAtiva === 'Todas' ? hb.todas_campanhas : categoriaAtiva}
              </h3>
              <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1">{hb.acompanhe_contribua}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm font-bold text-purple-600 bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card px-4 py-1.5 rounded-full">
                {restantes.length} {restantes.length !== 1 ? hb.campanhas : hb.campanha}
              </div>
              <button
                onClick={() => setViewMode(v => v === 'carousel' ? 'grid' : 'carousel')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover hover:border-purple-300 rounded-xl text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:text-purple-700 transition-all shadow-sm hover:shadow-md"
              >
                {viewMode === 'carousel' ? (
                  <><LayoutGrid className="w-4 h-4" /> {hb.ver_tudo}</>
                ) : (
                  <><ChevronLeft className="w-4 h-4" /> {hb.ver_menos}</>
                )}
              </button>
            </div>
          </div>

          {/* Vaquinhas — Carrossel ou Grade */}
          {restantes.length > 0 ? (
            viewMode === 'carousel' ? (
              <CardCarousel>
                {restantes.map((v, i) => (
                  <div key={v.id} className="flex-shrink-0 w-[280px] sm:w-[340px]">
                    <VaquinhaPublicaCard vaquinha={v} index={i} />
                  </div>
                ))}
              </CardCarousel>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {restantes.map((v, i) => (
                  <VaquinhaPublicaCard key={v.id} vaquinha={v} index={i} />
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <Search className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt text-sm">{hb.nenhuma_encontrada}</p>
              <button
                onClick={() => { setSearch(''); setCategoriaAtiva('Todas'); }}
                className="text-xs text-purple-600 hover:text-purple-500 font-semibold transition-colors"
              >
                {hb.limpar_filtros}
              </button>
            </div>
          )}

          {/* Footer CTA */}
          <div className="text-center py-10 space-y-4">
            <div className="h-px w-full max-w-xs mx-auto bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{hb.footer_cta}</p>
            <button
              onClick={() => router.push('/vaquinhas/publicas/criar')}
              className="px-8 py-3 bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button hover:bg-purple-900 hover:border-purple-300 text-vaks-dark-main-txt rounded-2xl text-sm font-bold transition-all duration-300 shadow-sm hover:shadow-lg"
            >
              {hb.criar_vaquinha}
            </button>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}