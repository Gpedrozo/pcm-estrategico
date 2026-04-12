import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { writeAuditLog } from '@/lib/audit';

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
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['rca', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { data, error } = await supabase
        .from('analise_causa_raiz')
        .select('*')
        .eq('empresa_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as RCARow[];
    },
    enabled: !!tenantId,
  });
}

export function useRCAById(id?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['rca', tenantId, id],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { data, error } = await supabase
        .from('analise_causa_raiz')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as RCARow;
    },
    enabled: !!tenantId && !!id,
  });
}

export function useCreateRCA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (rca: RCAInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('analise_causa_raiz')
            .insert(payload)
            .select()
            .single(),
        { ...rca, empresa_id: tenantId } as Record<string, unknown>,
      ) as Promise<RCARow>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rca', tenantId] });
      writeAuditLog({ action: 'CREATE_RCA', table: 'analise_causa_raiz', recordId: data?.id, empresaId: tenantId, source: 'useRCA', metadata: { metodo: data?.metodo_analise, titulo: data?.titulo } });
      toast({
        title: 'RCA criada',
        description: 'A análise de causa raiz foi criada com sucesso.',
      });
    },
    onError: (error: Error) => {
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RCARow> & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não identificado.');
      return updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('analise_causa_raiz')
            .update(payload)
            .eq('id', id)
            .eq('empresa_id', tenantId)
            .select()
            .single(),
        updates as Record<string, unknown>,
      ) as Promise<RCARow>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rca', tenantId] });
      writeAuditLog({ action: 'UPDATE_RCA', table: 'analise_causa_raiz', recordId: data?.id, empresaId: tenantId, source: 'useRCA', metadata: { status: data?.status } });
      toast({
        title: 'RCA atualizada',
        description: 'A análise de causa raiz foi atualizada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar RCA',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAcoesCorretivas(rcaId?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['acoes-corretivas', tenantId, rcaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('acoes_corretivas')
        .select('*')
        .eq('empresa_id', tenantId!)
        .eq('rca_id', rcaId!)
        .limit(500)
        .order('prazo');

      if (error) throw error;
      return data as AcaoCorretivaRow[];
    },
    enabled: !!rcaId && !!tenantId,
  });
}

export function useCreateAcaoCorretiva() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (acao: Omit<AcaoCorretivaRow, 'id' | 'created_at' | 'updated_at' | 'data_conclusao' | 'evidencias' | 'observacoes'>) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('acoes_corretivas')
            .insert(payload)
            .select()
            .single(),
        { ...acao, empresa_id: tenantId } as Record<string, unknown>,
      ) as Promise<AcaoCorretivaRow>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['acoes-corretivas'] });
      writeAuditLog({ action: 'CREATE_ACAO_CORRETIVA', table: 'acoes_corretivas', recordId: data?.id, empresaId: tenantId, source: 'useRCA' });
      toast({
        title: 'Ação criada',
        description: 'A ação corretiva foi criada com sucesso.',
      });
    },
    onError: (error: Error) => {
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AcaoCorretivaRow> & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não identificado.');
      return updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('acoes_corretivas')
            .update(payload)
            .eq('id', id)
            .eq('empresa_id', tenantId)
            .select()
            .single(),
        updates as Record<string, unknown>,
      ) as Promise<AcaoCorretivaRow>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['acoes-corretivas', tenantId] });
      writeAuditLog({ action: 'UPDATE_ACAO_CORRETIVA', table: 'acoes_corretivas', recordId: data?.id, empresaId: tenantId, source: 'useRCA', metadata: { status: data?.status } });
      toast({
        title: 'Ação atualizada',
        description: 'A ação corretiva foi atualizada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar ação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
