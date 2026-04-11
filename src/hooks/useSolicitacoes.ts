import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { resolveSlaHorasByClassificacao } from '@/hooks/useTenantPadronizacoes';
import {
  insertWithColumnFallback,
  isMissingTableError,
  updateWithColumnFallback,
} from '@/lib/supabaseCompat';
import { writeAuditLog } from '@/lib/audit';

const SOLICITACOES_TABLE_CANDIDATES = ['solicitacoes_manutencao', 'solicitacoes'] as const;
export type SolicitacoesTableName = (typeof SOLICITACOES_TABLE_CANDIDATES)[number];

let cachedSolicitacoesTable: SolicitacoesTableName | null = null;

export async function getSolicitacoesTable(): Promise<SolicitacoesTableName> {
  if (cachedSolicitacoesTable) return cachedSolicitacoesTable;

  for (const table of SOLICITACOES_TABLE_CANDIDATES) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (!error) {
      cachedSolicitacoesTable = table;
      return table;
    }

    if (!isMissingTableError(error)) {
      throw error;
    }
  }

  throw new Error('Nenhuma tabela de solicitações compatível foi encontrada no banco.');
}

function normalizeSolicitacaoRow(row: any): SolicitacaoRow {
  return {
    id: row.id,
    numero_solicitacao: Number(row.numero_solicitacao ?? row.numero ?? 0),
    equipamento_id: row.equipamento_id ?? null,
    tag: String(row.tag ?? ''),
    solicitante_nome: String(row.solicitante_nome ?? row.solicitante ?? ''),
    solicitante_setor: row.solicitante_setor ?? null,
    descricao_falha: String(row.descricao_falha ?? row.descricao ?? ''),
    impacto: (row.impacto ?? 'MEDIO') as SolicitacaoRow['impacto'],
    classificacao: (row.classificacao ?? 'PROGRAMAVEL') as SolicitacaoRow['classificacao'],
    status: (row.status ?? 'PENDENTE') as SolicitacaoRow['status'],
    os_id: row.os_id ?? null,
    sla_horas: Number(row.sla_horas ?? 72),
    data_limite: row.data_limite ?? null,
    observacoes: row.observacoes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

async function fetchSolicitacoes(empresaId: string, statuses?: string[]) {
  const table = await getSolicitacoesTable();

  let query = supabase
    .from(table)
    .select('*')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false });

  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }

  query = query.limit(500);

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map(normalizeSolicitacaoRow);
}

export interface SolicitacaoRow {
  id: string;
  numero_solicitacao: number;
  equipamento_id: string | null;
  tag: string;
  solicitante_nome: string;
  solicitante_setor: string | null;
  descricao_falha: string;
  impacto: 'ALTO' | 'MEDIO' | 'BAIXO';
  classificacao: string;
  status: 'PENDENTE' | 'APROVADA' | 'CONVERTIDA' | 'REJEITADA' | 'CANCELADA';
  os_id: string | null;
  sla_horas: number;
  data_limite: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SolicitacaoInsert {
  tag: string;
  solicitante_nome: string;
  solicitante_setor?: string | null;
  descricao_falha: string;
  impacto?: 'ALTO' | 'MEDIO' | 'BAIXO';
  classificacao?: string;
  equipamento_id?: string | null;
  observacoes?: string | null;
}

export function useSolicitacoes() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['solicitacoes', tenantId],
    queryFn: () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return fetchSolicitacoes(tenantId);
    },
    enabled: !!tenantId,
  });
}

export function useSolicitacoesPendentes() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['solicitacoes', tenantId, 'pendentes'],
    queryFn: () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return fetchSolicitacoes(tenantId, ['PENDENTE', 'APROVADA']);
    },
    enabled: !!tenantId,
  });
}

export function useCreateSolicitacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (solicitacao: SolicitacaoInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const classificacao = solicitacao.classificacao ?? 'PROGRAMAVEL';
      const slaHoras = resolveSlaHorasByClassificacao(classificacao);
      const dataLimite = new Date();
      dataLimite.setHours(dataLimite.getHours() + slaHoras);

      const table = await getSolicitacoesTable();
      const payload = {
        ...solicitacao,
        empresa_id: tenantId,
        status: 'PENDENTE',
        impacto: solicitacao.impacto ?? 'MEDIO',
        classificacao,
        sla_horas: slaHoras,
        data_limite: dataLimite.toISOString(),
      };

      const data = await insertWithColumnFallback(
        async (payloadToInsert) =>
          supabase
            .from(table)
            .insert(payloadToInsert)
            .select()
            .single(),
        payload as Record<string, unknown>,
      );

      return normalizeSolicitacaoRow(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes', tenantId] });
      writeAuditLog({ action: 'CREATE_SOLICITACAO', table: cachedSolicitacoesTable ?? 'solicitacoes', recordId: data?.id, empresaId: tenantId, source: 'useSolicitacoes', metadata: { classificacao: data?.classificacao, impacto: data?.impacto } });
      toast({
        title: 'Solicitação criada',
        description: 'A solicitação foi registrada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar solicitação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSolicitacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SolicitacaoRow> & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      const table = await getSolicitacoesTable();

      const data = await updateWithColumnFallback(
        async (payloadToUpdate) =>
          supabase
            .from(table)
            .update(payloadToUpdate)
            .eq('id', id)
            .eq('empresa_id', tenantId)
            .select()
            .single(),
        updates as Record<string, unknown>,
      );

      return normalizeSolicitacaoRow(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes', tenantId] });
      writeAuditLog({ action: 'UPDATE_SOLICITACAO', table: cachedSolicitacoesTable ?? 'solicitacoes', recordId: data?.id, empresaId: tenantId, source: 'useSolicitacoes', metadata: { status: data?.status } });
      toast({
        title: 'Solicitação atualizada',
        description: 'A solicitação foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar solicitação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
