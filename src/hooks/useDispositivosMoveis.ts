import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { writeAuditLog } from '@/lib/audit';

export interface DispositivoMovel {
  id: string;
  empresa_id: string;
  device_id: string;
  device_nome: string | null;
  device_os: string | null;
  token: string;
  mecanico_ultimo_id: string | null;
  ultimo_acesso: string | null;
  ultimo_ip: string | null;
  os_pendentes_offline: number;
  ativo: boolean;
  desativado_por: string | null;
  desativado_em: string | null;
  motivo_desativacao: string | null;
  created_at: string;
}

export interface QRCodeVinculacao {
  id: string;
  empresa_id: string;
  token: string;
  tipo: 'UNICO' | 'MULTIPLO';
  usos: number;
  max_usos: number | null;
  expira_em: string | null;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

/* ─── Dispositivos ─── */

export function useDispositivosMoveis(empresaId?: string) {
  const { tenantId } = useAuth();
  const eid = empresaId || tenantId;

  return useQuery({
    queryKey: ['dispositivos-moveis', eid],
    queryFn: async () => {
      if (!eid) throw new Error('empresa_id obrigatório');
      const { data, error } = await supabase
        .from('dispositivos_moveis')
        .select('*')
        .eq('empresa_id', eid)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as DispositivoMovel[];
    },
    enabled: !!eid,
  });
}

export function useToggleDispositivo() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ativo, motivo }: { id: string; ativo: boolean; motivo?: string }) => {
      const updates: Record<string, unknown> = { ativo };
      if (!ativo) {
        updates.desativado_em = new Date().toISOString();
        updates.motivo_desativacao = motivo || 'Desativado pelo administrador';
      } else {
        updates.desativado_em = null;
        updates.desativado_por = null;
        updates.motivo_desativacao = null;
      }
      if (!tenantId) throw new Error('empresa_id obrigatório');
      const { error } = await supabase.from('dispositivos_moveis').update(updates).eq('id', id).eq('empresa_id', tenantId);
      if (error) throw error;
    },
    onSuccess: (_, { id, ativo }) => {
      qc.invalidateQueries({ queryKey: ['dispositivos-moveis'] });
      toast({ title: ativo ? 'Dispositivo reativado' : 'Dispositivo desativado' });
      writeAuditLog({ action: ativo ? 'REATIVAR_DISPOSITIVO' : 'DESATIVAR_DISPOSITIVO', table: 'dispositivos_moveis', recordId: id, empresaId: tenantId, source: 'useDispositivosMoveis', severity: 'warning' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useRemoveDispositivo() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('empresa_id obrigatório');
      const { error } = await supabase.from('dispositivos_moveis').delete().eq('id', id).eq('empresa_id', tenantId);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      qc.invalidateQueries({ queryKey: ['dispositivos-moveis'] });
      toast({ title: 'Dispositivo removido' });
      writeAuditLog({ action: 'REMOVE_DISPOSITIVO', table: 'dispositivos_moveis', recordId: deletedId, empresaId: tenantId, source: 'useDispositivosMoveis', severity: 'warning' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDesativarTodosDispositivos() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (empresaId: string) => {
      const { error } = await supabase.from('dispositivos_moveis')
        .update({
          ativo: false,
          desativado_em: new Date().toISOString(),
          motivo_desativacao: 'Todos os dispositivos desativados pelo administrador',
        })
        .eq('empresa_id', empresaId)
        .eq('ativo', true);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispositivos-moveis'] });
      toast({ title: 'Todos os dispositivos desativados' });
      writeAuditLog({ action: 'DESATIVAR_TODOS_DISPOSITIVOS', table: 'dispositivos_moveis', empresaId: tenantId, source: 'useDispositivosMoveis', severity: 'warning' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

/* ─── QR Codes ─── */

export function useQRCodesVinculacao(empresaId?: string) {
  const { tenantId } = useAuth();
  const eid = empresaId || tenantId;

  return useQuery({
    queryKey: ['qrcodes-vinculacao', eid],
    queryFn: async () => {
      if (!eid) throw new Error('empresa_id obrigatório');
      const { data, error } = await supabase
        .from('qrcodes_vinculacao')
        .select('*')
        .eq('empresa_id', eid)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as QRCodeVinculacao[];
    },
    enabled: !!eid,
  });
}

export function useCreateQRCode() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      empresa_id: string;
      tipo: 'UNICO' | 'MULTIPLO';
      max_usos?: number;
      expira_em?: string;
      created_by?: string;
    }) => {
      const { data, error } = await supabase.from('qrcodes_vinculacao').insert(input).select().single();
      if (error) throw error;
      return data as QRCodeVinculacao;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['qrcodes-vinculacao'] });
      toast({ title: 'QR Code gerado!' });
      writeAuditLog({ action: 'CREATE_QRCODE_VINCULACAO', table: 'qrcodes_vinculacao', recordId: data.id, empresaId: tenantId, source: 'useDispositivosMoveis', metadata: { tipo: data.tipo } });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useRevogarQRCode() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('empresa_id obrigatório');
      const { error } = await supabase.from('qrcodes_vinculacao').update({ ativo: false }).eq('id', id).eq('empresa_id', tenantId);
      if (error) throw error;
      return id;
    },
    onSuccess: (revokedId) => {
      qc.invalidateQueries({ queryKey: ['qrcodes-vinculacao'] });
      toast({ title: 'QR Code revogado' });
      writeAuditLog({ action: 'REVOGAR_QRCODE', table: 'qrcodes_vinculacao', recordId: revokedId, empresaId: tenantId, source: 'useDispositivosMoveis', severity: 'warning' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

/* ─── RPC: Vincular Dispositivo (chamado pelo app mobile) ─── */

export function useVincularDispositivo() {
  return useMutation({
    mutationFn: async (input: {
      p_qr_token: string;
      p_device_id: string;
      p_device_nome?: string;
      p_device_os?: string;
    }) => {
      const { data, error } = await supabase.rpc('vincular_dispositivo', input);
      if (error) throw error;
      return data as { ok: boolean; erro?: string; device_token?: string; dispositivo_id?: string; empresa_id?: string; empresa_nome?: string; tenant_slug?: string };
    },
  });
}

export function useVerificarDispositivo() {
  return useMutation({
    mutationFn: async (deviceToken: string) => {
      const { data, error } = await supabase.rpc('verificar_dispositivo', { p_device_token: deviceToken });
      if (error) throw error;
      return data as { ok: boolean; status: string; motivo?: string; dispositivo_id?: string; empresa_id?: string; empresa_nome?: string; tenant_slug?: string };
    },
  });
}
