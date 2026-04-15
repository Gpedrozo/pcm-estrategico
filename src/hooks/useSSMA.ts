import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';
import type { Checklist } from '@/schemas/checklist.schema';

export interface PermissaoTrabalhoRow {
  id: string;
  numero_pt: number;
  os_id: string | null;
  equipamento_id: string | null;
  tag: string | null;
  tipo: 'GERAL' | 'TRABALHO_ALTURA' | 'ESPACO_CONFINADO' | 'TRABALHO_QUENTE' | 'ELETRICA' | 'ESCAVACAO';
  descricao_servico: string;
  riscos_identificados: string | null;
  medidas_controle: string | null;
  epis_requeridos: string | null;
  isolamentos: string | null;
  data_inicio: string;
  data_fim: string;
  executante_nome: string;
  supervisor_nome: string;
  aprovador_nome: string | null;
  aprovador_id: string | null;
  status: 'PENDENTE' | 'APROVADA' | 'EM_EXECUCAO' | 'CONCLUIDA' | 'CANCELADA';
  checklist_seguranca: Checklist;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermissaoInsert {
  tipo?: 'GERAL' | 'TRABALHO_ALTURA' | 'ESPACO_CONFINADO' | 'TRABALHO_QUENTE' | 'ELETRICA' | 'ESCAVACAO';
  descricao_servico: string;
  riscos_identificados?: string | null;
  medidas_controle?: string | null;
  epis_requeridos?: string | null;
  data_inicio: string;
  data_fim: string;
  executante_nome: string;
  supervisor_nome: string;
  os_id?: string | null;
  equipamento_id?: string | null;
  tag?: string | null;
}

export interface IncidenteSSMARow {
  id: string;
  numero_incidente: number;
  tipo: 'ACIDENTE' | 'QUASE_ACIDENTE' | 'INCIDENTE_AMBIENTAL' | 'DESVIO';
  severidade: 'LEVE' | 'MODERADO' | 'GRAVE' | 'FATAL';
  data_ocorrencia: string;
  local_ocorrencia: string | null;
  equipamento_id: string | null;
  tag: string | null;
  descricao: string;
  pessoas_envolvidas: string | null;
  testemunhas: string | null;
  causas_imediatas: string | null;
  causas_basicas: string | null;
  acoes_imediatas: string | null;
  rca_id: string | null;
  dias_afastamento: number;
  custo_estimado: number | null;
  status: 'ABERTO' | 'EM_INVESTIGACAO' | 'AGUARDANDO_ACOES' | 'ENCERRADO';
  responsavel_nome: string | null;
  responsavel_id: string | null;
  created_at: string;
  updated_at: string;
}

export function usePermissoesTrabalho() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['permissoes-trabalho', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissoes_trabalho')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as PermissaoTrabalhoRow[];
    },
    enabled: !!tenantId,
  });
}

export function usePermissoesAbertas() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['permissoes-trabalho', tenantId, 'abertas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissoes_trabalho')
        .select('*')
        .eq('empresa_id', tenantId!)
        .in('status', ['PENDENTE', 'APROVADA', 'EM_EXECUCAO'])
        .order('data_inicio')
        .limit(500);

      if (error) throw error;
      return data as PermissaoTrabalhoRow[];
    },
    enabled: !!tenantId,
  });
}

export function useCreatePermissaoTrabalho() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (permissao: PermissaoInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('permissoes_trabalho')
            .insert(payload)
            .select()
            .single(),
        { ...permissao, empresa_id: tenantId } as Record<string, unknown>,
      ) as Promise<PermissaoTrabalhoRow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissoes-trabalho', tenantId] });
      writeAuditLog({ action: 'CREATE_PERMISSAO_TRABALHO', table: 'permissoes_trabalho', empresaId: tenantId, source: 'useSSMA' });
      toast({
        title: 'PT criada',
        description: 'A permissão de trabalho foi criada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar PT',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePermissaoTrabalho() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PermissaoTrabalhoRow> & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('permissoes_trabalho')
            .update(payload)
            .eq('id', id)
            .eq('empresa_id', tenantId)
            .select()
            .single(),
        updates as Record<string, unknown>,
      ) as Promise<PermissaoTrabalhoRow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissoes-trabalho', tenantId] });
      writeAuditLog({ action: 'UPDATE_PERMISSAO_TRABALHO', table: 'permissoes_trabalho', empresaId: tenantId, source: 'useSSMA' });
      toast({
        title: 'PT atualizada',
        description: 'A permissão de trabalho foi atualizada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar PT',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useIncidentesSSMA() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['incidentes-ssma', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidentes_ssma')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('data_ocorrencia', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as IncidenteSSMARow[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateIncidenteSSMA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (incidente: Omit<IncidenteSSMARow, 'id' | 'numero_incidente' | 'created_at' | 'updated_at' | 'rca_id'>) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('incidentes_ssma')
            .insert(payload)
            .select()
            .single(),
        { ...incidente, empresa_id: tenantId } as Record<string, unknown>,
      ) as Promise<IncidenteSSMARow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidentes-ssma', tenantId] });
      writeAuditLog({ action: 'CREATE_INCIDENTE_SSMA', table: 'incidentes_ssma', empresaId: tenantId, source: 'useSSMA' });
      toast({
        title: 'Incidente registrado',
        description: 'O incidente foi registrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao registrar incidente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateIncidenteSSMA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IncidenteSSMARow> & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('incidentes_ssma')
            .update(payload)
            .eq('id', id)
            .eq('empresa_id', tenantId)
            .select()
            .single(),
        updates as Record<string, unknown>,
      ) as Promise<IncidenteSSMARow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidentes-ssma', tenantId] });
      writeAuditLog({ action: 'UPDATE_INCIDENTE_SSMA', table: 'incidentes_ssma', empresaId: tenantId, source: 'useSSMA' });
      toast({
        title: 'Incidente atualizado',
        description: 'O incidente foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar incidente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
