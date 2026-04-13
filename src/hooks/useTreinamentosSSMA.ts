import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TipoCurso =
  | 'NR-05' | 'NR-06' | 'NR-10' | 'NR-11' | 'NR-12' | 'NR-13'
  | 'NR-17' | 'NR-20' | 'NR-23' | 'NR-33' | 'NR-35'
  | 'CIPA' | 'BRIGADA' | 'PRIMEIRO_SOCORRO' | 'EMPILHADEIRA'
  | 'PONTE_ROLANTE' | 'INTEGRACAO' | 'OUTRO';

export type StatusTreinamento = 'VALIDO' | 'PROXIMO_VENCIMENTO' | 'VENCIDO';

export interface TreinamentoSSMARow {
  id: string;
  empresa_id: string;
  colaborador_id: string | null;
  colaborador_nome: string;
  tipo_curso: TipoCurso;
  nome_curso: string;
  instituicao: string | null;
  carga_horaria: number | null;
  data_realizacao: string;
  data_validade: string | null;
  dias_alerta_antes: number;
  status: StatusTreinamento;
  numero_certificado: string | null;
  certificado_url: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreinamentoInsert {
  colaborador_id?: string | null;
  colaborador_nome: string;
  tipo_curso: TipoCurso;
  nome_curso: string;
  instituicao?: string | null;
  carga_horaria?: number | null;
  data_realizacao: string;
  data_validade?: string | null;
  dias_alerta_antes?: number;
  numero_certificado?: string | null;
  certificado_url?: string | null;
  observacoes?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers — calcula status no frontend para feedback imediato
// ---------------------------------------------------------------------------

export function calcularStatusTreinamento(
  dataValidade: string | null,
  diasAlertaAntes: number,
): StatusTreinamento {
  if (!dataValidade) return 'VALIDO';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade + 'T00:00:00');
  if (validade < hoje) return 'VENCIDO';
  const diffMs = validade.getTime() - hoje.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias <= diasAlertaAntes) return 'PROXIMO_VENCIMENTO';
  return 'VALIDO';
}

export function diasParaVencer(dataValidade: string | null): number | null {
  if (!dataValidade) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataValidade + 'T00:00:00');
  return Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Labels legíveis para os tipos de curso
// ---------------------------------------------------------------------------

export const TIPO_CURSO_LABELS: Record<TipoCurso, string> = {
  'NR-05': 'NR-05 — CIPA',
  'NR-06': 'NR-06 — EPI',
  'NR-10': 'NR-10 — Segurança Elétrica',
  'NR-11': 'NR-11 — Movimentação de Cargas',
  'NR-12': 'NR-12 — Máquinas e Equipamentos',
  'NR-13': 'NR-13 — Caldeiras e Vasos de Pressão',
  'NR-17': 'NR-17 — Ergonomia',
  'NR-20': 'NR-20 — Inflamáveis e Combustíveis',
  'NR-23': 'NR-23 — Proteção Contra Incêndios',
  'NR-33': 'NR-33 — Espaço Confinado',
  'NR-35': 'NR-35 — Trabalho em Altura',
  'CIPA': 'CIPA',
  'BRIGADA': 'Brigada de Incêndio',
  'PRIMEIRO_SOCORRO': 'Primeiro Socorro',
  'EMPILHADEIRA': 'Operador de Empilhadeira',
  'PONTE_ROLANTE': 'Operador de Ponte Rolante',
  'INTEGRACAO': 'Integração de Segurança',
  'OUTRO': 'Outro',
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useTreinamentosSSMA() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['treinamentos-ssma', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treinamentos_ssma')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('data_validade', { ascending: true, nullsFirst: false })
        .limit(500);

      if (error) throw error;

      // Recalcula status no frontend para feedback em tempo real
      return (data as TreinamentoSSMARow[]).map((t) => ({
        ...t,
        status: calcularStatusTreinamento(t.data_validade, t.dias_alerta_antes),
      }));
    },
    enabled: !!tenantId,
  });
}

export function useTreinamentosVencendo() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['treinamentos-ssma', tenantId, 'vencendo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treinamentos_ssma')
        .select('*')
        .eq('empresa_id', tenantId!)
        .in('status', ['PROXIMO_VENCIMENTO', 'VENCIDO'])
        .order('data_validade', { ascending: true })
        .limit(500);

      if (error) throw error;
      return (data as TreinamentoSSMARow[]).map((t) => ({
        ...t,
        status: calcularStatusTreinamento(t.data_validade, t.dias_alerta_antes),
      }));
    },
    enabled: !!tenantId,
  });
}

export function useCreateTreinamentoSSMA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  const ordenarPorValidade = (lista: TreinamentoSSMARow[]) => {
    return [...lista].sort((a, b) => {
      const aTime = a.data_validade
        ? new Date(`${a.data_validade}T00:00:00`).getTime()
        : Number.POSITIVE_INFINITY;
      const bTime = b.data_validade
        ? new Date(`${b.data_validade}T00:00:00`).getTime()
        : Number.POSITIVE_INFINITY;

      if (aTime !== bTime) return aTime - bTime;
      return a.created_at.localeCompare(b.created_at);
    });
  };

  return useMutation({
    mutationFn: async (treinamento: TreinamentoInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const status = calcularStatusTreinamento(
        treinamento.data_validade ?? null,
        treinamento.dias_alerta_antes ?? 30,
      );

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('treinamentos_ssma')
            .insert(payload)
            .select()
            .single(),
        { ...treinamento, empresa_id: tenantId, status } as Record<string, unknown>,
      ) as Promise<TreinamentoSSMARow>;
    },
    onSuccess: (novoTreinamento) => {
      const treinamentoAjustado: TreinamentoSSMARow = {
        ...novoTreinamento,
        status: calcularStatusTreinamento(
          novoTreinamento.data_validade,
          novoTreinamento.dias_alerta_antes,
        ),
      };

      queryClient.setQueryData<TreinamentoSSMARow[]>(
        ['treinamentos-ssma', tenantId],
        (atual = []) => {
          const semDuplicado = atual.filter((item) => item.id !== treinamentoAjustado.id);
          return ordenarPorValidade([...semDuplicado, treinamentoAjustado]);
        },
      );

      queryClient.invalidateQueries({ queryKey: ['treinamentos-ssma'] });
      writeAuditLog({
        action: 'CREATE_TREINAMENTO_SSMA',
        table: 'treinamentos_ssma',
        empresaId: tenantId,
        source: 'useTreinamentosSSMA',
      });
      toast({
        title: 'Treinamento registrado',
        description: 'O treinamento foi registrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao registrar treinamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTreinamentoSSMA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TreinamentoSSMARow> & { id: string }) => {
      // Recalcular status se data_validade ou dias_alerta mudaram
      const payload = { ...updates } as Record<string, unknown>;
      if (updates.data_validade !== undefined || updates.dias_alerta_antes !== undefined) {
        payload.status = calcularStatusTreinamento(
          (updates.data_validade ?? null) as string | null,
          (updates.dias_alerta_antes ?? 30) as number,
        );
      }

      return updateWithColumnFallback(
        async (p) =>
          supabase
            .from('treinamentos_ssma')
            .update(p)
            .eq('id', id)
            .eq('empresa_id', tenantId!)
            .select()
            .single(),
        payload,
      ) as Promise<TreinamentoSSMARow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treinamentos-ssma', tenantId] });
      writeAuditLog({
        action: 'UPDATE_TREINAMENTO_SSMA',
        table: 'treinamentos_ssma',
        empresaId: tenantId,
        source: 'useTreinamentosSSMA',
      });
      toast({
        title: 'Treinamento atualizado',
        description: 'O treinamento foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar treinamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTreinamentoSSMA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não identificado.');
      const { error } = await supabase
        .from('treinamentos_ssma')
        .delete()
        .eq('id', id)
        .eq('empresa_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treinamentos-ssma', tenantId] });
      writeAuditLog({
        action: 'DELETE_TREINAMENTO_SSMA',
        table: 'treinamentos_ssma',
        empresaId: tenantId,
        source: 'useTreinamentosSSMA',
      });
      toast({
        title: 'Treinamento removido',
        description: 'O treinamento foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover treinamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
