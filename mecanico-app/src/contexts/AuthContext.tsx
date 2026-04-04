// ============================================================
// Auth Context — Device-based auth via QR Code binding
// ============================================================

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';
import {
  getDeviceConfig,
  saveDeviceConfig,
  clearDeviceConfig,
} from '../lib/database';
import { startSyncTimer, stopSyncTimer, runSyncCycle } from '../lib/syncEngine';

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

interface AuthState {
  isLoading: boolean;
  isDeviceBound: boolean;
  isAuthenticated: boolean;
  empresaId: string | null;
  empresaNome: string | null;
  mecanicoId: string | null;
  mecanicoNome: string | null;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  bindDevice: (qrToken: string) => Promise<{ ok: boolean; error?: string }>;
  authenticateDevice: () => Promise<void>;
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
    error: null,
  });

  const lastActivityRef = useRef(Date.now());
  const retryCountRef = useRef(0);
  const autoAuthAttemptRef = useRef(0);

  // Track user activity for inactivity timeout
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // ── Check if device is bound (has device_token) ──
  const checkDeviceBinding = useCallback(async () => {
    setState((s: AuthState) => ({ ...s, isLoading: true, error: null }));
    try {
      const deviceToken = await getDeviceConfig('device_token');
      const empresaId = await getDeviceConfig('empresa_id');
      const empresaNome = await getDeviceConfig('empresa_nome');

      if (deviceToken) {
        setState((s: AuthState) => ({
          ...s,
          isDeviceBound: true,
          empresaId,
          empresaNome,
          isLoading: false,
        }));
      } else {
        setState((s: AuthState) => ({
          ...s,
          isDeviceBound: false,
          isAuthenticated: false,
          isLoading: false,
        }));
      }
    } catch (err: any) {
      setState((s: AuthState) => ({
        ...s,
        isLoading: false,
        error: 'Erro ao verificar dispositivo',
      }));
    }
  }, []);

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

        // Set Supabase session (bind+auth in one step)
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          setState((s: AuthState) => ({
            ...s,
            isDeviceBound: true,
            empresaId: data.empresa_id,
            empresaNome: data.empresa_nome,
            isLoading: false,
            error: `Vinculado, mas erro de sessão: ${sessionError.message}`,
          }));
          return { ok: true }; // bound but not authenticated yet
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

      // Set Supabase session with tokens from edge function
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) {
        setState((s: AuthState) => ({
          ...s,
          isLoading: false,
          error: `Erro de sessão: ${sessionError.message}`,
        }));
        return;
      }

      // Update local config
      if (data.empresa_id) await saveDeviceConfig('empresa_id', data.empresa_id);
      if (data.empresa_nome) await saveDeviceConfig('empresa_nome', data.empresa_nome);
      if (data.dispositivo_id) await saveDeviceConfig('dispositivo_id', data.dispositivo_id);

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
    }
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
      error: null,
    });
  }, []);

  const retry = useCallback(() => {
    retryCountRef.current++;
    autoAuthAttemptRef.current = 0; // reset auto-auth attempts on manual retry
    setState((s: AuthState) => ({ ...s, error: null }));
    checkDeviceBinding();
  }, [checkDeviceBinding]);

  // ── Initial check on mount ──
  useEffect(() => {
    checkDeviceBinding();
  }, [checkDeviceBinding]);

  // ── Auto-authenticate when device is bound but not authenticated ──
  useEffect(() => {
    if (state.isDeviceBound && !state.isAuthenticated && !state.isLoading && !state.error) {
      if (autoAuthAttemptRef.current < 2) {
        autoAuthAttemptRef.current++;
        authenticateDevice();
      }
    }
    // Reset counter on successful auth
    if (state.isAuthenticated) {
      autoAuthAttemptRef.current = 0;
    }
  }, [state.isDeviceBound, state.isAuthenticated, state.isLoading, state.error, authenticateDevice]);

  // ── Inactivity timeout ──
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed > INACTIVITY_TIMEOUT_MS && state.isAuthenticated) {
          // Session expired — re-authenticate silently
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
  let id = await getDeviceConfig('pcm_device_id');
  if (!id) {
    id = generateUUID();
    await saveDeviceConfig('pcm_device_id', id);
  }
  return id;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
