import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseErrorMessage, isMissingTableError } from '@/lib/supabaseCompat';
import { writeAuditLog } from '@/lib/audit';

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
  LUBRIFICACAO: 'LUB',
  INSPECAO: 'INSPE',
  PREDITIVA: 'PRED',
  RELATORIO: 'RL',
  SOLICITACAO: 'SS',
  PERMISSAO_TRABALHO: 'PT',
  INCIDENTE: 'IC',
  RCA: 'RCA',
  FMEA: 'FMEA',
  MELHORIA: 'MELH',
  CONTRATO: 'CONT',
  MATERIAL: 'MAT',
  FORNECEDOR: 'FN',
  LUBRIFICANTE: 'EL',
  ROTA_LUB: 'RL',
};

const DOCUMENT_SEQUENCES_TABLE = 'document_sequences';

function isMissingDocumentSequencesTable(error: unknown): boolean {
  const message = getSupabaseErrorMessage(error).toLowerCase();
  return isMissingTableError(error) || message.includes('document_sequences');
}

function formatRuntimeError(error: unknown, fallback = 'Falha inesperada no motor de documentos.'): Error {
  const message = getSupabaseErrorMessage(error);
  if (message) return new Error(message);

  if (typeof error === 'string' && error.trim().length > 0) {
    return new Error(error);
  }

  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(fallback);
  }
}

function buildFallbackDocumentNumber(prefixo: string) {
  const now = new Date();
  const compact = [
    now.getFullYear().toString().slice(-2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  return `${prefixo}-${compact}`;
}

export function useDocumentSequences() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['document-sequences', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from(DOCUMENT_SEQUENCES_TABLE)
        .select('*')
        .eq('empresa_id', tenantId)
        .order('tipo_documento')
        .limit(500);

      if (error) {
        if (isMissingDocumentSequencesTable(error)) {
          return [];
        }
        throw formatRuntimeError(error);
      }

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

      try {
        const { error: upsertError } = await supabase
          .from(DOCUMENT_SEQUENCES_TABLE)
          .upsert(
            {
              empresa_id: tenantId,
              tipo_documento: tipo,
              prefixo,
              proximo_numero: 1,
            },
            { onConflict: 'empresa_id,tipo_documento' },
          );

        if (upsertError) {
          if (isMissingDocumentSequencesTable(upsertError)) {
            return buildFallbackDocumentNumber(prefixo);
          }
          throw formatRuntimeError(upsertError);
        }

        for (let attempt = 0; attempt < 5; attempt += 1) {
          const { data: currentRow, error: currentError } = await supabase
            .from(DOCUMENT_SEQUENCES_TABLE)
            .select('id,prefixo,proximo_numero')
            .eq('empresa_id', tenantId)
            .eq('tipo_documento', tipo)
            .single();

          if (currentError) {
            if (isMissingDocumentSequencesTable(currentError)) {
              return buildFallbackDocumentNumber(prefixo);
            }
            throw formatRuntimeError(currentError);
          }

          const numeroAtual = Number(currentRow.proximo_numero || 1);
          const proximoValor = numeroAtual + 1;

          const { data: updatedRows, error: updateError } = await supabase
            .from(DOCUMENT_SEQUENCES_TABLE)
            .update({ proximo_numero: proximoValor, updated_at: new Date().toISOString() })
            .eq('id', currentRow.id)
            .eq('proximo_numero', numeroAtual)
            .select('id');

          if (updateError) {
            if (isMissingDocumentSequencesTable(updateError)) {
              return buildFallbackDocumentNumber(prefixo);
            }
            throw formatRuntimeError(updateError);
          }

          if (updatedRows && updatedRows.length > 0) {
            return `${currentRow.prefixo}-${String(numeroAtual).padStart(6, '0')}`;
          }
        }

        throw new Error('Não foi possível gerar o número do documento. Tente novamente.');
      } catch (error) {
        if (isMissingDocumentSequencesTable(error)) {
          return buildFallbackDocumentNumber(prefixo);
        }

        throw formatRuntimeError(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-sequences', tenantId] });
      writeAuditLog({ action: 'GENERATE_DOCUMENT_NUMBER', table: 'document_sequences', empresaId: tenantId, source: 'useDocumentEngine' });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : getSupabaseErrorMessage(error) || 'Falha ao gerar número do documento.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
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
        .from(DOCUMENT_SEQUENCES_TABLE)
        .update({ proximo_numero: 1, updated_at: new Date().toISOString() })
        .eq('empresa_id', tenantId)
        .eq('tipo_documento', tipo);
      if (error) {
        if (isMissingDocumentSequencesTable(error)) return;
        throw formatRuntimeError(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-sequences', tenantId] });
      writeAuditLog({ action: 'RESET_DOCUMENT_SEQUENCE', table: 'document_sequences', empresaId: tenantId, source: 'useDocumentEngine', severity: 'warning' });
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
      const { data, error } = await query.limit(500);
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
      writeAuditLog({ action: 'CREATE_DOCUMENT_LAYOUT', table: 'document_layouts', empresaId: tenantId, source: 'useDocumentEngine' });
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
      writeAuditLog({ action: 'UPDATE_DOCUMENT_LAYOUT', table: 'document_layouts', empresaId: tenantId, source: 'useDocumentEngine' });
      toast({ title: 'Layout atualizado' });
    },
  });
}
