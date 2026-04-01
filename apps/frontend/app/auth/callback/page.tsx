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

type CallbackState = 'loading' | 'success' | 'error';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [state, setState] = useState<CallbackState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    async function processCallback() {
      const token = searchParams.get('token');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        const message = errorDescription || error || 'Erro na autenticação OAuth';
        setState('error');
        setErrorMessage(message);
        toast.error('Erro na autenticação', message);
        setTimeout(() => router.push('/auth/login'), 3000);
        return;
      }

      if (!token) {
        setState('error');
        setErrorMessage('Token não encontrado');
        toast.error('Erro', 'Token de autenticação não encontrado');
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
              : null) || 'Utilizador';
          toast.success('Login bem-sucedido!', `Bem-vindo, ${username}!`);
          setTimeout(() => router.push('/dashboard'), 1500);
        } else {
          throw new Error('Resposta inválida do servidor');
        }
      } catch (err: unknown) {
        const typedError = err as { message?: string };
        setState('error');
        setErrorMessage(typedError?.message || 'Erro ao obter dados');
        toast.error('Erro na autenticação', typedError?.message);
        setTimeout(() => router.push('/auth/login'), 3000);
      }
    }

    processCallback();
  }, [searchParams, login, router]);

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
              A autenticar...
            </h2>
            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              A processar os teus dados de login
            </p>
          </div>
        )}

        {state === 'success' && (
          <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl p-8 shadow-xl">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
              Login bem-sucedido!
            </h2>
            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              A redirecionar para o dashboard...
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl p-8 shadow-xl">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
              Erro na autenticação
            </h2>
            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-4">
              {errorMessage}
            </p>
            <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              A redirecionar...
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
