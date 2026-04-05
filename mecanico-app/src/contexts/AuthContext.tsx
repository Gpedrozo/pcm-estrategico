// ============================================================
// Auth Context v2.0 — QR Binding + Mecânico Login (simples)
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { Mecanico } from '../types';

const STORAGE_KEYS = {
  EMPRESA_ID: '@pcm:empresa_id',
  EMPRESA_NOME: '@pcm:empresa_nome',
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
  bindDevice: (empresaId: string, empresaNome: string) => Promise<void>;
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

  // ── Bind device to an empresa (via QR code data) ──
  const bindDevice = useCallback(async (empresaId: string, empresaNome: string) => {
    await AsyncStorage.setItem(STORAGE_KEYS.EMPRESA_ID, empresaId);
    await AsyncStorage.setItem(STORAGE_KEYS.EMPRESA_NOME, empresaNome);
    setState((s) => ({
      ...s,
      isDeviceBound: true,
      empresaId,
      empresaNome,
    }));
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
