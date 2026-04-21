import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { extractEdgeFunctionErrorAsync } from '@/lib/supabaseCompat';
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

      const body: Record<string, string> = {
        tag: params.tag,
        empresa_id: tenantId,
      };

      if (params.date_from) {
        body.date_from = params.date_from;
      }
      if (params.date_to) {
        body.date_to = params.date_to;
      }

      const { data, error } = await supabase.functions.invoke('analisar-causa-raiz', {
        body,
      });

      if (error) {
        throw new Error(await extractEdgeFunctionErrorAsync(error, data));
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      const { error } = await supabase
        .from('ai_root_cause_analysis')
        .delete()
        .eq('id', id)
        .eq('empresa_id', tenantId);
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
