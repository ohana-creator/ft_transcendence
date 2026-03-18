'use client';

import * as React from 'react';
import { useState } from 'react';

interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  wrapperClassName?: string;
}

export function AppInput({ label, icon, error, className, wrapperClassName, ...rest }: AppInputProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div className={`relative w-full min-w-50 ${wrapperClassName ?? ''}`}>
      {label && (
        <label className="mb-2 block text-sm font-bold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
          {label}
        </label>
      )}
      <div className="relative w-full">
        <input
          className={`peer relative z-10 h-12 w-full rounded-lg border border-vaks-light-stroke bg-vaks-light-input px-4 text-vaks-light-main-txt outline-none transition-all duration-200 ease-in-out placeholder:text-vaks-light-alt-txt/60 focus:border-vaks-cobalt focus:ring-2 focus:ring-vaks-cobalt/20 dark:border-vaks-dark-stroke dark:bg-vaks-dark-input dark:text-vaks-dark-main-txt dark:placeholder:text-vaks-dark-alt-txt/40 dark:focus:border-vaks-dark-secondary dark:focus:ring-vaks-dark-secondary/20 ${className ?? ''}`}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          {...rest}
        />

        {/* Glow border top */}
        {isHovering && (
          <>
            <div
              className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-0.5 overflow-hidden rounded-t-lg"
              style={{
                background: `radial-gradient(40px circle at ${mousePosition.x}px 0px, var(--color-vaks-cobalt) 0%, transparent 70%)`,
              }}
            />
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 h-0.5 overflow-hidden rounded-b-lg"
              style={{
                background: `radial-gradient(40px circle at ${mousePosition.x}px 2px, var(--color-vaks-cobalt) 0%, transparent 70%)`,
              }}
            />
          </>
        )}

        {icon && (
          <div className="absolute right-3 top-1/2 z-20 -translate-y-1/2 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
            {icon}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-vaks-light-error dark:text-vaks-dark-error">{error}</p>
      )}
    </div>
  );
}

export default AppInput;
