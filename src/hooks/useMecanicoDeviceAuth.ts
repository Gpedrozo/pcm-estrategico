import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceConfig } from '@/lib/offlineSync';
import { useAuth } from '@/contexts/AuthContext';

export function useMecanicoDeviceAuth() {
  const { isAuthenticated, authStatus } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && authStatus === 'authenticated') {
      setIsReady(true);
      setIsLoading(false);
      return;
    }

    if (calledRef.current) return;
    calledRef.current = true;

    let cancelled = false;

    async function authenticate() {
      try {
        const deviceToken = await getDeviceConfig('device_token') as string | null;
        if (!deviceToken) {
          setError('Dispositivo não vinculado');
          setIsLoading(false);
          return;
        }

        const { data, error: fnError } = await supabase.functions.invoke(
          'mecanico-device-auth',
          { body: { device_token: deviceToken } },
        );

        if (cancelled) return;

        if (fnError || !data?.access_token) {
          setError(data?.error || fnError?.message || 'Falha na autenticação do dispositivo');
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
  }, [isAuthenticated, authStatus]);

  useEffect(() => {
    if (isAuthenticated && authStatus === 'authenticated') {
      setIsReady(true);
      setIsLoading(false);
    }
  }, [isAuthenticated, authStatus]);

  return { isReady, isLoading, error };
}
