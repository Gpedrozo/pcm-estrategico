// ============================================================
// Auth Context — Device-based auth via QR Code binding
// ============================================================

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import {
  getDeviceConfig,
  saveDeviceConfig,
  clearDeviceConfig,
  upsertMecanico,
} from '../lib/database';
import { startSyncTimer, stopSyncTimer, runSyncCycle } from '../lib/syncEngine';

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const AUTO_AUTH_MAX_ATTEMPTS = 3;
const AUTO_AUTH_COOLDOWN_MS = 5_000; // 5s between auto-auth attempts

interface AuthState {
  isLoading: boolean;
  isDeviceBound: boolean;
  isAuthenticated: boolean;
  empresaId: string | null;
  empresaNome: string | null;
  mecanicoId: string | null;
  mecanicoNome: string | null;
  mecanicoSelected: boolean;
  error: string | null;
  /** True when auto-auth attempts are exhausted without success */
  authExhausted: boolean;
}

interface AuthContextValue extends AuthState {
  bindDevice: (qrToken: string) => Promise<{ ok: boolean; error?: string }>;
  authenticateDevice: () => Promise<void>;
  selectMecanico: (id: string, nome: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isDeviceBound: false,
    isAuthenticated: false,
    empresaId: null,
    empresaNome: null,
    mecanicoId: null,
    mecanicoNome: null,
    mecanicoSelected: false,
    error: null,
    authExhausted: false,
  });

  const lastActivityRef = useRef(Date.now());
  const retryCountRef = useRef(0);
  const autoAuthAttemptRef = useRef(0);
  const lastAutoAuthTimestampRef = useRef(0);
  const isAuthenticatingRef = useRef(false);
  const mountedRef = useRef(true);

  // Track user activity for inactivity timeout
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // ── Check if Supabase already has a valid session (persisted) ──
  const checkExistingSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token && session?.user) {
        return true;
      }
    } catch {
      // ignore — will fallback to edge function auth
    }
    return false;
  }, []);

  // ── Check if device is bound (has device_token) ──
  const checkDeviceBinding = useCallback(async () => {
    setState((s: AuthState) => ({ ...s, isLoading: true, error: null, authExhausted: false }));
    try {
      const deviceToken = await getDeviceConfig('device_token');
      const empresaId = await getDeviceConfig('empresa_id');
      const empresaNome = await getDeviceConfig('empresa_nome');
      const mecanicoId = await getDeviceConfig('mecanico_id');
      const mecanicoNome = await getDeviceConfig('mecanico_nome');

      if (deviceToken) {
        // Before calling edge function, check if Supabase already has a valid session
        const hasSession = await checkExistingSession();
        if (hasSession) {
          // Session already valid — skip edge function auth entirely
          startSyncTimer();
          runSyncCycle();
          if (mountedRef.current) {
            setState((s: AuthState) => ({
              ...s,
              isDeviceBound: true,
              isAuthenticated: true,
              empresaId,
              empresaNome,
              mecanicoId: mecanicoId || null,
              mecanicoNome: mecanicoNome || null,
              mecanicoSelected: !!mecanicoId,
              isLoading: false,
              error: null,
              authExhausted: false,
            }));
          }
          return;
        }

        if (mountedRef.current) {
          setState((s: AuthState) => ({
            ...s,
            isDeviceBound: true,
            empresaId,
            empresaNome,
            mecanicoId: mecanicoId || null,
            mecanicoNome: mecanicoNome || null,
            mecanicoSelected: !!mecanicoId,
            isLoading: false,
          }));
        }
      } else {
        if (mountedRef.current) {
          setState((s: AuthState) => ({
            ...s,
            isDeviceBound: false,
            isAuthenticated: false,
            isLoading: false,
          }));
        }
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setState((s: AuthState) => ({
          ...s,
          isLoading: false,
          error: 'Erro ao verificar dispositivo',
        }));
      }
    }
  }, [checkExistingSession]);

  // ── Bind device via QR Code (calls edge function mecanico-device-auth in bind mode) ──
  const bindDevice = useCallback(async (qrToken: string): Promise<{ ok: boolean; error?: string }> => {
    setState((s: AuthState) => ({ ...s, isLoading: true, error: null }));
    try {
      const deviceId = await getOrCreateDeviceId();

      // Call edge function in bind mode (qr_token + device_id)
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/mecanico-device-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            qr_token: qrToken,
            device_id: deviceId,
            device_nome: 'Android App',
            device_os: 'React Native',
          }),
        }
      );

      const data = await response.json();

      if (data?.ok) {
        // Save device config
        await saveDeviceConfig('device_token', data.device_token);
        await saveDeviceConfig('dispositivo_id', data.dispositivo_id);
        await saveDeviceConfig('empresa_id', data.empresa_id);
        await saveDeviceConfig('empresa_nome', data.empresa_nome);
        await saveDeviceConfig('tenant_slug', data.tenant_slug);

        // Persist auth tokens for syncEngine to use directly
        if (data.access_token) await saveDeviceConfig('access_token', data.access_token);
        if (data.refresh_token) await saveDeviceConfig('refresh_token', data.refresh_token);

        // Persist mecanicos from edge function response into SQLite
        if (Array.isArray(data.mecanicos) && data.mecanicos.length > 0) {
          for (const mec of data.mecanicos) {
            await upsertMecanico({ ...mec, empresa_id: data.empresa_id, ativo: true });
          }
          console.log(`[AuthContext] ${data.mecanicos.length} mecânicos persistidos do bind`);
        }

        // Try to set Supabase session (bind+auth in one step)
        // we still consider the bind+auth successful since we have valid tokens
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
          if (sessionError) {
            console.warn('[AuthContext] setSession warning (non-fatal):', sessionError.message);
          }
        } catch (e) {
          console.warn('[AuthContext] setSession exception (non-fatal):', e);
        }

        // Start background sync
        startSyncTimer();
        runSyncCycle();

        setState((s: AuthState) => ({
          ...s,
          isDeviceBound: true,
          isAuthenticated: true,
          empresaId: data.empresa_id,
          empresaNome: data.empresa_nome,
          isLoading: false,
          error: null,
        }));

        lastActivityRef.current = Date.now();
        return { ok: true };
      } else {
        const errMsg = data?.error || 'Falha na vinculação';
        setState((s: AuthState) => ({ ...s, isLoading: false, error: errMsg }));
        return { ok: false, error: errMsg };
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro ao vincular dispositivo';
      setState((s: AuthState) => ({ ...s, isLoading: false, error: msg }));
      return { ok: false, error: msg };
    }
  }, []);

  // ── Authenticate device (calls edge function mecanico-device-auth) ──
  const authenticateDevice = useCallback(async () => {
    if (isAuthenticatingRef.current) return; // Prevent concurrent calls
    isAuthenticatingRef.current = true;
    setState((s: AuthState) => ({ ...s, isLoading: true, error: null }));
    try {
      const deviceToken = await getDeviceConfig('device_token');
      if (!deviceToken) {
        setState((s: AuthState) => ({
          ...s,
          isLoading: false,
          isDeviceBound: false,
          error: 'Dispositivo não vinculado',
        }));
        return;
      }

      // Call edge function
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/mecanico-device-auth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ device_token: deviceToken }),
        }
      );

      const data = await response.json();

      if (!data?.ok) {
        const errorMsg = data?.error || 'Falha na autenticação';
        // If device not found, clear binding
        if (errorMsg.includes('não encontrado') || errorMsg.includes('desativado')) {
          await clearDeviceConfig();
          setState((s: AuthState) => ({
            ...s,
            isLoading: false,
            isDeviceBound: false,
            isAuthenticated: false,
            error: errorMsg,
          }));
          return;
        }
        setState((s: AuthState) => ({ ...s, isLoading: false, error: errorMsg }));
        return;
      }

      // Try to set Supabase session with tokens from edge function
      // If setSession fails, we still proceed (tokens are valid for direct API calls)
      try {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) {
          console.warn('[AuthContext] setSession warning (non-fatal):', sessionError.message);
        }
      } catch (e) {
        console.warn('[AuthContext] setSession exception (non-fatal):', e);
      }

      // Update local config
      if (data.empresa_id) await saveDeviceConfig('empresa_id', data.empresa_id);
      if (data.empresa_nome) await saveDeviceConfig('empresa_nome', data.empresa_nome);
      if (data.dispositivo_id) await saveDeviceConfig('dispositivo_id', data.dispositivo_id);

      // Persist auth tokens for syncEngine to use directly
      if (data.access_token) await saveDeviceConfig('access_token', data.access_token);
      if (data.refresh_token) await saveDeviceConfig('refresh_token', data.refresh_token);

      // Persist mecanicos from edge function response into SQLite
      if (Array.isArray(data.mecanicos) && data.mecanicos.length > 0) {
        for (const mec of data.mecanicos) {
          await upsertMecanico({ ...mec, empresa_id: data.empresa_id, ativo: true });
        }
        console.log(`[AuthContext] ${data.mecanicos.length} mecânicos persistidos do re-auth`);
      }

      setState((s: AuthState) => ({
        ...s,
        isLoading: false,
        isAuthenticated: true,
        empresaId: data.empresa_id,
        empresaNome: data.empresa_nome,
        error: null,
      }));

      // Start background sync
      startSyncTimer();
      // Initial pull
      runSyncCycle();

      lastActivityRef.current = Date.now();
    } catch (err: any) {
      setState((s: AuthState) => ({
        ...s,
        isLoading: false,
        error: 'Erro de conexão. Verifique sua internet.',
      }));
    } finally {
      isAuthenticatingRef.current = false;
    }
  }, []);

  // ── Select Mecanico (quem está usando o dispositivo) ──
  const selectMecanico = useCallback(async (id: string, nome: string) => {
    await saveDeviceConfig('mecanico_id', id);
    await saveDeviceConfig('mecanico_nome', nome);
    setState((s: AuthState) => ({
      ...s,
      mecanicoId: id,
      mecanicoNome: nome,
      mecanicoSelected: true,
    }));
  }, []);

  // ── Logout ──
  const logout = useCallback(async () => {
    stopSyncTimer();
    await supabase.auth.signOut();
    await clearDeviceConfig();
    setState({
      isLoading: false,
      isDeviceBound: false,
      isAuthenticated: false,
      empresaId: null,
      empresaNome: null,
      mecanicoId: null,
      mecanicoNome: null,
      mecanicoSelected: false,
      error: null,
      authExhausted: false,
    });
  }, []);

  const retry = useCallback(() => {
    retryCountRef.current++;
    autoAuthAttemptRef.current = 0; // reset auto-auth attempts on manual retry
    lastAutoAuthTimestampRef.current = 0; // reset cooldown
    isAuthenticatingRef.current = false; // unlock
    setState((s: AuthState) => ({ ...s, error: null, authExhausted: false }));
    checkDeviceBinding();
  }, [checkDeviceBinding]);

  // ── Initial check on mount ──
  useEffect(() => {
    mountedRef.current = true;
    checkDeviceBinding();
    return () => { mountedRef.current = false; };
  }, [checkDeviceBinding]);

  // ── Listen for Supabase auth state changes (session restore, token refresh) ──
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;
      if (event === 'SIGNED_OUT') {
        setState((s: AuthState) => ({
          ...s,
          isAuthenticated: false,
        }));
      }
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        setState((s: AuthState) => {
          // Only auto-mark authenticated if device is bound
          if (s.isDeviceBound) {
            return { ...s, isAuthenticated: true, isLoading: false, error: null, authExhausted: false };
          }
          return s;
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Auto-authenticate when device is bound but not authenticated ──
  useEffect(() => {
    if (
      state.isDeviceBound &&
      !state.isAuthenticated &&
      !state.isLoading &&
      !state.error &&
      !state.authExhausted &&
      !isAuthenticatingRef.current
    ) {
      const now = Date.now();
      const elapsed = now - lastAutoAuthTimestampRef.current;
      if (autoAuthAttemptRef.current < AUTO_AUTH_MAX_ATTEMPTS && elapsed >= AUTO_AUTH_COOLDOWN_MS) {
        autoAuthAttemptRef.current++;
        lastAutoAuthTimestampRef.current = now;
        authenticateDevice();
      } else if (autoAuthAttemptRef.current >= AUTO_AUTH_MAX_ATTEMPTS) {
        // All attempts exhausted — show error instead of staying stuck
        setState((s: AuthState) => ({
          ...s,
          authExhausted: true,
          error: 'Não foi possível autenticar. Verifique sua conexão.',
        }));
      }
    }
  }, [state.isDeviceBound, state.isAuthenticated, state.isLoading, state.error, state.authExhausted, authenticateDevice]);

  // ── Inactivity timeout ──
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed > INACTIVITY_TIMEOUT_MS && state.isAuthenticated && !isAuthenticatingRef.current) {
          // Session expired — re-authenticate silently (single attempt)
          authenticateDevice();
        } else {
          updateActivity();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [state.isAuthenticated, authenticateDevice, updateActivity]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        bindDevice,
        authenticateDevice,
        selectMecanico,
        logout,
        retry,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// Helpers
// ============================================================

async function getOrCreateDeviceId(): Promise<string> {
  // 1. Tenta SecureStore (sobrevive a reinstalações)
  try {
    const stored = await SecureStore.getItemAsync('pcm_device_id');
    if (stored) return stored;
  } catch { /* ignore */ }

  // 2. Tenta SQLite (fallback)
  const fromDb = await getDeviceConfig('pcm_device_id');
  if (fromDb) {
    // Salva no SecureStore pra próxima vez
    try { await SecureStore.setItemAsync('pcm_device_id', fromDb); } catch { /* ignore */ }
    return fromDb;
  }

  // 3. Gera novo UUID e salva em ambos
  const id = generateUUID();
  await saveDeviceConfig('pcm_device_id', id);
  try { await SecureStore.setItemAsync('pcm_device_id', id); } catch { /* ignore */ }
  return id;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
