import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { upsertMaintenanceSchedule } from '@/services/maintenanceSchedule';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';

export interface InspecaoRow {
  id: string;
  numero_inspecao: number;
  rota_nome: string;
  descricao: string | null;
  turno: string | null;
  inspetor_nome: string;
  inspetor_id: string | null;
  data_inspecao: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  itens_inspecionados: any;
  anomalias_encontradas: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspecaoInsert {
  rota_nome: string;
  descricao?: string | null;
  turno?: string | null;
  inspetor_nome: string;
  inspetor_id?: string | null;
  data_inspecao?: string;
  hora_inicio?: string | null;
}

export interface AnomaliaRow {
  id: string;
  inspecao_id: string;
  equipamento_id: string | null;
  tag: string | null;
  descricao: string;
  severidade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
  foto_url: string | null;
  os_gerada_id: string | null;
  status: 'ABERTA' | 'EM_TRATAMENTO' | 'RESOLVIDA';
  created_at: string;
}

export function useInspecoes() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['inspecoes', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspecoes')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('data_inspecao', { ascending: false });

      if (error) throw error;
      return (data || []) as InspecaoRow[];
    },
  });
}

export function useInspecoesHoje() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['inspecoes', tenantId, 'hoje'],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('inspecoes')
        .select('*')
        .eq('empresa_id', tenantId!)
        .eq('data_inspecao', hoje)
        .order('hora_inicio');

      if (error) throw error;
      return (data || []) as InspecaoRow[];
    },
  });
}

export function useCreateInspecao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (inspecao: InspecaoInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const data = await insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('inspecoes')
            .insert(payload)
            .select()
            .single(),
        {
          ...inspecao,
          status: 'EM_ANDAMENTO',
          empresa_id: tenantId, // MUST be last to prevent spread override
        } as Record<string, unknown>,
      );

      try {
        await upsertMaintenanceSchedule({
          tipo: 'inspecao',
          origemId: data.id,
          empresaId: tenantId!,
          titulo: `Inspeção #${data.numero_inspecao} • ${data.rota_nome}`,
          descricao: data.descricao,
          dataProgramada: `${data.data_inspecao}T08:00:00.000Z`,
          status: data.status || 'programado',
          responsavel: data.inspetor_nome,
        });
      } catch { /* schedule sync best-effort */ }

      return data as InspecaoRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspecoes', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['document-sequences'] });
      writeAuditLog({ action: 'CREATE_INSPECAO', table: 'inspecoes', recordId: data?.id, empresaId: tenantId, source: 'useInspecoes', metadata: { rota_nome: data?.rota_nome } });
      toast({
        title: 'Inspeção iniciada',
        description: 'A inspeção foi registrada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar inspeção',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInspecao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InspecaoRow> & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const data = await updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('inspecoes')
            .update(payload)
            .eq('id', id)
            .eq('empresa_id', tenantId)
            .select()
            .single(),
        updates as Record<string, unknown>,
      );

      try {
        await upsertMaintenanceSchedule({
          tipo: 'inspecao',
          origemId: data.id,
          empresaId: tenantId!,
          titulo: `Inspeção #${data.numero_inspecao} • ${data.rota_nome}`,
          descricao: data.descricao,
          dataProgramada: `${data.data_inspecao}T08:00:00.000Z`,
          status: data.status || 'programado',
          responsavel: data.inspetor_nome,
        });
      } catch { /* schedule sync best-effort */ }

      return data as InspecaoRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspecoes', tenantId] });
      writeAuditLog({ action: 'UPDATE_INSPECAO', table: 'inspecoes', recordId: data?.id, empresaId: tenantId, source: 'useInspecoes', metadata: { status: data?.status } });
      toast({
        title: 'Inspeção atualizada',
        description: 'A inspeção foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar inspeção',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAnomalias(inspecaoId?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['anomalias', tenantId, inspecaoId],
    enabled: (Boolean(tenantId) && !!inspecaoId) || (Boolean(tenantId) && inspecaoId === undefined),
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase.from('anomalias_inspecao').select('*');
      query = query.eq('empresa_id', tenantId);
      
      if (inspecaoId) {
        query = query.eq('inspecao_id', inspecaoId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as AnomaliaRow[];
    },
  });
}

export function useCreateAnomalia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (anomalia: Omit<AnomaliaRow, 'id' | 'created_at' | 'os_gerada_id' | 'status'>) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('anomalias_inspecao')
            .insert(payload)
            .select()
            .single(),
        {
          ...anomalia,
          empresa_id: tenantId,
          status: 'ABERTA',
        } as Record<string, unknown>,
      ) as Promise<AnomaliaRow>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['anomalias'] });
      queryClient.invalidateQueries({ queryKey: ['inspecoes'] });
      writeAuditLog({ action: 'CREATE_ANOMALIA', table: 'anomalias_inspecao', recordId: data?.id, empresaId: tenantId, source: 'useInspecoes', metadata: { severidade: data?.severidade } });
      toast({
        title: 'Anomalia registrada',
        description: 'A anomalia foi registrada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao registrar anomalia',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
