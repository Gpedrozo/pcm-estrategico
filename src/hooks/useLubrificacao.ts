import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PlanoLubrificacao, PlanoLubrificacaoInsert } from '@/types/lubrificacao';
import { deleteMaintenanceSchedule, upsertMaintenanceSchedule } from '@/services/maintenanceSchedule';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { getSupabaseErrorMessage, isMissingTableError } from '@/lib/supabaseCompat';
import { writeAuditLog } from '@/lib/audit';

interface ExecucaoRow {
  id: string;
  plano_id: string;
}

interface OrdemServicoCreated {
  id: string;
}

const PLANOS_LUBRIFICACAO_TABLE = 'planos_lubrificacao' as const;
let planosLubrificacaoTableAvailable: boolean | null = null;

function toReadableError(error: unknown, fallback = 'Falha inesperada no módulo de lubrificação.'): Error {
  const message = getSupabaseErrorMessage(error);
  if (message) return new Error(message);

  if (typeof error === 'string' && error.trim().length > 0) {
    return new Error(error);
  }

  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(fallback);
  }
}

async function ensurePlanosLubrificacaoTable() {
  if (planosLubrificacaoTableAvailable === true) return PLANOS_LUBRIFICACAO_TABLE;

  const { error } = await supabase.from(PLANOS_LUBRIFICACAO_TABLE).select('id').limit(1);

  if (!error) {
    planosLubrificacaoTableAvailable = true;
    return PLANOS_LUBRIFICACAO_TABLE;
  }

  if (isMissingTableError(error)) {
    throw new Error(
      'A tabela public.planos_lubrificacao não existe neste ambiente. Execute a migration 20260224020000_create_lubrificacao.sql (e depois 20260301050000_create_maintenance_schedule.sql) para habilitar o módulo.',
    );
  }

  throw toReadableError(error);
}

export function usePlanosLubrificacao() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['planos-lubrificacao', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) return [];
      const table = await ensurePlanosLubrificacaoTable();

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('empresa_id', tenantId)
        .order('codigo')
        .limit(200);

      if (error) throw toReadableError(error);
      return data as PlanoLubrificacao[];
    },
    staleTime: 60_000,
  });
}

export function useCreatePlanoLubrificacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (plano: PlanoLubrificacaoInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const planoId = (plano as Partial<PlanoLubrificacao>).id ?? crypto.randomUUID();
      const payload = { ...plano, id: planoId, empresa_id: tenantId };

      const { error } = await supabase
        .from('planos_lubrificacao')
        .insert(payload);

      if (error) throw toReadableError(error);

      try {
        await upsertMaintenanceSchedule({
          tipo: 'lubrificacao',
          origemId: planoId,
          empresaId: tenantId,
          equipamentoId: payload.equipamento_id,
          titulo: `${payload.codigo} • ${payload.nome}`,
          descricao: payload.descricao,
          dataProgramada: payload.proxima_execucao || new Date().toISOString(),
          status: payload.status || (payload.ativo ? 'programado' : 'inativo'),
          responsavel: payload.responsavel_nome,
        });
      } catch (scheduleError) {
        logger.warn('useLubrificacao.create.schedule_sync_failed', {
          empresaId: tenantId,
          planoId,
          error: getSupabaseErrorMessage(scheduleError),
        });
      }

      return payload as PlanoLubrificacao;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['planos-lubrificacao', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['document-sequences'] });
      writeAuditLog({ action: 'CREATE_PLANO_LUBRIFICACAO', table: 'planos_lubrificacao', recordId: data?.id, empresaId: tenantId, source: 'useLubrificacao' });
      toast({ title: 'Plano criado', description: 'Plano de lubrificação criado.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Erro', description: error instanceof Error ? error.message : 'Falha ao criar plano', variant: 'destructive' });
    },
  });
}

export function useUpdatePlanoLubrificacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanoLubrificacao> & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { error } = await supabase
        .from('planos_lubrificacao')
        .update(updates)
        .eq('id', id)
        .eq('empresa_id', tenantId);

      if (error) throw toReadableError(error);

      const { data: row } = await supabase
        .from('planos_lubrificacao')
        .select('*')
        .eq('id', id)
        .eq('empresa_id', tenantId)
        .maybeSingle();

      const source = (row ?? { id, ...updates }) as Partial<PlanoLubrificacao> & { id: string };

      try {
        await upsertMaintenanceSchedule({
          tipo: 'lubrificacao',
          origemId: source.id,
          empresaId: tenantId,
          equipamentoId: source.equipamento_id,
          titulo: source.codigo && source.nome ? `${source.codigo} • ${source.nome}` : `Plano ${source.id}`,
          descricao: source.descricao,
          dataProgramada: source.proxima_execucao || new Date().toISOString(),
          status: source.status || (source.ativo ? 'programado' : 'inativo'),
          responsavel: source.responsavel_nome,
        });
      } catch (scheduleError) {
        logger.warn('useLubrificacao.update.schedule_sync_failed', {
          empresaId: tenantId,
          planoId: id,
          error: getSupabaseErrorMessage(scheduleError),
        });
      }

      return source as PlanoLubrificacao;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['planos-lubrificacao', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedule'] });
      writeAuditLog({ action: 'UPDATE_PLANO_LUBRIFICACAO', table: 'planos_lubrificacao', recordId: data?.id, empresaId: tenantId, source: 'useLubrificacao' });
      toast({ title: 'Plano atualizado', description: 'Plano de lubrificação atualizado com sucesso.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Erro', description: error instanceof Error ? error.message : 'Falha ao atualizar plano', variant: 'destructive' });
    },
  });
}

export function useDeletePlanoLubrificacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      await deleteMaintenanceSchedule('lubrificacao', id, tenantId);

      const { error } = await supabase
        .from('planos_lubrificacao')
        .delete()
        .eq('id', id)
        .eq('empresa_id', tenantId);

      if (error) throw error;
    },
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['planos-lubrificacao', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedule'] });
      writeAuditLog({ action: 'DELETE_PLANO_LUBRIFICACAO', table: 'planos_lubrificacao', recordId: deletedId, empresaId: tenantId, source: 'useLubrificacao', severity: 'warning' });
      toast({ title: 'Plano excluído', description: 'Plano de lubrificação excluído com sucesso.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Erro', description: error instanceof Error ? error.message : 'Falha ao excluir plano', variant: 'destructive' });
    },
  });
}

export function useExecucoesByPlanoLubrificacao(planoId: string | null) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ['execucoes-lubrificacao', planoId, tenantId],
    enabled: !!planoId,
    queryFn: async () => {
      let query = supabase
        .from('execucoes_lubrificacao')
        .select('*')
        .eq('plano_id', planoId!);
      if (tenantId) query = query.eq('empresa_id', tenantId);
      const { data, error } = await query
        .order('data_execucao', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateExecucaoLubrificacao() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (input: { plano_id: string; executor_nome?: string; observacoes?: string; fotos?: unknown; quantidade_utilizada?: number }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      const payload = {
        ...input,
        empresa_id: tenantId,
        data_execucao: new Date().toISOString(),
        status: 'CONCLUIDO',
      };

      const { data, error } = await supabase
        .from('execucoes_lubrificacao')
        .insert(payload)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data ?? { ...payload, id: crypto.randomUUID() };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['execucoes-lubrificacao', d.plano_id] });
      qc.invalidateQueries({ queryKey: ['planos-lubrificacao'] });
      writeAuditLog({ action: 'CREATE_EXECUCAO_LUBRIFICACAO', table: 'execucoes_lubrificacao', recordId: d?.id, empresaId: tenantId, source: 'useLubrificacao', metadata: { plano_id: d.plano_id } });
      toast({ title: 'Execução registrada' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao registrar execução', variant: 'destructive' }),
  });
}

export function useGenerateExecucoesNow() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      const now = new Date().toISOString();

      const { data: planos, error: e1 } = await supabase
        .from('planos_lubrificacao')
        .select('*')
        .eq('empresa_id', tenantId)
        .lte('proxima_execucao', now)
        .or('proxima_execucao.is.null');

      if (e1) throw e1;

      const planosTyped = (planos || []) as PlanoLubrificacao[];
      if (planosTyped.length === 0) return { created: 0 };

      let created = 0;

      const nowIso = new Date().toISOString();
      const execInserts = planosTyped.map(p => ({
        plano_id: p.id,
        empresa_id: tenantId,
        data_execucao: nowIso,
        status: 'PENDENTE',
      }));

      const { data: insertedExecs, error: e2 } = await supabase
        .from('execucoes_lubrificacao')
        .insert(execInserts)
        .select();

      if (e2) throw e2;

      created = Array.isArray(insertedExecs)
        ? insertedExecs.length
        : insertedExecs
        ? 1
        : 0;

      try {
        const osPayloads = planosTyped.map(p => ({
          tipo: 'LUBRIFICACAO',
          prioridade: 'NORMAL',
          status: 'ABERTA',
          empresa_id: tenantId,
          tag: p.tag || '',
          equipamento: p.equipamento_id || p.nome || '',
          solicitante: 'Sistema Automático',
          problema: `Execução de lubrificação do plano ${p.codigo} - ${p.nome}`,
          tempo_estimado: p.tempo_estimado_min || null,
        }));

        const { data: osDataArr, error: e3 } = await supabase
          .from('ordens_servico')
          .insert(osPayloads)
          .select();

        if (!e3 && Array.isArray(osDataArr) && Array.isArray(insertedExecs)) {
          const updates = (insertedExecs as ExecucaoRow[]).map((ex, idx: number) => ({
            id: ex.id,
            os_gerada_id: (osDataArr as OrdemServicoCreated[])[idx]?.id || null,
          }));

          for (const u of updates) {
            await supabase
              .from('execucoes_lubrificacao')
              .update({ os_gerada_id: u.os_gerada_id })
              .eq('id', u.id)
              .eq('empresa_id', tenantId);
          }
        }
      } catch (err) {
        logger.warn('batch_os_creation_failed', { error: String(err) });
      }
  // Calculate next execution for each treated plan
  for (const plano of planosTyped) {
        try {
          const tipo = plano.periodicidade_tipo;
          const valor = Number(plano.periodicidade_valor) || 0;

          const next = new Date();

          if (tipo === 'DIAS') next.setDate(next.getDate() + valor);
          else if (tipo === 'SEMANAS') next.setDate(next.getDate() + 7 * valor);
          else if (tipo === 'MESES') next.setMonth(next.getMonth() + valor);
          
          await supabase
            .from('planos_lubrificacao')
            .update({ 
              proxima_execucao: next.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', plano.id)
            .eq('empresa_id', tenantId);
        } catch (err) {
          logger.error('plano_next_exec_update_failed', { planoId: plano.id, error: String(err) });
        }
      }

      qc.invalidateQueries({ queryKey: ['planos-lubrificacao'] });
      qc.invalidateQueries({ queryKey: ['execucoes-lubrificacao'] });

      toast({
        title: 'Geração de execuções',
        description: `${created} tarefas criadas.`,
      });

      writeAuditLog({ action: 'GENERATE_EXECUCOES_LUBRIFICACAO', table: 'execucoes_lubrificacao', empresaId: tenantId, source: 'useLubrificacao', metadata: { created_count: created } });

      return { created };
    },
  });
}
