/**
 * Utilidade centralizada para toast notifications
 * Usa Sonner para feedback visual consistente
 */

import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 3000,
    });
  },

  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 4000,
    });
  },

  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 3000,
    });
  },

  loading: (message: string) => {
    return sonnerToast.loading(message);
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },
};
