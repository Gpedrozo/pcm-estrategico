// ============================================================
// Auth Context v2.0 — QR Binding + Mecânico Login (simples)
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import type { Mecanico } from '../types';

const STORAGE_KEYS = {
  EMPRESA_ID: '@pcm:empresa_id',
  EMPRESA_NOME: '@pcm:empresa_nome',
  DEVICE_TOKEN: '@pcm:device_token',
  DEVICE_ID: '@pcm:device_id',
  MECANICO_ID: '@pcm:mecanico_id',
  MECANICO_NOME: '@pcm:mecanico_nome',
  MECANICO_CODIGO: '@pcm:mecanico_codigo',
};

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

  // ── Restore persisted state on mount ──
  useEffect(() => {
    (async () => {
      try {
        const [empresaId, empresaNome, mecanicoId, mecanicoNome, mecanicoCodigo] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEYS.EMPRESA_ID),
            AsyncStorage.getItem(STORAGE_KEYS.EMPRESA_NOME),
            AsyncStorage.getItem(STORAGE_KEYS.MECANICO_ID),
            AsyncStorage.getItem(STORAGE_KEYS.MECANICO_NOME),
            AsyncStorage.getItem(STORAGE_KEYS.MECANICO_CODIGO),
          ]);

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
  }, []);

  // ── Bind device via QR token → RPC vincular_dispositivo ──
  const bindDevice = useCallback(async (qrToken: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      // Clear any stale Supabase auth session from previous app version
      await supabase.auth.signOut().catch(() => {});

      // Generate a stable device_id per installation
      let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      if (!deviceId) {
        deviceId = 'rn-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
        await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      }

      console.log('[bindDevice] Calling vincular_dispositivo with token:', qrToken.slice(0, 8) + '...');

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
  }, []);

  // ── Unbind device (clear everything) ──
  const unbindDevice = useCallback(async () => {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
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

  // ── Login mecânico with código + senha ──
  const login = useCallback(
    async (codigo: string, senha: string): Promise<{ ok: boolean; error?: string }> => {
      if (!state.empresaId) return { ok: false, error: 'Dispositivo não vinculado' };

      try {
        // 1. Find mecanico by codigo_acesso
        const { data: mecanico, error: findError } = await supabase
          .from('mecanicos')
          .select('id, nome, codigo_acesso, senha_acesso, ativo, ferias_inicio, ferias_fim')
          .eq('empresa_id', state.empresaId)
          .eq('codigo_acesso', codigo.toUpperCase())
          .is('deleted_at', null)
          .eq('ativo', true)
          .maybeSingle();

        if (findError) return { ok: false, error: 'Erro ao buscar mecânico' };
        if (!mecanico) return { ok: false, error: 'Código de acesso não encontrado' };

        // 2. Validate password via RPC (or direct compare as fallback)
        let passwordValid = false;
        try {
          const { data: rpcResult } = await supabase.rpc('validar_senha_mecanico', {
            p_mecanico_id: mecanico.id,
            p_senha: senha,
          });
          passwordValid = rpcResult === true;
        } catch {
          // Fallback: direct compare (if RPC not available)
          passwordValid = !mecanico.senha_acesso || mecanico.senha_acesso === senha;
        }

        if (!passwordValid) return { ok: false, error: 'Senha incorreta' };

        // 3. Persist login
        await AsyncStorage.setItem(STORAGE_KEYS.MECANICO_ID, mecanico.id);
        await AsyncStorage.setItem(STORAGE_KEYS.MECANICO_NOME, mecanico.nome);
        await AsyncStorage.setItem(STORAGE_KEYS.MECANICO_CODIGO, codigo.toUpperCase());

        setState((s) => ({
          ...s,
          isLoggedIn: true,
          mecanicoId: mecanico.id,
          mecanicoNome: mecanico.nome,
          mecanicoCodigo: codigo.toUpperCase(),
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
