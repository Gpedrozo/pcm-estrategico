import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentoTecnicoRow {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string | null;
  tag: string | null;
  descricao: string | null;
  versao: string | null;
  status: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  arquivo_tamanho: number | null;
  data_validade: string | null;
  data_aprovacao: string | null;
  aprovador_id: string | null;
  aprovador_nome: string | null;
  equipamento_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentoTecnicoInsert {
  codigo: string;
  titulo: string;
  tipo?: string | null;
  tag?: string | null;
  descricao?: string | null;
  versao?: string | null;
  status?: string | null;
  arquivo_url?: string | null;
  arquivo_nome?: string | null;
  arquivo_tamanho?: number | null;
  data_validade?: string | null;
  aprovador_nome?: string | null;
  equipamento_id?: string | null;
}

export interface DocumentoTecnicoUpdate {
  codigo?: string;
  titulo?: string;
  tipo?: string | null;
  tag?: string | null;
  descricao?: string | null;
  versao?: string | null;
  status?: string | null;
  arquivo_url?: string | null;
  arquivo_nome?: string | null;
  data_validade?: string | null;
  aprovador_nome?: string | null;
}

export function useDocumentosTecnicos() {
  return useQuery({
    queryKey: ['documentos_tecnicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentos_tecnicos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DocumentoTecnicoRow[];
    },
  });
}

export function useDocumentoByTag(tag: string | undefined) {
  return useQuery({
    queryKey: ['documentos_tecnicos', 'tag', tag],
    queryFn: async () => {
      if (!tag) return [];
      
      const { data, error } = await supabase
        .from('documentos_tecnicos')
        .select('*')
        .eq('tag', tag)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DocumentoTecnicoRow[];
    },
    enabled: !!tag,
  });
}

export function useCreateDocumentoTecnico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (documento: DocumentoTecnicoInsert) => {
      const { data, error } = await supabase
        .from('documentos_tecnicos')
        .insert(documento)
        .select()
        .single();

      if (error) throw error;
      return data as DocumentoTecnicoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos_tecnicos'] });
      toast({
        title: 'Documento cadastrado',
        description: 'Documento técnico cadastrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cadastrar documento',
        description: error.message || 'Ocorreu um erro ao cadastrar o documento.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateDocumentoTecnico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: DocumentoTecnicoUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('documentos_tecnicos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DocumentoTecnicoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos_tecnicos'] });
      toast({
        title: 'Documento atualizado',
        description: 'Documento técnico atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar documento',
        description: error.message || 'Ocorreu um erro ao atualizar o documento.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteDocumentoTecnico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('documentos_tecnicos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos_tecnicos'] });
      toast({
        title: 'Documento excluído',
        description: 'Documento técnico excluído com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir documento',
        description: error.message || 'Ocorreu um erro ao excluir o documento.',
        variant: 'destructive',
      });
    },
  });
}
