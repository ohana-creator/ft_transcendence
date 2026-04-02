'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/locales';

const ALLOWED_PROVIDERS = new Set(['google', '42', 'facebook']);

export default function OAuthProviderCallbackBridgePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ provider: string }>();
  const { t } = useI18n();
  const oauth = t.login.oauth_callback;

  const provider = useMemo(() => String(params?.provider || '').toLowerCase(), [params?.provider]);

  useEffect(() => {
    if (!ALLOWED_PROVIDERS.has(provider)) {
      router.replace('/auth/login?error=oauth_provider_invalido');
      return;
    }

    const queryString = searchParams.toString();
    const callbackUrl = `/api/auth/${provider}/callback${queryString ? `?${queryString}` : ''}`;

    // Full page redirect para garantir que o backend conclui o handshake OAuth.
    window.location.replace(callbackUrl);
  }, [provider, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-vaks-light-primary dark:bg-vaks-dark-primary p-4">
      <div className="w-full max-w-md rounded-2xl bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card p-8 text-center shadow-xl">
        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-vaks-light-purple-button dark:text-vaks-dark-purple-button" />
        <h1 className="mb-2 text-xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
          {oauth.authenticating_title}
        </h1>
        <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
          {oauth.authenticating_description}
        </p>
      </div>
    </div>
  );
}
