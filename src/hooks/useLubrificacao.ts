import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PlanoLubrificacao, PlanoLubrificacaoInsert } from '@/types/lubrificacao';
import { deleteMaintenanceSchedule, upsertMaintenanceSchedule } from '@/services/maintenanceSchedule';

interface ExecucaoRow {
  id: string;
  plano_id: string;
}

interface OrdemServicoCreated {
  id: string;
}

export function usePlanosLubrificacao() {
  return useQuery({
    queryKey: ['planos-lubrificacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos_lubrificacao')
        .select('*')
        .order('codigo')
        .limit(200);

      if (error) throw error;
      return data as PlanoLubrificacao[];
    },
    staleTime: 60_000,
  });
}

export function useCreatePlanoLubrificacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (plano: PlanoLubrificacaoInsert) => {
      const { data, error } = await supabase
        .from('planos_lubrificacao')
        .insert(plano)
        .select()
        .single();

      if (error) throw error;

      await upsertMaintenanceSchedule({
        tipo: 'lubrificacao',
        origemId: data.id,
        equipamentoId: data.equipamento_id,
        titulo: `${data.codigo} • ${data.nome}`,
        descricao: data.descricao || data.observacoes,
        dataProgramada: data.proxima_execucao || new Date().toISOString(),
        status: data.status || (data.ativo ? 'programado' : 'inativo'),
        responsavel: data.responsavel_nome || data.responsavel,
      });

      return data as PlanoLubrificacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-lubrificacao'] });
      queryClient.invalidateQueries({ queryKey: ['document-sequences'] });
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

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanoLubrificacao> & { id: string }) => {
      const { data, error } = await supabase
        .from('planos_lubrificacao')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await upsertMaintenanceSchedule({
        tipo: 'lubrificacao',
        origemId: data.id,
        equipamentoId: data.equipamento_id,
        titulo: `${data.codigo} • ${data.nome}`,
        descricao: data.descricao || data.observacoes,
        dataProgramada: data.proxima_execucao || new Date().toISOString(),
        status: data.status || (data.ativo ? 'programado' : 'inativo'),
        responsavel: data.responsavel_nome || data.responsavel,
      });

      return data as PlanoLubrificacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-lubrificacao'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedule'] });
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

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteMaintenanceSchedule('lubrificacao', id);

      const { error } = await supabase
        .from('planos_lubrificacao')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-lubrificacao'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-schedule'] });
      toast({ title: 'Plano excluído', description: 'Plano de lubrificação excluído com sucesso.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Erro', description: error instanceof Error ? error.message : 'Falha ao excluir plano', variant: 'destructive' });
    },
  });
}

export function useExecucoesByPlanoLubrificacao(planoId: string | null) {
  return useQuery({
    queryKey: ['execucoes-lubrificacao', planoId],
    enabled: !!planoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('execucoes_lubrificacao')
        .select('*')
        .eq('plano_id', planoId!)
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

  return useMutation({
    mutationFn: async (input: { plano_id: string; executor_nome?: string; observacoes?: string; fotos?: unknown; quantidade_utilizada?: number }) => {
      const payload = {
        ...input,
        data_execucao: new Date().toISOString(),
        status: 'CONCLUIDO',
      };

      const { data, error } = await supabase
        .from('execucoes_lubrificacao')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['execucoes-lubrificacao', d.plano_id] });
      qc.invalidateQueries({ queryKey: ['planos-lubrificacao'] });
      toast({ title: 'Execução registrada' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Falha ao registrar execução', variant: 'destructive' }),
  });
}

export function useGenerateExecucoesNow() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();

      const { data: planos, error: e1 } = await supabase
        .from('planos_lubrificacao')
        .select('*')
        .lte('proxima_execucao', now)
        .or('proxima_execucao.is.null');

      if (e1) throw e1;

      const planosTyped = (planos || []) as PlanoLubrificacao[];
      if (planosTyped.length === 0) return { created: 0 };

      let created = 0;

      const nowIso = new Date().toISOString();
      const execInserts = planosTyped.map(p => ({
        plano_id: p.id,
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
              .eq('id', u.id);
          }
        }
      } catch (err) {
        console.warn('Erro ao criar OSs em lote', err);
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
            .eq('id', plano.id);
        } catch (err) {
          console.error(`Erro ao atualizar próxima execução do plano ${plano.id}`, err);
        }
      }

      qc.invalidateQueries({ queryKey: ['planos-lubrificacao'] });
      qc.invalidateQueries({ queryKey: ['execucoes-lubrificacao'] });

      toast({
        title: 'Geração de execuções',
        description: `${created} tarefas criadas.`,
      });

      return { created };
    },
  });
}
