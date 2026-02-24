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
        .select('*')
        .order('codigo');

      if (error) throw error;
      return data as PlanoLubrificacao[];
    },
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
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useGenerateExecucoesNow() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Find planos whose proxima_execucao is past or null
      const now = new Date().toISOString();
      const { data: planos, error: e1 } = await supabase
        .from('planos_lubrificacao')
        .select('*')
        .lte('proxima_execucao', now)
        .or('proxima_execucao.is.null');
      if (e1) throw e1;

      if (!planos || planos.length === 0) return { created: 0 };

      let created = 0;
      for (const plano of planos as any[]) {
        const { data: exec, error: e2 } = await supabase
          .from('execucoes_lubrificacao')
          .insert({ plano_id: plano.id, data_execucao: new Date().toISOString(), status: 'PENDENTE' })
          .select()
          .single();
        if (e2) continue;
        created++;

        // Create an OS for this execution (integrate with ordens_servico)
        try {
          const osPayload: any = {
            tipo: 'LUBRIFICACAO',
            prioridade: 'NORMAL',
            tag: plano.tag || '',
            equipamento: plano.equipamento_id || plano.nome || '',
            solicitante: 'Sistema Automático',
            problema: `Execução de lubrificação do plano ${plano.codigo} - ${plano.nome}`,
            tempo_estimado: plano.tempo_estimado_min || null,
          };
          const { data: osData, error: e3 } = await supabase.from('ordens_servico').insert(osPayload).select().single();
          if (!e3 && osData) {
            // try to link os id to execution (if column exists)
            try {
              await supabase.from('execucoes_lubrificacao').update({ os_gerada_id: osData.id }).eq('id', exec.id);
            } catch (_) {}
          }
        } catch (_) {
          // ignore OS creation errors to not block generation
        }

        // Calculate next execution based on periodicidade
        try {
          const tipo = plano.periodicidade_tipo;
          const valor = Number(plano.periodicidade_valor) || 0;
          const next = new Date();
          if (tipo === 'DIAS') next.setDate(next.getDate() + valor);
          else if (tipo === 'SEMANAS') next.setDate(next.getDate() + (7 * valor));
          else if (tipo === 'MESES') next.setMonth(next.getMonth() + valor);
          // TODO: HORAS - requires machine hours tracking
          await supabase.from('planos_lubrificacao').update({ proxima_execucao: next.toISOString() }).eq('id', plano.id);
        } catch (err) {
          // ignore
        }
      }

      qc.invalidateQueries({ queryKey: ['planos-lubrificacao'] });
      qc.invalidateQueries({ queryKey: ['execucoes-lubrificacao'] });
      toast({ title: 'Geração de execuções', description: `${created} tarefas criadas.` });
      return { created };
    },
  });
}
