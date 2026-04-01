'use client';

import { useEffect } from 'react';

const noop = () => {};

export function ConsoleSilencer() {
  useEffect(() => {
    const isLoginDebugEnabled = process.env.NEXT_PUBLIC_DEBUG_LOGIN === 'true';
    const shouldSilence =
      process.env.NEXT_PUBLIC_SILENCE_BROWSER_CONSOLE !== 'false' && !isLoginDebugEnabled;
    if (!shouldSilence) return;

    const original = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
      trace: console.trace,
    };

    console.log = noop;
    console.info = noop;
    console.warn = noop;
    console.error = noop;
    console.debug = noop;
    console.trace = noop;

    const onError = (event: ErrorEvent) => {
      event.preventDefault();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      console.log = original.log;
      console.info = original.info;
      console.warn = original.warn;
      console.error = original.error;
      console.debug = original.debug;
      console.trace = original.trace;
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
