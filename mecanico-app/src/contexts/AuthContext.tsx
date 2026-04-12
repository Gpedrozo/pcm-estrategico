// ============================================================
// Auth Context v2.1 — QR Binding + JWT session + Mecânico Login
// After device binding we call the mecanico-device-auth edge
// function to obtain a real Supabase JWT so all subsequent
// queries run as `authenticated` (matching existing RLS).
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase, setGlobalAuth, clearGlobalAuth } from '../lib/supabase';
import { logger } from '../lib/logger';
import type { Mecanico } from '../types';

// Sensitive tokens use SecureStore; non-sensitive data uses AsyncStorage
const STORAGE_KEYS = {
  EMPRESA_ID: '@pcm:empresa_id',
  EMPRESA_NOME: '@pcm:empresa_nome',
  DEVICE_TOKEN: '@pcm:device_token',
  DEVICE_ID: '@pcm:device_id',
  MECANICO_ID: '@pcm:mecanico_id',
  MECANICO_NOME: '@pcm:mecanico_nome',
  MECANICO_CODIGO: '@pcm:mecanico_codigo',
  ACCESS_TOKEN: 'pcm_access_token',
  REFRESH_TOKEN: 'pcm_refresh_token',
};

// Helpers for secure token storage
async function setSecureItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value);
}
async function getSecureItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}
async function deleteSecureItem(key: string) {
  await SecureStore.deleteItemAsync(key);
}

interface AuthState {
  isLoading: boolean;
  isDeviceBound: boolean;
  isLoggedIn: boolean;
  empresaId: string | null;
  empresaNome: string | null;
  mecanicoId: string | null;
  mecanicoNome: string | null;
  mecanicoCodigo: string | null;
}

interface AuthContextValue extends AuthState {
  bindDevice: (qrToken: string) => Promise<{ ok: boolean; error?: string }>;
  unbindDevice: () => Promise<void>;
  login: (codigo: string, senha: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
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
    isLoggedIn: false,
    empresaId: null,
    empresaNome: null,
    mecanicoId: null,
    mecanicoNome: null,
    mecanicoCodigo: null,
  });

  // ── Helper: obtain JWT via mecanico-device-auth edge function ──
  const obtainJwt = useCallback(async (deviceToken: string): Promise<boolean> => {
    try {
      logger.info('auth', 'Obtaining JWT via mecanico-device-auth...');
      const { data, error } = await supabase.functions.invoke('mecanico-device-auth', {
        body: { device_token: deviceToken },
      });
      if (error || !data?.ok || !data?.access_token) {
        logger.warn('auth', 'JWT fetch failed', { error: error?.message || data?.error });
        return false;
      }
      await setGlobalAuth(data.access_token, data.refresh_token || data.access_token);
      await setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
      if (data.refresh_token) await setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
      logger.info('auth', 'JWT set OK, role=authenticated');
      return true;
    } catch (e: any) {
      logger.warn('auth', 'obtainJwt exception', { error: e?.message });
      return false;
    }
  }, []);

  // ── Restore persisted state on mount ──
  useEffect(() => {
    (async () => {
      try {
        const [empresaId, empresaNome, deviceToken, mecanicoId, mecanicoNome, mecanicoCodigo] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.EMPRESA_ID),
            AsyncStorage.getItem(STORAGE_KEYS.EMPRESA_NOME),
            AsyncStorage.getItem(STORAGE_KEYS.DEVICE_TOKEN),
            AsyncStorage.getItem(STORAGE_KEYS.MECANICO_ID),
            AsyncStorage.getItem(STORAGE_KEYS.MECANICO_NOME),
            AsyncStorage.getItem(STORAGE_KEYS.MECANICO_CODIGO),
          ]);

        // Re-authenticate device to get fresh JWT (tokens expire)
        if (deviceToken) {
          await obtainJwt(deviceToken);
        }

        setState({
          isLoading: false,
          isDeviceBound: !!empresaId,
          isLoggedIn: !!mecanicoId,
          empresaId,
          empresaNome,
          mecanicoId,
          mecanicoNome,
          mecanicoCodigo,
        });
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    })();
  }, [obtainJwt]);

  // ── Bind device via QR token → RPC vincular_dispositivo ──
  const bindDevice = useCallback(async (qrToken: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      // Clear any stale Supabase auth session from previous app version
      await clearGlobalAuth();

      // Generate a stable device_id per installation
      let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      if (!deviceId) {
        deviceId = 'rn-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      }

      logger.info('auth', 'Calling vincular_dispositivo', { token: qrToken.slice(0, 8) + '...' });

      const { data, error } = await supabase.rpc('vincular_dispositivo', {
        p_qr_token: qrToken,
        p_device_id: deviceId,
        p_device_nome: Platform.OS === 'ios' ? 'iPhone' : 'Android',
        p_device_os: `${Platform.OS} ${Platform.Version}`,
      });

      if (error) {
        console.error('[bindDevice] RPC error:', error.code, error.message, error.hint);
        return { ok: false, error: error.message };
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (!result?.ok) return { ok: false, error: result?.error || 'Falha na vinculação' };

      const empresaId = result.empresa_id;
      const empresaNome = result.empresa_nome || 'Empresa';
      const deviceToken = result.device_token;

      await AsyncStorage.setItem(STORAGE_KEYS.EMPRESA_ID, empresaId);
      await AsyncStorage.setItem(STORAGE_KEYS.EMPRESA_NOME, empresaNome);
      if (deviceToken) await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_TOKEN, deviceToken);

      // Obtain JWT so all subsequent queries use authenticated role
      if (deviceToken) {
        await obtainJwt(deviceToken);
      }

      setState((s) => ({
        ...s,
        isDeviceBound: true,
        empresaId,
        empresaNome,
      }));

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Erro ao vincular dispositivo' };
    }
  }, [obtainJwt]);

  // ── Unbind device (clear everything + drop JWT) ──
  const unbindDevice = useCallback(async () => {
    await clearGlobalAuth();
    await deleteSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
    await deleteSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS).filter(k => !k.startsWith('pcm_')));
    setState({
      isLoading: false,
      isDeviceBound: false,
      isLoggedIn: false,
      empresaId: null,
      empresaNome: null,
      mecanicoId: null,
      mecanicoNome: null,
      mecanicoCodigo: null,
    });
  }, []);

  // ── Login mecânico via RPC (anon-safe, SECURITY DEFINER) ──
  const login = useCallback(
    async (codigo: string, senha: string): Promise<{ ok: boolean; error?: string }> => {
      if (!state.empresaId) return { ok: false, error: 'Dispositivo não vinculado' };

      try {
        const { data: result, error: rpcError } = await supabase.rpc('login_mecanico', {
          p_empresa_id: state.empresaId,
          p_codigo: codigo,
          p_senha: senha,
        });

        if (rpcError) return { ok: false, error: rpcError.message || 'Erro ao autenticar' };
        if (!result || !result.ok) return { ok: false, error: result?.error || 'Código de acesso não encontrado' };

        // Persist login
        await AsyncStorage.setItem(STORAGE_KEYS.MECANICO_ID, result.mecanico_id);
        await AsyncStorage.setItem(STORAGE_KEYS.MECANICO_NOME, result.mecanico_nome);
        await AsyncStorage.setItem(STORAGE_KEYS.MECANICO_CODIGO, result.codigo_acesso);

        setState((s) => ({
          ...s,
          isLoggedIn: true,
          mecanicoId: result.mecanico_id,
          mecanicoNome: result.mecanico_nome,
          mecanicoCodigo: result.codigo_acesso,
        }));

        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Erro inesperado' };
      }
    },
    [state.empresaId],
  );

  // ── Logout (keep device bound, clear mecanico) ──
  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.MECANICO_ID,
      STORAGE_KEYS.MECANICO_NOME,
      STORAGE_KEYS.MECANICO_CODIGO,
    ]);
    setState((s) => ({
      ...s,
      isLoggedIn: false,
      mecanicoId: null,
      mecanicoNome: null,
      mecanicoCodigo: null,
    }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, bindDevice, unbindDevice, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}