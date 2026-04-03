import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceConfig } from '@/lib/offlineSync';
import { useAuth } from '@/contexts/AuthContext';

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

/**
 * Chama a edge function mecanico-device-auth.
 * A edge function SEMPRE retorna HTTP 200 com { ok: true/false, ... }.
 * Isso evita o bug do supabase-js que descarta o body em respostas non-2xx.
 */
async function invokeWithRetry(
  deviceToken: string,
  retries = MAX_RETRIES,
): Promise<{ data: any; networkError: string | null }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Verifica rede antes de cada tentativa
      if (!navigator.onLine) {
        if (attempt === retries)
          return { data: null, networkError: 'Sem conexão com a internet. Verifique seu Wi-Fi ou dados móveis.' };
        await new Promise(r => setTimeout(r, RETRY_BASE_MS * (attempt + 1)));
        continue;
      }

      const { data, error } = await supabase.functions.invoke(
        'mecanico-device-auth',
        { body: { device_token: deviceToken } },
      );

      // Se recebeu data com ok:true e access_token, sucesso imediato
      if (data?.ok && data?.access_token) {
        return { data, networkError: null };
      }

      // Se recebeu data com ok:false, é erro de negócio — não faz retry
      if (data && data.ok === false) {
        console.warn(`[device-auth] erro de negócio:`, data.error);
        return { data, networkError: null };
      }

      // Se error do supabase-js (ex: rede), faz retry
      if (error) {
        const msg = String(error.message || error);
        console.error(`[device-auth] attempt ${attempt + 1}/${retries + 1}:`, msg);
        if (attempt === retries) return { data: null, networkError: msg };
        await new Promise(r => setTimeout(r, RETRY_BASE_MS * (attempt + 1)));
        continue;
      }

      // Resposta inesperada — trata como erro
      console.error(`[device-auth] unexpected response:`, data);
      if (attempt === retries) return { data, networkError: null };
      await new Promise(r => setTimeout(r, RETRY_BASE_MS * (attempt + 1)));
    } catch (networkErr: any) {
      console.error(`[device-auth] attempt ${attempt + 1}/${retries + 1} exception:`, networkErr);
      if (attempt === retries)
        return { data: null, networkError: networkErr?.message || String(networkErr) };
      await new Promise(r => setTimeout(r, RETRY_BASE_MS * (attempt + 1)));
    }
  }
  return { data: null, networkError: 'Máximo de tentativas atingido' };
}

function humanizeError(rawError: string | null | undefined): string {
  if (!rawError) return 'Falha na autenticação do dispositivo';
  const msg = rawError.toLowerCase();
  if (msg.includes('rede') || msg.includes('fetch') || msg.includes('network') || msg.includes('failed to send'))
    return 'Erro de rede. Verifique sua conexão Wi-Fi/dados móveis e tente novamente.';
  if (msg.includes('cors') || msg.includes('origin'))
    return 'Erro de permissão de origem (CORS). Contate o administrador.';
  // Retorna o erro original — a edge function já manda em PT-BR
  return rawError;
}

export function useMecanicoDeviceAuth() {
  const { isAuthenticated, authStatus } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const calledRef = useRef(false);

  useEffect(() => {
    // Se já autenticado via login normal, pula device auth
    if (isAuthenticated && authStatus === 'authenticated') {
      setIsReady(true);
      setIsLoading(false);
      return;
    }

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

        const { data, networkError } = await invokeWithRetry(deviceToken);
        if (cancelled) return;

        // Erro de rede puro (não chegou no servidor)
        if (networkError) {
          setError(humanizeError(networkError));
          setIsLoading(false);
          return;
        }

        // Erro de negócio retornado pela edge function
        if (!data?.ok) {
          const msg = data?.error || 'Falha na autenticação do dispositivo';
          console.error('[device-auth] business error:', msg, data?.detail);
          setError(humanizeError(msg));
          setIsLoading(false);
          return;
        }

        // Sucesso — define sessão Supabase
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (cancelled) return;

        if (sessionError) {
          setError(`Erro ao definir sessão: ${sessionError.message}`);
          setIsLoading(false);
          return;
        }

        // setSession dispara AuthContext → isAuthenticated → isReady
      } catch (err: any) {
        if (!cancelled) {
          setError(humanizeError(err?.message || String(err)));
          setIsLoading(false);
        }
      }
    }

    authenticate();
    return () => { cancelled = true; };
  }, [isAuthenticated, authStatus, retryCount]);

  // Reage a mudanças do AuthContext após setSession
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
