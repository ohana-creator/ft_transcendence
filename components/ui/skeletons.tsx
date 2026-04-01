/**
 * Skeleton Screens - Componentes de carregamento
 * Mostram estrutura visual vazia antes dos dados serem carregados
 */

'use client';

/**
 * Skeleton de card de campanha (vaquinha)
 */
export function CampaignCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 space-y-3 animate-pulse">
      {/* Imagem */}
      <div className="w-full h-48 bg-gray-300 dark:bg-slate-700 rounded-lg" />
      
      {/* Título */}
      <div className="h-5 bg-gray-300 dark:bg-slate-700 rounded w-3/4" />
      
      {/* Descrição */}
      <div className="space-y-2">
        <div className="h-3 bg-gray-300 dark:bg-slate-700 rounded w-full" />
        <div className="h-3 bg-gray-300 dark:bg-slate-700 rounded w-5/6" />
      </div>
      
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <div className="h-3 bg-gray-300 dark:bg-slate-700 rounded w-16" />
          <div className="h-3 bg-gray-300 dark:bg-slate-700 rounded w-12" />
        </div>
        <div className="w-full h-2 bg-gray-300 dark:bg-slate-700 rounded" />
      </div>
    </div>
  );
}

/**
 * Skeleton de lista de campanhas (grid)
 */
export function CampaignsListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CampaignCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton da carteira/wallet
 */
export function WalletSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Saldo principal */}
      <div className="bg-gradient-to-r from-gray-300 to-gray-400 dark:from-slate-700 dark:to-slate-800 rounded-xl p-6 h-40" />
      
      {/* Ações rápidas */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-300 dark:bg-slate-700 rounded-lg" />
        ))}
      </div>
      
      {/* Histórico de transações */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg">
            <div className="w-12 h-12 bg-gray-300 dark:bg-slate-700 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-3 bg-gray-300 dark:bg-slate-700 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton do perfil do user
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header com avatar */}
      <div className="flex gap-4 items-start">
        <div className="w-24 h-24 bg-gray-300 dark:bg-slate-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-gray-300 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-2 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-300 dark:bg-slate-700 rounded" />
            ))}
          </div>
        </div>
      </div>
      
      {/* Bio */}
      <div className="space-y-2 p-4 bg-white dark:bg-slate-900 rounded-lg">
        <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-full" />
        <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-5/6" />
      </div>
      
      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 bg-white dark:bg-slate-900 rounded-lg text-center space-y-2">
            <div className="h-6 bg-gray-300 dark:bg-slate-700 rounded w-1/2 mx-auto" />
            <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-2/3 mx-auto" />
          </div>
        ))}
      </div>
      
      {/* Contribution graph */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-lg space-y-3">
        <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-1/3" />
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex gap-1">
              {Array.from({ length: 20 }).map((_, j) => (
                <div
                  key={j}
                  className="w-3 h-3 bg-gray-300 dark:bg-slate-700 rounded"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton de resultados de busca
 */
export function SearchResultsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg animate-pulse">
          <div className="w-10 h-10 bg-gray-300 dark:bg-slate-700 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-1/2" />
            <div className="h-3 bg-gray-300 dark:bg-slate-700 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton genérico para linhas de texto
 */
export function TextSkeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-full"
          style={{
            width: `${90 - i * 10}%`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton genérico para tabelas
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 bg-white dark:bg-slate-900 rounded">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-gray-300 dark:bg-slate-700 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
