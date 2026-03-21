import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseErrorMessage, insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';

export interface MelhoriaRow {
  id: string;
  numero_melhoria: number;
  titulo: string;
  descricao: string;
  tipo: 'KAIZEN' | 'PROJETO' | 'LICAO_APRENDIDA' | 'SUGESTAO';
  area: string | null;
  equipamento_id: string | null;
  tag: string | null;
  situacao_antes: string | null;
  situacao_depois: string | null;
  beneficios: string | null;
  custo_implementacao: number | null;
  economia_anual: number | null;
  roi_meses: number | null;
  status: 'PROPOSTA' | 'EM_AVALIACAO' | 'APROVADA' | 'EM_IMPLEMENTACAO' | 'IMPLEMENTADA' | 'REJEITADA';
  proponente_nome: string;
  proponente_id: string | null;
  aprovador_nome: string | null;
  aprovador_id: string | null;
  data_aprovacao: string | null;
  data_implementacao: string | null;
  anexos: any;
  padronizada?: boolean;
  created_at: string;
  updated_at: string;
}

export interface MelhoriaInsert {
  titulo: string;
  descricao: string;
  tipo?: 'KAIZEN' | 'PROJETO' | 'LICAO_APRENDIDA' | 'SUGESTAO';
  area?: string | null;
  equipamento_id?: string | null;
  tag?: string | null;
  situacao_antes?: string | null;
  situacao_depois?: string | null;
  beneficios?: string | null;
  custo_implementacao?: number | null;
  economia_anual?: number | null;
  proponente_nome: string;
  proponente_id?: string | null;
  padronizada?: boolean;
}

export function useMelhorias() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['melhorias', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) return [];

      const tenantQuery = await supabase
        .from('melhorias')
        .select('*')
        .eq('empresa_id', tenantId)
        .order('created_at', { ascending: false });

      if (!tenantQuery.error) return (tenantQuery.data || []) as MelhoriaRow[];

      const message = getSupabaseErrorMessage(tenantQuery.error).toLowerCase();
      const missingEmpresa = message.includes('empresa_id') && message.includes('column');
      if (!missingEmpresa) throw tenantQuery.error;

      const allRows = await supabase
        .from('melhorias')
        .select('*')
        .order('created_at', { ascending: false });

      if (allRows.error) throw allRows.error;
      return (allRows.data || []) as MelhoriaRow[];
    },
  });
}

export function useMelhoriasAprovadas() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['melhorias', tenantId, 'aprovadas'],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      if (!tenantId) return [];

      const tenantQuery = await supabase
        .from('melhorias')
        .select('*')
        .eq('empresa_id', tenantId)
        .in('status', ['APROVADA', 'EM_IMPLEMENTACAO', 'IMPLEMENTADA'])
        .order('data_aprovacao', { ascending: false });

      if (!tenantQuery.error) return (tenantQuery.data || []) as MelhoriaRow[];

      const message = getSupabaseErrorMessage(tenantQuery.error).toLowerCase();
      const missingEmpresa = message.includes('empresa_id') && message.includes('column');
      if (!missingEmpresa) throw tenantQuery.error;

      const allRows = await supabase
        .from('melhorias')
        .select('*')
        .in('status', ['APROVADA', 'EM_IMPLEMENTACAO', 'IMPLEMENTADA'])
        .order('data_aprovacao', { ascending: false });

      if (allRows.error) throw allRows.error;
      return (allRows.data || []) as MelhoriaRow[];
    },
  });
}

export function useCreateMelhoria() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (melhoria: MelhoriaInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      // Calculate ROI if both costs are provided
      let roi_meses = null;
      if (melhoria.custo_implementacao && melhoria.economia_anual && melhoria.economia_anual > 0) {
        roi_meses = Math.round((melhoria.custo_implementacao / melhoria.economia_anual) * 12);
      }

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('melhorias')
            .insert(payload)
            .select()
            .single(),
        {
          empresa_id: tenantId,
          ...melhoria,
          roi_meses,
        } as Record<string, unknown>,
      ) as Promise<MelhoriaRow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['melhorias', tenantId] });
      toast({
        title: 'Melhoria registrada',
        description: 'A proposta de melhoria foi registrada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao registrar melhoria',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMelhoria() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MelhoriaRow> & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('melhorias')
            .update(payload)
            .eq('id', id)
            .eq('empresa_id', tenantId)
            .select()
            .single(),
        updates as Record<string, unknown>,
      ) as Promise<MelhoriaRow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['melhorias', tenantId] });
      toast({
        title: 'Melhoria atualizada',
        description: 'A melhoria foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar melhoria',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
