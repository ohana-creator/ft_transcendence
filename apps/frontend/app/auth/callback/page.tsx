/**
 * Página: OAuth Callback
 * Processa o token recebido após autenticação OAuth (Google, 42, Facebook)
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth';
import { toast } from '@/utils/toast';
import { api } from '@/utils/api/api';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useI18n } from '@/locales';

type CallbackState = 'loading' | 'success' | 'error';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { t, locale } = useI18n();
  const cb = t.login.oauth_callback;
  const [state, setState] = useState<CallbackState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLocaleReady, setIsLocaleReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedLocale = localStorage.getItem('vaks_locale');
    if (!storedLocale || storedLocale === locale) {
      setIsLocaleReady(true);
    }
  }, [locale]);

  useEffect(() => {
    if (!isLocaleReady) return;

    async function processCallback() {
      const token = searchParams.get('token');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        const message = errorDescription || error || cb.oauth_error_default;
        setState('error');
        setErrorMessage(message);
        toast.error(cb.auth_error_title, message);
        setTimeout(() => router.push('/auth/login'), 3000);
        return;
      }

      if (!token) {
        setState('error');
        setErrorMessage(cb.token_not_found);
        toast.error(t.common.error, cb.token_not_found_description);
        setTimeout(() => router.push('/auth/login'), 3000);
        return;
      }

      try {
        const response = await api.get<{
          success: boolean;
          data?: {
            user?: {
              id?: string;
              email?: string;
              username?: string;
              name?: string;
              avatarUrl?: string;
            };
            id?: string;
            email?: string;
            username?: string;
            name?: string;
            avatarUrl?: string;
          };
        }>('/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` },
          skipAuth: true,
        });

        const rawUser = response?.data?.user || response?.data;

        if (response.success) {
          login(token, rawUser);
          setState('success');
          const username =
            (rawUser && typeof rawUser === 'object' && 'username' in rawUser && typeof rawUser.username === 'string'
              ? rawUser.username
              : null) || t.common.default_user;
          toast.success(cb.login_success_title, cb.welcome_message.replace('{username}', username));
          setTimeout(() => router.push('/dashboard'), 1500);
        } else {
          throw new Error(cb.invalid_server_response);
        }
      } catch (err: unknown) {
        const typedError = err as { message?: string };
        setState('error');
        setErrorMessage(typedError?.message || cb.fetch_data_error);
        toast.error(cb.auth_error_title, typedError?.message);
        setTimeout(() => router.push('/auth/login'), 3000);
      }
    }

    processCallback();
  }, [isLocaleReady, searchParams, login, router, cb, t.common.default_user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-vaks-light-primary dark:bg-vaks-dark-primary p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md w-full"
      >
        {state === 'loading' && (
          <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl p-8 shadow-xl">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 className="h-12 w-12 text-vaks-light-purple-button dark:text-vaks-dark-purple-button mx-auto mb-4" />
            </motion.div>
            <h2 className="text-xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
              {cb.authenticating_title}
            </h2>
            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              {cb.authenticating_description}
            </p>
          </div>
        )}

        {state === 'success' && (
          <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl p-8 shadow-xl">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
              {cb.login_success_title}
            </h2>
            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              {cb.success_redirecting}
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl p-8 shadow-xl">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
              {cb.error_title}
            </h2>
            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-4">
              {errorMessage}
            </p>
            <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              {cb.redirecting}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <OAuthCallbackContent />
    </Suspense>
  );
}
