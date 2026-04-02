'use client';

import { useEffect } from 'react';

const noop = () => {};

export function ConsoleSilencer() {
  useEffect(() => {
    // Always silence console in browser to avoid any logs
    const original = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
      trace: console.trace,
      dir: console.dir,
      table: console.table,
      group: console.group,
      groupEnd: console.groupEnd,
      groupCollapsed: console.groupCollapsed,
      assert: console.assert,
      count: console.count,
      countReset: console.countReset,
      time: console.time,
      timeLog: console.timeLog,
      timeEnd: console.timeEnd,
    };

    // Silence all console methods
    console.log = noop;
    console.info = noop;
    console.warn = noop;
    console.error = noop;
    console.debug = noop;
    console.trace = noop;
    console.dir = noop;
    console.table = noop;
    console.group = noop;
    console.groupEnd = noop;
    console.groupCollapsed = noop;
    console.assert = noop;
    console.count = noop;
    console.countReset = noop;
    console.time = noop;
    console.timeLog = noop;
    console.timeEnd = noop;

    // Prevent errors from being shown
    const onError = (event: ErrorEvent) => {
      event.preventDefault();
      event.stopPropagation();
      return true;
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      event.stopPropagation();
      return true;
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onUnhandledRejection, true);

    return () => {
      console.log = original.log;
      console.info = original.info;
      console.warn = original.warn;
      console.error = original.error;
      console.debug = original.debug;
      console.trace = original.trace;
      console.dir = original.dir;
      console.table = original.table;
      console.group = original.group;
      console.groupEnd = original.groupEnd;
      console.groupCollapsed = original.groupCollapsed;
      console.assert = original.assert;
      console.count = original.count;
      console.countReset = original.countReset;
      console.time = original.time;
      console.timeLog = original.timeLog;
      console.timeEnd = original.timeEnd;
      window.removeEventListener('error', onError, true);
      window.removeEventListener('unhandledrejection', onUnhandledRejection, true);
    };
  }, []);

  return null;
}
