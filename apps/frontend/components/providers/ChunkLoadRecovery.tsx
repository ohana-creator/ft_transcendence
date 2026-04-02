'use client';

import { useEffect } from 'react';

const CHUNK_RELOAD_KEY = 'vaks:chunk-reload-at';
const CHUNK_RELOAD_COOLDOWN_MS = 15000;

function shouldHandleChunkError(message: string): boolean {
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Loading failed for the script with source/i.test(message);
}

function isNextChunkScript(target: EventTarget | null): boolean {
  return target instanceof HTMLScriptElement && target.src.includes('/_next/static/chunks/');
}

function isNextChunkFilename(filename: string): boolean {
  return filename.includes('/_next/static/chunks/');
}

export function ChunkLoadRecovery() {
  useEffect(() => {
    const tryRecover = () => {
      const now = Date.now();
      const previousRaw = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      const previous = previousRaw ? Number(previousRaw) : 0;

      if (previous && Number.isFinite(previous) && now - previous < CHUNK_RELOAD_COOLDOWN_MS) {
        return;
      }

      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      if (
        isNextChunkScript(event.target) ||
        isNextChunkFilename(event.filename || '') ||
        shouldHandleChunkError(event.message || '')
      ) {
        tryRecover();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reasonMessage =
        typeof reason === 'string'
          ? reason
          : (reason && typeof reason === 'object' && 'message' in reason && typeof reason.message === 'string')
            ? reason.message
            : '';

      if (shouldHandleChunkError(reasonMessage)) {
        tryRecover();
      }
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onUnhandledRejection, true);

    return () => {
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onUnhandledRejection, true);
    };
  }, []);

  return null;
}
