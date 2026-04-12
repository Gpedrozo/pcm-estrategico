import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';

export interface EPIRow {
  id: string;
  empresa_id: string;
  nome: string;
  categoria: string;
  numero_ca: string | null;
  fabricante: string | null;
  validade_ca: string | null;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EPIInsert {
  nome: string;
  categoria: string;
  numero_ca?: string | null;
  fabricante?: string | null;
  validade_ca?: string | null;
  estoque_atual?: number;
  estoque_minimo?: number;
}

export interface EntregaEPIRow {
  id: string;
  empresa_id: string;
  epi_id: string;
  colaborador_nome: string;
  colaborador_id: string | null;
  quantidade: number;
  data_entrega: string;
  data_devolucao: string | null;
  motivo: string | null;
  observacoes: string | null;
  created_at: string;
}

export interface EntregaEPIInsert {
  epi_id: string;
  colaborador_nome: string;
  quantidade?: number;
  data_entrega?: string;
  motivo?: string | null;
  observacoes?: string | null;
}

export type TipoMovimentacaoEPI = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'DEVOLUCAO';

export interface MovimentacaoEPIRow {
  id: string;
  empresa_id: string;
  epi_id: string;
  tipo: TipoMovimentacaoEPI;
  quantidade: number;
  saldo_antes: number;
  saldo_depois: number;
  motivo: string | null;
  documento_ref: string | null;
  colaborador_nome: string | null;
  created_at: string;
}

export interface MovimentacaoEPIInsert {
  epi_id: string;
  tipo: TipoMovimentacaoEPI;
  quantidade: number;
  saldo_antes: number;
  saldo_depois: number;
  motivo?: string | null;
  documento_ref?: string | null;
  colaborador_nome?: string | null;
}

export function calcularSaldoMovimentacao(
  estoqueAtual: number,
  tipo: TipoMovimentacaoEPI,
  quantidade: number,
): { saldo_antes: number; saldo_depois: number } {
  const saldo_antes = estoqueAtual;

  if (tipo === 'AJUSTE') {
    return { saldo_antes, saldo_depois: Math.max(0, quantidade) };
  }

  if (tipo === 'ENTRADA' || tipo === 'DEVOLUCAO') {
    return { saldo_antes, saldo_depois: saldo_antes + quantidade };
  }

  return { saldo_antes, saldo_depois: Math.max(0, saldo_antes - quantidade) };
}

export function useEPIs() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['epis', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epis')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('nome')
        .limit(500);

      if (error) throw error;
      return data as EPIRow[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateEPI() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (epi: EPIInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('epis')
            .insert(payload)
            .select()
            .single(),
        { ...epi, empresa_id: tenantId } as Record<string, unknown>,
      ) as Promise<EPIRow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epis', tenantId] });
      writeAuditLog({ action: 'CREATE_EPI', table: 'epis', empresaId: tenantId, source: 'useEPIs' });
      toast({ title: 'EPI cadastrado', description: 'O EPI foi registrado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cadastrar EPI', description: error.message, variant: 'destructive' });
    },
  });
}

export function useEntregasEPI(epiId?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['entregas-epi', tenantId, epiId],
    queryFn: async () => {
      let query = supabase
        .from('entregas_epi')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('data_entrega', { ascending: false })
        .limit(500);

      if (epiId) {
        query = query.eq('epi_id', epiId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EntregaEPIRow[];
    },
    enabled: !!tenantId,
  });
}

export function useMovimentacoesEPI(epiId?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['movimentacoes-epi', tenantId, epiId],
    queryFn: async () => {
      let query = supabase
        .from('movimentacoes_epi')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('created_at', { ascending: false })
        .limit(500);

      if (epiId) {
        query = query.eq('epi_id', epiId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MovimentacaoEPIRow[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateMovimentacaoEPI() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (movimentacao: MovimentacaoEPIInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('movimentacoes_epi')
            .insert(payload)
            .select()
            .single(),
        { ...movimentacao, empresa_id: tenantId } as Record<string, unknown>,
      ) as Promise<MovimentacaoEPIRow>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['epis', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-epi', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-epi', tenantId, variables.epi_id] });
      writeAuditLog({ action: `MOVIMENTACAO_EPI_${variables.tipo}`, table: 'movimentacoes_epi', empresaId: tenantId, source: 'useEPIs' });
      toast({ title: 'Movimentação registrada', description: `${variables.tipo}: ${variables.quantidade}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao registrar movimentação', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateEntregaEPI() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (entrega: EntregaEPIInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const entregaCriada = await insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('entregas_epi')
            .insert(payload)
            .select()
            .single(),
        { ...entrega, empresa_id: tenantId } as Record<string, unknown>,
      ) as Promise<EntregaEPIRow>;

      const quantidade = entrega.quantidade ?? 1;

      // Registra baixa no estoque como movimentação SAIDA
      const { data: epiAtual, error: epiError } = await supabase
        .from('epis')
        .select('estoque_atual')
        .eq('id', entrega.epi_id)
        .eq('empresa_id', tenantId)
        .single();

      if (epiError) throw epiError;

      const saldoAntes = Number(epiAtual?.estoque_atual || 0);
      const saldoDepois = Math.max(0, saldoAntes - quantidade);

      const { error: movError } = await supabase
        .from('movimentacoes_epi')
        .insert({
          empresa_id: tenantId,
          epi_id: entrega.epi_id,
          tipo: 'SAIDA',
          quantidade,
          saldo_antes: saldoAntes,
          saldo_depois: saldoDepois,
          motivo: entrega.motivo || 'Entrega de EPI',
          colaborador_nome: entrega.colaborador_nome,
        });

      if (movError) throw movError;

      return entregaCriada;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregas-epi', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['epis', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-epi', tenantId] });
      writeAuditLog({ action: 'CREATE_ENTREGA_EPI', table: 'entregas_epi', empresaId: tenantId, source: 'useEPIs' });
      toast({ title: 'Entrega registrada', description: 'A entrega de EPI foi registrada.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao registrar entrega', description: error.message, variant: 'destructive' });
    },
  });
}
