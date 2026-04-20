import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { writeAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';

export interface MecanicoLoginSession {
  session_id: string;
  login_em: string;
}

export interface MecanicoValidacaoResult {
  ok: boolean;
  resultado: string;
  mecanico_id?: string;
  mecanico_nome?: string;
  especialidade?: string;
  email?: string;
  motivo?: string;
  tentativas?: number;
  bloqueado_ate?: string;
}

/**
 * Hook para registrar login do mecânico no servidor
 * Capture IP, User Agent, etc., para auditoria
 */
export function useMecanicoLogin() {
  const { toast } = useToast();
  const _loginQc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      empresa_id: string;
      dispositivo_id?: string | null;
      mecanico_id: string;
      device_token?: string | null;
      codigo_acesso: string;
    }) => {
      // Get IP and User Agent
      const ip_address = await getClientIp();
      const user_agent = navigator.userAgent;
      const device_name = navigator.userAgent.includes('Android') ? 'Android' : navigator.platform || 'Dispositivo';

      const { data, error } = await supabase.rpc('registrar_login_mecanico', {
        p_empresa_id: input.empresa_id,
        p_dispositivo_id: input.dispositivo_id || null,
        p_mecanico_id: input.mecanico_id,
        p_device_token: input.device_token || null,
        p_codigo_acesso: input.codigo_acesso,
        p_ip_address: ip_address,
        p_user_agent: user_agent,
        p_device_name: device_name,
      });

      if (error) throw error;
      return data as MecanicoLoginSession;
    },
    onSuccess: (_data, variables) => {
      writeAuditLog({ action: 'MECANICO_LOGIN', table: 'mecanico_sessoes', empresaId: variables.empresa_id, source: 'useMecanicoSessionTracking' });
    },
    onError: (e: Error) => {
      logger.warn('mecanico_login_registration_error', { error: e.message });
      toast({ title: 'Erro ao registrar login', description: e.message, variant: 'destructive' });
    },
  });
}

/**
 * Hook para registrar logout do mecânico no servidor
 */
export function useMecanicoLogout() {
  const _logoutToast = useToast();
  const _logoutQc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { session_id: string; motivo?: string }) => {
      const { data, error } = await supabase.rpc('registrar_logout_mecanico', {
        p_session_id: input.session_id,
        p_motivo: input.motivo || 'Logout manual',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      writeAuditLog({ action: 'MECANICO_LOGOUT', table: 'mecanico_sessoes', source: 'useMecanicoSessionTracking' });
    },
    onError: (e: Error) => {
      logger.warn('mecanico_logout_registration_error', { error: e.message });
      // Don't show toast here - logout should always proceed even if logging fails
    },
  });
}

/**
 * Hook para validar credenciais do mecânico NO SERVIDOR
 * Implementa rate limiting automático
 */
export function useMecanicoValidarCredenciais() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      empresa_id: string;
      dispositivo_id?: string | null;
      codigo_acesso: string;
      senha_acesso: string;
    }) => {
      // Get IP and User Agent
      const ip_address = await getClientIp();
      const user_agent = navigator.userAgent;
      const device_name = navigator.userAgent.includes('Android') ? 'Android' : navigator.platform || 'Dispositivo';

      const { data, error } = await supabase.rpc('validar_credenciais_mecanico_servidor', {
        p_empresa_id: input.empresa_id,
        p_dispositivo_id: input.dispositivo_id || null,
        p_codigo_acesso: input.codigo_acesso,
        p_senha_acesso: input.senha_acesso,
        p_ip_address: ip_address,
        p_user_agent: user_agent,
        p_device_name: device_name,
      });

      if (error) throw error;
      return data as MecanicoValidacaoResult;
    },
    onSuccess: (_data, variables) => {
      writeAuditLog({ action: 'MECANICO_VALIDAR_CREDENCIAIS', table: 'mecanico_sessoes', empresaId: variables.empresa_id, source: 'useMecanicoSessionTracking' });
    },
    onError: (e: Error) => {
      logger.warn('mecanico_validation_error', { error: e.message });
      toast({ title: 'Erro na validação', description: e.message, variant: 'destructive' });
    },
  });
}

/**
 * Hook para obter lista de mecânicos online agora (real-time)
 */
export function useMecanicosOnlineAgora(empresaId?: string) {
  return useQuery({
    queryKey: ['mecanicos-online-agora', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('v_mecanicos_online_agora')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('login_em', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId,
    refetchInterval: 10000,
  });
}

/**
 * Hook para obter relatório de sessões de mecânicos (histórico)
 */
export function useRelatorioSessoesMecanicos(filters?: {
  mecanico_id?: string;
  empresa_id?: string;
  data_inicio?: string;
  data_fim?: string;
}) {
  return useQuery({
    queryKey: ['relatorio-sessoes-mecanicos', filters],
    queryFn: async () => {
      let query = supabase.from('v_relatorio_mecanicos_sessoes').select('*');

      if (filters?.mecanico_id) {
        query = query.eq('mecanico_id', filters.mecanico_id);
      }
      if (filters?.empresa_id) {
        query = query.eq('empresa_id', filters.empresa_id);
      }
      if (filters?.data_inicio) {
        query = query.gte('login_em', filters.data_inicio);
      }
      if (filters?.data_fim) {
        query = query.lte('logout_em', filters.data_fim);
      }

      const { data, error } = await query.order('login_em', { ascending: false }).limit(500);

      if (error) throw error;
      return data || [];
    },
    enabled: !!filters?.empresa_id || !!filters?.mecanico_id,
  });
}

/**
 * Hook para obter devices bloqueados (admin)
 */
export function useDevicesBloqueados(empresa_id?: string) {
  return useQuery({
    queryKey: ['devices-bloqueados', empresa_id],
    queryFn: async () => {
      if (!empresa_id) return [];
      const { data, error } = await supabase
        .from('v_devices_bloqueados')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('bloqueado_em', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresa_id,
  });
}

/**
 * Helper: Get client IP address (best effort)
 */
async function getClientIp(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      mode: 'cors',
    });
    if (response.ok) {
      const data = await response.json();
      return data.ip || null;
    }
  } catch {
    // Fallback if external IP fetch fails
  }
  return null;
}

/**
 * Helper: Save encrypted device token in localStorage
 * Basic XOR-based encryption (not cryptographically strong, but better than plain text)
 */
export function saveEncryptedDeviceToken(token: string, empresa_id: string) {
  try {
    const key = `device-key-${empresa_id}`.substring(0, 16).padEnd(16, '0');
    const encrypted = xorEncrypt(token, key);
    localStorage.setItem(`pcm_device_token_${empresa_id}`, encrypted);
  } catch (e) {
    logger.warn('mecanico_encryption_error', { error: String(e) });
    // Fallback: save plain token
    localStorage.setItem(`pcm_device_token_${empresa_id}`, token);
  }
}

/**
 * Helper: Retrieve and decrypt device token
 */
export function getEncryptedDeviceToken(empresa_id: string): string | null {
  try {
    const encrypted = localStorage.getItem(`pcm_device_token_${empresa_id}`);
    if (!encrypted) return null;

    const key = `device-key-${empresa_id}`.substring(0, 16).padEnd(16, '0');
    const decrypted = xorDecrypt(encrypted, key);
    return decrypted;
  } catch (e) {
    logger.warn('mecanico_decryption_error', { error: String(e) });
    return null;
  }
}

/**
 * Basic XOR cipher (for obfuscation, not real security)
 */
function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result); // Base64 encode
}

function xorDecrypt(encoded: string, key: string): string {
  const text = atob(encoded); // Base64 decode
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

import { useQuery } from '@tanstack/react-query';
