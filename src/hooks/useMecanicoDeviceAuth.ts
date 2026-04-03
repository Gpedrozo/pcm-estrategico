import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceConfig } from '@/lib/offlineSync';
import { useAuth } from '@/contexts/AuthContext';

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

function classifyError(error: any): string {
  const msg = String(error?.message || error || '').toLowerCase();
  if (msg.includes('failed to send') || msg.includes('fetch') || msg.includes('networkerror')) {
    return 'Erro de rede ao conectar com o servidor. Verifique sua conexão Wi-Fi/dados móveis e tente novamente.';
  }
  if (msg.includes('cors') || msg.includes('origin')) {
    return 'Erro de permissão de origem (CORS). Contate o administrador do sistema.';
  }
  if (msg.includes('not found') || msg.includes('404')) {
    return 'Serviço de autenticação não encontrado no servidor. Contate o administrador.';
  }
  if (msg.includes('device not found') || msg.includes('inactive')) {
    return 'Dispositivo não encontrado ou desativado. Escaneie o QR Code novamente.';
  }
  if (msg.includes('company not found')) {
    return 'Empresa não encontrada. Contate o administrador.';
  }
  return msg || 'Falha na autenticação do dispositivo';
}

async function invokeWithRetry(deviceToken: string, retries = MAX_RETRIES): Promise<{ data: any; error: any }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(
        'mecanico-device-auth',
        { body: { device_token: deviceToken } },
      );

      if (!error && data?.access_token) return { data, error: null };

      // Log full details for debugging
      console.error(`[device-auth] attempt ${attempt + 1}/${retries + 1} failed:`, { data, error: error?.message || error });

      // If last attempt, return the error
      if (attempt === retries) return { data, error: error || new Error(data?.error || 'Auth failed') };

      // Progressive backoff
      await new Promise(r => setTimeout(r, RETRY_BASE_MS * (attempt + 1)));
    } catch (networkErr) {
      console.error(`[device-auth] attempt ${attempt + 1}/${retries + 1} network error:`, networkErr);
      if (attempt === retries) return { data: null, error: networkErr };
      await new Promise(r => setTimeout(r, RETRY_BASE_MS * (attempt + 1)));
    }
  }
  return { data: null, error: new Error('Max retries reached') };
}

export function useMecanicoDeviceAuth() {
  const { isAuthenticated, authStatus } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const calledRef = useRef(false);

  useEffect(() => {
    // If already authenticated via normal login, skip device auth
    if (isAuthenticated && authStatus === 'authenticated') {
      setIsReady(true);
      setIsLoading(false);
      return;
    }

    // Allow re-run on retry
    if (calledRef.current && retryCount === 0) return;
    calledRef.current = true;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function authenticate() {
      try {
        const deviceToken = await getDeviceConfig('device_token') as string | null;
        if (!deviceToken) {
          if (!cancelled) {
            setError('Dispositivo não vinculado. Escaneie o QR Code novamente.');
            setIsLoading(false);
          }
          return;
        }

        // Check network before calling edge function
        if (!navigator.onLine) {
          if (!cancelled) {
            setError('Sem conexão com a internet. Verifique seu Wi-Fi ou dados móveis.');
            setIsLoading(false);
          }
          return;
        }

        const { data, error: fnError } = await invokeWithRetry(deviceToken);

        if (cancelled) return;

        if (fnError || !data?.access_token) {
          const rawMsg = data?.error || fnError?.message || 'Falha na autenticação do dispositivo';
          const msg = classifyError(fnError || rawMsg);
          console.error('[device-auth] final error:', { rawMsg, fnError, data });
          setError(msg);
          setIsLoading(false);
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (cancelled) return;

        if (sessionError) {
          setError(`Erro de sessão: ${sessionError.message}`);
          setIsLoading(false);
          return;
        }

        // Session set will trigger AuthContext → isAuthenticated → isReady
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setIsLoading(false);
        }
      }
    }

    authenticate();

    return () => { cancelled = true; };
  }, [isAuthenticated, authStatus, retryCount]);

  // React to AuthContext changes after session is set
  useEffect(() => {
    if (isAuthenticated && authStatus === 'authenticated') {
      setIsReady(true);
      setIsLoading(false);
      setError(null);
    }
  }, [isAuthenticated, authStatus]);

  const retry = () => {
    calledRef.current = false;
    setRetryCount(c => c + 1);
  };

  return { isReady, isLoading, error, retry };
}
