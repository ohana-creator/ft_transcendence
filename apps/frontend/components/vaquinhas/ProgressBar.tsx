/**
 * Componente: ProgressBar
 * Barra de progresso reutilizável com animação
 * Usa Radix UI Progress
 */

'use client';

import * as Progress from '@radix-ui/react-progress';
import { cn } from '@/utils/styling/cn';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export default function ProgressBar({ 
  progress, 
  className,
  size = 'md',
  showPercentage = false 
}: ProgressBarProps) {
  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      <Progress.Root
        className={cn(
          'relative overflow-hidden bg-vaks-light-input dark:bg-vaks-dark-input rounded-full w-full',
          heightClasses[size]
        )}
        value={clampedProgress}
      >
        <Progress.Indicator
          className="bg-gradient-to-r from-vaks-light-purple-button to-emerald-500 dark:from-vaks-dark-purple-button dark:to-emerald-400 h-full transition-transform duration-500 ease-out rounded-full"
          style={{ transform: `translateX(-${100 - clampedProgress}%)` }}
        />
      </Progress.Root>

      {showPercentage && (
        <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1 text-right">
          {clampedProgress.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
