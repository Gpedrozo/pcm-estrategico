import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { AIRootCauseAnalysis, AnalysisResponse } from './types';

export function useAIAnalysisHistory(tag?: string) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: ['ai-root-cause', tag, tenantId],
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

export function useGenerateAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (tag: string): Promise<AnalysisResponse> => {
      if (!tenantId) {
        throw new Error('Tenant inválido para análise de causa raiz.');
      }

      const { data, error } = await supabase.functions.invoke('analisar-causa-raiz', {
        body: { tag, empresa_id: tenantId },
      });

      if (error) {
        // Supabase JS wraps non-2xx as generic message; real error is in data
        const realMessage = data?.error || data?.message || error.message;
        throw new Error(realMessage);
      }
      if (data?.error) throw new Error(data.error);
      return data as AnalysisResponse;
    },
    onSuccess: (_, tag) => {
      queryClient.invalidateQueries({ queryKey: ['ai-root-cause', tag] });
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
