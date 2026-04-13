import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback } from '@/lib/supabaseCompat';
import { useAuth } from '@/contexts/AuthContext';
import { writeAuditLog } from '@/lib/audit';

// ── Tipos ──────────────────────────────────────────────
export type StatusColaborador = 'ATIVO' | 'INATIVO' | 'AFASTADO' | 'DESLIGADO';

export interface ColaboradorSSMARow {
  id: string;
  empresa_id: string;
  nome: string;
  funcao: string | null;
  setor: string | null;
  matricula: string | null;
  data_admissao: string | null;
  status: StatusColaborador;
  created_at: string;
  updated_at: string;
}

export interface ColaboradorSSMAInsert {
  nome: string;
  funcao?: string | null;
  setor?: string | null;
  matricula?: string | null;
  data_admissao?: string | null;
  status?: StatusColaborador;
}

export interface ColaboradorSSMAUpdate extends Partial<ColaboradorSSMAInsert> {
  id: string;
}

// ── Labels ─────────────────────────────────────────────
export const STATUS_COLABORADOR_LABELS: Record<StatusColaborador, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  AFASTADO: 'Afastado',
  DESLIGADO: 'Desligado',
};

// ── Hooks ──────────────────────────────────────────────

export function useColaboradoresSSMA() {
  const { tenantId } = useAuth();

  return useQuery<ColaboradorSSMARow[]>({
    queryKey: ['colaboradores-ssma', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores_ssma')
        .select('*')
        .eq('empresa_id', tenantId!)
        .order('nome', { ascending: true })
        .limit(500);

      if (error) throw error;
      return (data ?? []) as ColaboradorSSMARow[];
    },
  });
}

export function useColaboradoresSSMAAtivos() {
  const { data: colaboradores, ...rest } = useColaboradoresSSMA();
  return {
    ...rest,
    data: colaboradores?.filter((c) => c.status === 'ATIVO') ?? [],
  };
}

export function useCreateColaboradorSSMA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (input: ColaboradorSSMAInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('colaboradores_ssma')
            .insert(payload)
            .select()
            .single(),
        { ...input, empresa_id: tenantId } as Record<string, unknown>,
      ) as Promise<ColaboradorSSMARow>;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<ColaboradorSSMARow[]>(
        ['colaboradores-ssma', tenantId],
        (old) => [...(old ?? []), created].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      );
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ssma'] });
      writeAuditLog({ action: 'CREATE_COLABORADOR_SSMA', table: 'colaboradores_ssma', empresaId: tenantId, source: 'useColaboradoresSSMA' });
      toast({ title: 'Colaborador cadastrado', description: 'O colaborador foi adicionado com sucesso.' });
    },
    onError: (error: Error) => {
      const msg = error.message.includes('idx_colaboradores_ssma_matricula_uq')
        ? 'Já existe um colaborador com esta matrícula nesta empresa.'
        : error.message;
      toast({ title: 'Erro ao cadastrar colaborador', description: msg, variant: 'destructive' });
    },
  });
}

export function useUpdateColaboradorSSMA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ColaboradorSSMAUpdate) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { data, error } = await supabase
        .from('colaboradores_ssma')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .eq('empresa_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data as ColaboradorSSMARow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ssma'] });
      toast({ title: 'Colaborador atualizado' });
    },
    onError: (error: Error) => {
      const msg = error.message.includes('idx_colaboradores_ssma_matricula_uq')
        ? 'Já existe um colaborador com esta matrícula nesta empresa.'
        : error.message;
      toast({ title: 'Erro ao atualizar colaborador', description: msg, variant: 'destructive' });
    },
  });
}

export function useDeleteColaboradorSSMA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { error } = await supabase
        .from('colaboradores_ssma')
        .delete()
        .eq('id', id)
        .eq('empresa_id', tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ssma'] });
      writeAuditLog({ action: 'DELETE_COLABORADOR_SSMA', table: 'colaboradores_ssma', empresaId: tenantId, source: 'useColaboradoresSSMA' });
      toast({ title: 'Colaborador removido' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover colaborador', description: error.message, variant: 'destructive' });
    },
  });
}
