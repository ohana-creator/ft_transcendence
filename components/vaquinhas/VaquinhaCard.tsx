/**
 * Componente: VaquinhaCard
 * Card criativo e visual de uma vaquinha
 * Design inspirado em plataformas modernas de crowdfunding
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Vaquinha } from '@/types';
import { Heart, Users, TrendingUp, Clock, MapPin } from 'lucide-react';
import { useI18n } from '@/locales';

interface VaquinhaCardProps {
  vaquinha: Vaquinha;
  variant?: 'default' | 'featured';
}

export default function VaquinhaCard({ vaquinha, variant = 'default' }: VaquinhaCardProps) {
  const { t } = useI18n();
  const progresso = (vaquinha.arrecadado / vaquinha.meta) * 100;
  const contribuidoresExemplo = Math.floor(Math.random() * 150) + 10; // Simulado
  const diasRestantes = Math.floor(Math.random() * 30) + 1; // Simulado

  const getCategoryColor = (categoria: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string }> = {
      'Educação': { bg: 'bg-blue-50', text: 'text-blue-700', icon: '📚' },
      'Saúde': { bg: 'bg-red-50', text: 'text-red-700', icon: '❤️' },
      'Comunidade': { bg: 'bg-green-50', text: 'text-green-700', icon: '🌱' },
      'Emergência': { bg: 'bg-orange-50', text: 'text-orange-700', icon: '🚨' },
      'Eventos': { bg: 'bg-purple-50', text: 'text-purple-700', icon: '🎉' },
      'Animais': { bg: 'bg-amber-50', text: 'text-amber-700', icon: '🐾' },
    };
    return colors[categoria] || { bg: 'bg-gray-50', text: 'text-gray-700', icon: '💡' };
  };

  const categoryStyle = getCategoryColor(vaquinha.categoria);
  const isFeatured = variant === 'featured';

  return (
    <Link href={`/vaquinhas/${vaquinha.id}`}>
      <div className={`group relative bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
        isFeatured ? 'shadow-xl border-2 border-vaks-primary/20' : 'shadow-md border border-gray-100'
      }`}>
        {/* Badge de destaque */}
        {isFeatured && (
          <div className="absolute top-4 left-4 z-10 bg-gradient-to-r from-vaks-primary to-vaks-secondary text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Em Destaque
          </div>
        )}

        {/* Imagem com overlay gradiente */}
        <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-vaks-primary/10 to-vaks-secondary/10">
          {vaquinha.imagemUrl ? (
            <>
              <Image
                src={vaquinha.imagemUrl}
                alt={vaquinha.titulo}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl">
              {categoryStyle.icon}
            </div>
          )}
          
          {/* Categoria badge na imagem */}
          <div className={`absolute top-4 right-4 ${categoryStyle.bg} ${categoryStyle.text} px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm bg-opacity-90 flex items-center gap-1.5 shadow-lg`}>
            <span>{categoryStyle.icon}</span>
            {vaquinha.categoria}
          </div>

          {/* Progresso overlay na imagem */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-end justify-between text-white mb-2">
              <div className="flex-1">
                <p className="text-2xl font-black drop-shadow-lg">
                  {vaquinha.arrecadado.toFixed(0)}<span className="text-lg"> VAKS</span>
                </p>
                <p className="text-xs font-medium opacity-90">de {vaquinha.meta.toFixed(0)} VAKS</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black drop-shadow-lg">{progresso.toFixed(0)}%</p>
              </div>
            </div>
            {/* Barra de progresso moderna */}
            <div className="w-full h-2 bg-white/30 backdrop-blur-sm rounded-full overflow-hidden shadow-lg">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${Math.min(progresso, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Conteúdo do card */}
        <div className="p-5">
          {/* Título */}
          <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-vaks-primary transition-colors">
            {vaquinha.titulo}
          </h3>

          {/* Descrição */}
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
            {vaquinha.descricao}
          </p>

          {/* Estatísticas */}
          <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-vaks-primary" />
              <span className="font-medium">{contribuidoresExemplo} apoiadores</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{diasRestantes} dias restantes</span>
            </div>
          </div>

          {/* Criador */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vaks-primary to-vaks-secondary flex items-center justify-center text-white font-bold text-sm shadow-md">
              {vaquinha.criador.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 leading-tight">{t.labels.organized_by}</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{vaquinha.criador.nome}</p>
            </div>
            <button className="p-2 rounded-full hover:bg-red-50 transition-colors group/heart">
              <Heart className="w-5 h-5 text-gray-300 group-hover/heart:text-red-500 group-hover/heart:fill-red-500 transition-all" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
