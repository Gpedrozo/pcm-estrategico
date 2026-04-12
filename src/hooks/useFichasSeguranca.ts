import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';

export interface FichaSegurancaRow {
  id: string;
  empresa_id: string;
  codigo: string | null;
  nome_produto: string;
  fabricante: string | null;
  classificacao_ghs: string | null;
  perigos_principais: string | null;
  medidas_emergencia: string | null;
  primeiros_socorros: string | null;
  armazenamento: string | null;
  epi_recomendado: string | null;
  arquivo_url: string | null;
  data_validade: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FichaSegurancaInsert {
  nome_produto: string;
  codigo?: string | null;
  fabricante?: string | null;
  classificacao_ghs?: string | null;
  perigos_principais?: string | null;
  medidas_emergencia?: string | null;
  primeiros_socorros?: string | null;
  armazenamento?: string | null;
  epi_recomendado?: string | null;
  arquivo_url?: string | null;
  data_validade?: string | null;
}

export function useFichasSeguranca() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['fichas-seguranca', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fichas_seguranca')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('nome_produto')
        .limit(500);

      if (error) throw error;
      return data as FichaSegurancaRow[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateFichaSeguranca() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (ficha: FichaSegurancaInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('fichas_seguranca')
            .insert(payload)
            .select()
            .single(),
        { ...ficha, empresa_id: tenantId } as Record<string, unknown>,
      ) as Promise<FichaSegurancaRow>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fichas-seguranca', tenantId] });
      writeAuditLog({ action: 'CREATE_FICHA_SEGURANCA', table: 'fichas_seguranca', empresaId: tenantId, source: 'useFichasSeguranca' });
      toast({ title: 'FISPQ cadastrada', description: 'A ficha de segurança foi registrada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cadastrar FISPQ', description: error.message, variant: 'destructive' });
    },
  });
}
