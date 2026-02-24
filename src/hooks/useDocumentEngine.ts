import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentSequence {
  id: string;
  tipo_documento: string;
  prefixo: string;
  ultimo_numero: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentLayout {
  id: string;
  tipo_documento: string;
  versao: string;
  nome: string;
  configuracao: Record<string, any>;
  ativo: boolean;
  autor_nome: string | null;
  created_at: string;
  updated_at: string;
}

export function useDocumentSequences() {
  return useQuery({
    queryKey: ['document-sequences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_sequences')
        .select('*')
        .order('tipo_documento');
      if (error) throw error;
      return data as DocumentSequence[];
    },
  });
}

export function useNextDocumentNumber() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tipo: string) => {
      const { data, error } = await supabase.rpc('next_document_number', { p_tipo: tipo });
      if (error) throw error;
      return data as string;
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useResetSequence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tipo: string) => {
      const { error } = await supabase
        .from('document_sequences')
        .update({ ultimo_numero: 0, updated_at: new Date().toISOString() })
        .eq('tipo_documento', tipo);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-sequences'] });
      toast({ title: 'Sequência reiniciada' });
    },
  });
}

export function useDocumentLayouts(tipo?: string) {
  return useQuery({
    queryKey: ['document-layouts', tipo],
    queryFn: async () => {
      let query = supabase.from('document_layouts').select('*').order('created_at', { ascending: false });
      if (tipo) query = query.eq('tipo_documento', tipo);
      const { data, error } = await query;
      if (error) throw error;
      return data as DocumentLayout[];
    },
  });
}

export function useActiveLayout(tipo: string) {
  return useQuery({
    queryKey: ['document-layouts', tipo, 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_layouts')
        .select('*')
        .eq('tipo_documento', tipo)
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as DocumentLayout | null;
    },
  });
}

export function useCreateLayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (layout: Omit<DocumentLayout, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('document_layouts')
        .insert(layout)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-layouts'] });
      toast({ title: 'Layout salvo', description: 'Nova versão do layout criada.' });
    },
  });
}

export function useUpdateLayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DocumentLayout> & { id: string }) => {
      const { error } = await supabase
        .from('document_layouts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-layouts'] });
      toast({ title: 'Layout atualizado' });
    },
  });
}
