import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';

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
      const { data, error } = await supabase
        .from('melhorias')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MelhoriaRow[];
    },
  });
}

export function useMelhoriasAprovadas() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['melhorias', tenantId, 'aprovadas'],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('melhorias')
        .select('*')
        .eq('empresa_id', tenantId!)
        .in('status', ['APROVADA', 'EM_IMPLEMENTACAO', 'IMPLEMENTADA'])
        .order('data_aprovacao', { ascending: false });

      if (error) throw error;
      return (data || []) as MelhoriaRow[];
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['melhorias', tenantId] });
      writeAuditLog({ action: 'CREATE_MELHORIA', table: 'melhorias', recordId: data?.id, empresaId: tenantId, source: 'useMelhorias', metadata: { tipo: data?.tipo, titulo: data?.titulo } });
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['melhorias', tenantId] });
      writeAuditLog({ action: 'UPDATE_MELHORIA', table: 'melhorias', recordId: data?.id, empresaId: tenantId, source: 'useMelhorias', metadata: { status: data?.status } });
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
