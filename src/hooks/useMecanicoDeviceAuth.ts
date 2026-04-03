import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceConfig } from '@/lib/offlineSync';
import { useAuth } from '@/contexts/AuthContext';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function invokeWithRetry(deviceToken: string, retries = MAX_RETRIES): Promise<{ data: any; error: any }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data, error } = await supabase.functions.invoke(
      'mecanico-device-auth',
      { body: { device_token: deviceToken } },
    );
    if (!error && data?.access_token) return { data, error: null };
    if (attempt < retries) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
    } else {
      return { data, error };
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
          setError('Dispositivo não vinculado');
          setIsLoading(false);
          return;
        }

        const { data, error: fnError } = await invokeWithRetry(deviceToken);

        if (cancelled) return;

        if (fnError || !data?.access_token) {
          setError(data?.error || fnError?.message || 'Failed to send a request to the Edge Function');
          setIsLoading(false);
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (cancelled) return;

        if (sessionError) {
          setError(sessionError.message);
          setIsLoading(false);
          return;
        }
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

  useEffect(() => {
    if (isAuthenticated && authStatus === 'authenticated') {
      setIsReady(true);
      setIsLoading(false);
    }
  }, [isAuthenticated, authStatus]);

  const retry = () => setRetryCount(c => c + 1);

  return { isReady, isLoading, error, retry };
}
