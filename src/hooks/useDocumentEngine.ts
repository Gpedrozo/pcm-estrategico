import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface DocumentSequence {
  id: string;
  empresa_id: string;
  tipo_documento: string;
  prefixo: string;
  proximo_numero: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentLayout {
  id: string;
  empresa_id: string;
  tipo_documento: string;
  versao: string;
  nome: string;
  configuracao: Record<string, any>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFIX_BY_TYPE: Record<string, string> = {
  ORDEM_SERVICO: 'OS',
  PREVENTIVA: 'PR',
  LUBRIFICACAO: 'LB',
  INSPECAO: 'IN',
  RELATORIO: 'RL',
};

export function useDocumentSequences() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['document-sequences', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('document_sequences')
        .select('*')
        .eq('empresa_id', tenantId)
        .order('tipo_documento');
      if (error) throw error;
      return data as DocumentSequence[];
    },
    enabled: Boolean(tenantId),
  });
}

export function useNextDocumentNumber() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (tipo: string) => {
      if (!tenantId) throw new Error('Tenant não identificado.');

      const prefixo = DEFAULT_PREFIX_BY_TYPE[tipo] ?? tipo.slice(0, 3).toUpperCase();

      await supabase
        .from('document_sequences')
        .upsert(
          {
            empresa_id: tenantId,
            tipo_documento: tipo,
            prefixo,
            proximo_numero: 1,
          },
          { onConflict: 'empresa_id,tipo_documento' },
        );

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data: currentRow, error: currentError } = await supabase
          .from('document_sequences')
          .select('id,prefixo,proximo_numero')
          .eq('empresa_id', tenantId)
          .eq('tipo_documento', tipo)
          .single();

        if (currentError) throw currentError;

        const numeroAtual = Number(currentRow.proximo_numero || 1);
        const proximoValor = numeroAtual + 1;

        const { data: updatedRows, error: updateError } = await supabase
          .from('document_sequences')
          .update({ proximo_numero: proximoValor, updated_at: new Date().toISOString() })
          .eq('id', currentRow.id)
          .eq('proximo_numero', numeroAtual)
          .select('id');

        if (updateError) throw updateError;

        if (updatedRows && updatedRows.length > 0) {
          return `${currentRow.prefixo}-${String(numeroAtual).padStart(6, '0')}`;
        }
      }

      throw new Error('Não foi possível gerar o número do documento. Tente novamente.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-sequences', tenantId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useResetSequence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (tipo: string) => {
      if (!tenantId) throw new Error('Tenant não identificado.');

      const { error } = await supabase
        .from('document_sequences')
        .update({ proximo_numero: 1, updated_at: new Date().toISOString() })
        .eq('empresa_id', tenantId)
        .eq('tipo_documento', tipo);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-sequences', tenantId] });
      toast({ title: 'Sequência reiniciada' });
    },
  });
}

export function useDocumentLayouts(tipo?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['document-layouts', tenantId, tipo],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase.from('document_layouts').select('*').order('created_at', { ascending: false });
      query = query.eq('empresa_id', tenantId);
      if (tipo) query = query.eq('tipo_documento', tipo);
      const { data, error } = await query;
      if (error) throw error;
      return data as DocumentLayout[];
    },
    enabled: Boolean(tenantId),
  });
}

export function useActiveLayout(tipo: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['document-layouts', tenantId, tipo, 'active'],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('document_layouts')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('tipo_documento', tipo)
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as DocumentLayout | null;
    },
    enabled: Boolean(tenantId && tipo),
  });
}

export function useCreateLayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (layout: Omit<DocumentLayout, 'id' | 'created_at' | 'updated_at' | 'empresa_id'>) => {
      if (!tenantId) throw new Error('Tenant não identificado.');

      const { data, error } = await supabase
        .from('document_layouts')
        .insert({ ...layout, empresa_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-layouts', tenantId] });
      toast({ title: 'Layout salvo', description: 'Nova versão do layout criada.' });
    },
  });
}

export function useUpdateLayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DocumentLayout> & { id: string }) => {
      const { error } = await supabase
        .from('document_layouts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('empresa_id', tenantId ?? '')
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-layouts', tenantId] });
      toast({ title: 'Layout atualizado' });
    },
  });
}
