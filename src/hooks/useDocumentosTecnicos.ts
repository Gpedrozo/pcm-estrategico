import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';
import { writeAuditLog } from '@/lib/audit';

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
  empresa_id?: string;
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
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['documentos_tecnicos', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('documentos_tecnicos')
        .select('*')
        .eq('empresa_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as DocumentoTecnicoRow[];
    },
    enabled: Boolean(tenantId),
  });
}

export function useDocumentoByTag(tag: string | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['documentos_tecnicos', 'tag', tag, tenantId],
    queryFn: async () => {
      if (!tag || !tenantId) return [];
      
      const { data, error } = await supabase
        .from('documentos_tecnicos')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('tag', tag)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as DocumentoTecnicoRow[];
    },
    enabled: !!tag && !!tenantId,
  });
}

export function useCreateDocumentoTecnico() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (documento: DocumentoTecnicoInsert) => {
      if (!tenantId) {
        throw new Error('Tenant não identificado para cadastro do documento.');
      }

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('documentos_tecnicos')
            .insert(payload)
            .select()
            .single(),
        { ...documento, empresa_id: tenantId } as Record<string, unknown>,
      ) as Promise<DocumentoTecnicoRow>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documentos_tecnicos'] });
      toast({
        title: 'Documento cadastrado',
        description: 'Documento técnico cadastrado com sucesso.',
      });
      writeAuditLog({ action: 'CREATE_DOCUMENTO_TECNICO', table: 'documentos_tecnicos', recordId: data.id, empresaId: tenantId, source: 'useDocumentosTecnicos' });
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: DocumentoTecnicoUpdate & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não identificado.');

      return updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('documentos_tecnicos')
            .update(payload)
            .eq('id', id)
            .eq('empresa_id', tenantId)
            .select()
            .single(),
        updates as Record<string, unknown>,
      ) as Promise<DocumentoTecnicoRow>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documentos_tecnicos'] });
      toast({
        title: 'Documento atualizado',
        description: 'Documento técnico atualizado com sucesso.',
      });
      writeAuditLog({ action: 'UPDATE_DOCUMENTO_TECNICO', table: 'documentos_tecnicos', recordId: data.id, empresaId: tenantId, source: 'useDocumentosTecnicos' });
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não identificado.');

      const { error } = await supabase
        .from('documentos_tecnicos')
        .delete()
        .eq('id', id)
        .eq('empresa_id', tenantId);

      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['documentos_tecnicos'] });
      toast({
        title: 'Documento excluído',
        description: 'Documento técnico excluído com sucesso.',
      });
      writeAuditLog({ action: 'DELETE_DOCUMENTO_TECNICO', table: 'documentos_tecnicos', recordId: deletedId, empresaId: tenantId, source: 'useDocumentosTecnicos', severity: 'warning' });
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
