import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PlanoLubrificacao, PlanoLubrificacaoInsert } from '@/types/lubrificacao';

export function usePlanosLubrificacao() {
  return useQuery({
    queryKey: ['planos-lubrificacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos_lubrificacao')
        .select('id,codigo,nome,tag,proxima_execucao,ativo,tempo_estimado_min')
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
      return data as PlanoLubrificacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-lubrificacao'] });
      queryClient.invalidateQueries({ queryKey: ['document-sequences'] });
      toast({ title: 'Plano criado', description: 'Plano de lubrificação criado.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
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
    mutationFn: async (input: { plano_id: string; executor_nome?: string; observacoes?: string; fotos?: any; quantidade_utilizada?: number }) => {
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
    onError: (e: any) =>
      toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
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

      if (!planos || planos.length === 0) return { created: 0 };

      let created = 0;

      const nowIso = new Date().toISOString();
      const execInserts = (planos as any[]).map(p => ({
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
        const osPayloads = (planos as any[]).map(p => ({
          tipo: 'LUBRIFICACAO',
          prioridade: 'NORMAL',
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
          const updates = insertedExecs.map((ex: any, idx: number) => ({
            id: ex.id,
            os_gerada_id: osDataArr[idx]?.id || null,
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
  for (const plano of planos as any[]) {
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
