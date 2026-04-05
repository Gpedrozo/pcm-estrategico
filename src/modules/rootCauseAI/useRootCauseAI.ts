import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { AIRootCauseAnalysis, AnalysisResponse } from './types';

export function useAIAnalysisHistory(tag?: string) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ['ai-root-cause', tag, tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const query = supabase
        .from('ai_root_cause_analysis')
        .select('*')
        .order('generated_at', { ascending: false });

      if (tag) {
        query.eq('tag', tag);
      }
      if (tenantId) {
        query.eq('empresa_id', tenantId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as unknown as AIRootCauseAnalysis[];
    },
  });
}

export interface GenerateAnalysisParams {
  tag: string;
  date_from?: string;
  date_to?: string;
}

export function useGenerateAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (params: GenerateAnalysisParams): Promise<AnalysisResponse> => {
      if (!tenantId) {
        throw new Error('Tenant inválido para análise de causa raiz.');
      }

      const { data, error } = await supabase.functions.invoke('analisar-causa-raiz', {
        body: {
          tag: params.tag,
          empresa_id: tenantId,
          date_from: params.date_from || null,
          date_to: params.date_to || null,
        },
      });

      if (error) {
        // Supabase JS wraps non-2xx as generic message; real error is in data
        const realMessage = data?.error || data?.message || error.message;
        throw new Error(realMessage);
      }
      if (data?.error) throw new Error(data.error);
      return data as AnalysisResponse;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['ai-root-cause', params.tag] });
      queryClient.invalidateQueries({ queryKey: ['ai-root-cause'] });
      toast({
        title: 'Análise concluída',
        description: 'A análise de causa raiz foi gerada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro na análise',
        description: error.message || 'Não foi possível gerar a análise.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_root_cause_analysis')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-root-cause'] });
      toast({
        title: 'Análise excluída',
        description: 'A análise foi removida com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a análise.',
        variant: 'destructive',
      });
    },
  });
}
