import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RCARow {
  id: string;
  numero_rca: number;
  os_id: string | null;
  equipamento_id: string | null;
  tag: string | null;
  titulo: string;
  descricao_problema: string;
  metodo_analise: '5_PORQUES' | 'ISHIKAWA' | 'ARVORE_FALHAS' | 'OUTRO';
  porque_1: string | null;
  porque_2: string | null;
  porque_3: string | null;
  porque_4: string | null;
  porque_5: string | null;
  causa_raiz_identificada: string | null;
  diagrama_ishikawa: any;
  arvore_falhas: any;
  status: 'EM_ANALISE' | 'CONCLUIDA' | 'VERIFICANDO_EFICACIA' | 'ENCERRADA';
  responsavel_nome: string | null;
  responsavel_id: string | null;
  data_conclusao: string | null;
  eficacia_verificada: boolean;
  created_at: string;
  updated_at: string;
}

export interface RCAInsert {
  titulo: string;
  descricao_problema: string;
  metodo_analise?: '5_PORQUES' | 'ISHIKAWA' | 'ARVORE_FALHAS' | 'OUTRO';
  os_id?: string | null;
  equipamento_id?: string | null;
  tag?: string | null;
  responsavel_nome?: string | null;
  responsavel_id?: string | null;
}

export interface AcaoCorretivaRow {
  id: string;
  rca_id: string;
  descricao: string;
  responsavel_nome: string;
  responsavel_id: string | null;
  prazo: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'ATRASADA' | 'CANCELADA';
  data_conclusao: string | null;
  evidencias: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export function useRCAs() {
  return useQuery({
    queryKey: ['rca'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analise_causa_raiz')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RCARow[];
    },
  });
}

export function useRCAById(id?: string) {
  return useQuery({
    queryKey: ['rca', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analise_causa_raiz')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as RCARow;
    },
    enabled: !!id,
  });
}

export function useCreateRCA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rca: RCAInsert) => {
      const { data, error } = await supabase
        .from('analise_causa_raiz')
        .insert(rca)
        .select()
        .single();

      if (error) throw error;
      return data as RCARow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rca'] });
      toast({
        title: 'RCA criada',
        description: 'A análise de causa raiz foi criada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar RCA',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateRCA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RCARow> & { id: string }) => {
      const { data, error } = await supabase
        .from('analise_causa_raiz')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RCARow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rca'] });
      toast({
        title: 'RCA atualizada',
        description: 'A análise de causa raiz foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar RCA',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAcoesCorretivas(rcaId?: string) {
  return useQuery({
    queryKey: ['acoes-corretivas', rcaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('acoes_corretivas')
        .select('*')
        .eq('rca_id', rcaId!)
        .order('prazo');

      if (error) throw error;
      return data as AcaoCorretivaRow[];
    },
    enabled: !!rcaId,
  });
}

export function useCreateAcaoCorretiva() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (acao: Omit<AcaoCorretivaRow, 'id' | 'created_at' | 'updated_at' | 'data_conclusao' | 'evidencias' | 'observacoes'>) => {
      const { data, error } = await supabase
        .from('acoes_corretivas')
        .insert(acao)
        .select()
        .single();

      if (error) throw error;
      return data as AcaoCorretivaRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acoes-corretivas'] });
      toast({
        title: 'Ação criada',
        description: 'A ação corretiva foi criada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar ação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateAcaoCorretiva() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AcaoCorretivaRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('acoes_corretivas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AcaoCorretivaRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acoes-corretivas'] });
      toast({
        title: 'Ação atualizada',
        description: 'A ação corretiva foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar ação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
