import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClassificacaoRisco = 'NEGLIGENCIAVEL' | 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
export type StatusAPR = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

export interface APRRow {
  id: string;
  empresa_id: string;
  atividade: string;
  local_setor: string | null;
  data_analise: string;
  responsavel: string;
  perigo: string;
  risco: string;
  probabilidade: number; // 1-5
  severidade: number;    // 1-5
  grau_risco: number;    // probabilidade * severidade (1-25)
  classificacao: ClassificacaoRisco;
  medidas_controle: string | null;
  responsavel_acao: string | null;
  prazo_acao: string | null;
  status: StatusAPR;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface APRInsert {
  atividade: string;
  local_setor?: string | null;
  data_analise: string;
  responsavel: string;
  perigo: string;
  risco: string;
  probabilidade: number;
  severidade: number;
  medidas_controle?: string | null;
  responsavel_acao?: string | null;
  prazo_acao?: string | null;
  status?: StatusAPR;
  observacoes?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers — Matriz de Risco 5×5
// ---------------------------------------------------------------------------

export function calcularGrauRisco(probabilidade: number, severidade: number): number {
  return probabilidade * severidade;
}

export function calcularClassificacaoRisco(grau: number): ClassificacaoRisco {
  if (grau <= 4)  return 'NEGLIGENCIAVEL';
  if (grau <= 9)  return 'BAIXO';
  if (grau <= 14) return 'MEDIO';
  if (grau <= 19) return 'ALTO';
  return 'CRITICO';
}

export const CLASSIFICACAO_LABELS: Record<ClassificacaoRisco, string> = {
  NEGLIGENCIAVEL: 'Negligenciável',
  BAIXO: 'Baixo',
  MEDIO: 'Médio',
  ALTO: 'Alto',
  CRITICO: 'Crítico',
};

export const CLASSIFICACAO_COLORS: Record<ClassificacaoRisco, string> = {
  NEGLIGENCIAVEL: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  BAIXO:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MEDIO:          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ALTO:           'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICO:        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export const STATUS_APR_LABELS: Record<StatusAPR, string> = {
  PENDENTE:      'Pendente',
  EM_ANDAMENTO:  'Em Andamento',
  CONCLUIDO:     'Concluído',
  CANCELADO:     'Cancelado',
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAPR() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['apr', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analises_risco')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as APRRow[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateAPR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (apr: APRInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const grau = calcularGrauRisco(apr.probabilidade, apr.severidade);
      const classificacao = calcularClassificacaoRisco(grau);

      return insertWithColumnFallback(
        async (payload) =>
          supabase.from('analises_risco').insert(payload).select().single(),
        {
          ...apr,
          empresa_id: tenantId,
          grau_risco: grau,
          classificacao,
          status: apr.status ?? 'PENDENTE',
        } as Record<string, unknown>,
      ) as Promise<APRRow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apr', tenantId] });
      writeAuditLog({ action: 'CREATE_APR', table: 'analises_risco', empresaId: tenantId, source: 'useAPR' });
      toast({ title: 'APR registrada', description: 'Análise Preliminar de Risco criada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao registrar APR', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateAPR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<APRRow> & { id: string }) => {
      const payload: Record<string, unknown> = { ...updates };
      if (updates.probabilidade !== undefined || updates.severidade !== undefined) {
        const prob = updates.probabilidade ?? 1;
        const sev  = updates.severidade   ?? 1;
        payload.grau_risco    = calcularGrauRisco(prob, sev);
        payload.classificacao = calcularClassificacaoRisco(payload.grau_risco as number);
      }
      const { data, error } = await supabase
        .from('analises_risco')
        .update(payload)
        .eq('id', id)
        .eq('empresa_id', tenantId!)
        .select()
        .single();
      if (error) throw error;
      return data as APRRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apr', tenantId] });
      toast({ title: 'APR atualizada' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao atualizar APR', description: e.message, variant: 'destructive' });
    },
  });
}

export function useDeleteAPR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('analises_risco')
        .delete()
        .eq('id', id)
        .eq('empresa_id', tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apr', tenantId] });
      writeAuditLog({ action: 'DELETE_APR', table: 'analises_risco', empresaId: tenantId, source: 'useAPR' });
      toast({ title: 'APR removida' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao remover APR', description: e.message, variant: 'destructive' });
    },
  });
}
