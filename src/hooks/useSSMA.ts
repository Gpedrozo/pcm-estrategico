import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  checklist_seguranca: any;
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
  return useQuery({
    queryKey: ['permissoes-trabalho'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissoes_trabalho')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PermissaoTrabalhoRow[];
    },
  });
}

export function usePermissoesAbertas() {
  return useQuery({
    queryKey: ['permissoes-trabalho', 'abertas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissoes_trabalho')
        .select('*')
        .in('status', ['PENDENTE', 'APROVADA', 'EM_EXECUCAO'])
        .order('data_inicio');

      if (error) throw error;
      return data as PermissaoTrabalhoRow[];
    },
  });
}

export function useCreatePermissaoTrabalho() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (permissao: PermissaoInsert) => {
      const { data, error } = await supabase
        .from('permissoes_trabalho')
        .insert(permissao)
        .select()
        .single();

      if (error) throw error;
      return data as PermissaoTrabalhoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissoes-trabalho'] });
      toast({
        title: 'PT criada',
        description: 'A permissão de trabalho foi criada com sucesso.',
      });
    },
    onError: (error: any) => {
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

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PermissaoTrabalhoRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('permissoes_trabalho')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PermissaoTrabalhoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissoes-trabalho'] });
      toast({
        title: 'PT atualizada',
        description: 'A permissão de trabalho foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar PT',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useIncidentesSSMA() {
  return useQuery({
    queryKey: ['incidentes-ssma'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidentes_ssma')
        .select('*')
        .order('data_ocorrencia', { ascending: false });

      if (error) throw error;
      return data as IncidenteSSMARow[];
    },
  });
}

export function useCreateIncidenteSSMA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (incidente: Omit<IncidenteSSMARow, 'id' | 'numero_incidente' | 'created_at' | 'updated_at' | 'rca_id'>) => {
      const { data, error } = await supabase
        .from('incidentes_ssma')
        .insert(incidente)
        .select()
        .single();

      if (error) throw error;
      return data as IncidenteSSMARow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidentes-ssma'] });
      toast({
        title: 'Incidente registrado',
        description: 'O incidente foi registrado com sucesso.',
      });
    },
    onError: (error: any) => {
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

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IncidenteSSMARow> & { id: string }) => {
      const { data, error } = await supabase
        .from('incidentes_ssma')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as IncidenteSSMARow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidentes-ssma'] });
      toast({
        title: 'Incidente atualizado',
        description: 'O incidente foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar incidente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
