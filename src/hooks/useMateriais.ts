import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { materiaisService } from '@/services/materiais.service';

// ==================== INTERFACES ====================

export interface MaterialRow {
  id: string;
  codigo: string;
  nome: string;
  unidade: string;
  custo_unitario: number;
  estoque_atual: number;
  estoque_minimo: number;
  localizacao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialInsert {
  codigo: string;
  nome: string;
  unidade?: string;
  custo_unitario?: number;
  estoque_atual?: number;
  estoque_minimo?: number;
  localizacao?: string;
  ativo?: boolean;
}

export interface MaterialUpdate {
  codigo?: string;
  nome?: string;
  unidade?: string;
  custo_unitario?: number;
  estoque_atual?: number;
  estoque_minimo?: number;
  localizacao?: string;
  ativo?: boolean;
}

export interface MovimentacaoRow {
  id: string;
  material_id: string;
  os_id: string | null;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  quantidade: number;
  custo_unitario: number | null;
  custo_total: number | null;
  observacao: string | null;
  usuario_id: string | null;
  usuario_nome: string;
  created_at: string;
  material?: MaterialRow;
}

export interface MovimentacaoInsert {
  material_id: string;
  os_id?: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  quantidade: number;
  custo_unitario?: number;
  custo_total?: number;
  observacao?: string;
  usuario_id?: string;
  usuario_nome: string;
}

export interface MaterialOSRow {
  id: string;
  os_id: string;
  material_id: string;
  quantidade: number;
  custo_unitario: number;
  custo_total: number;
  created_at: string;
  material?: MaterialRow;
}

export interface MaterialOSInsert {
  os_id: string;
  material_id: string;
  quantidade: number;
  custo_unitario: number;
  custo_total: number;
}

// ==================== MATERIAIS ====================

export function useMateriais() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['materiais', tenantId],
    queryFn: async () => {
      return materiaisService.listar(tenantId!) as Promise<MaterialRow[]>;
    },
    enabled: !!tenantId,
  });
}

export function useMateriaisAtivos() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['materiais', tenantId, 'ativos'],
    queryFn: async () => {
      return materiaisService.listarAtivos(tenantId!) as Promise<MaterialRow[]>;
    },
    enabled: !!tenantId,
  });
}

export function useMateriaisBaixoEstoque() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['materiais', tenantId, 'baixo-estoque'],
    queryFn: async () => {
      const data = await materiaisService.listarAtivos(tenantId!) as MaterialRow[];
      return data.filter((m) => m.estoque_atual <= m.estoque_minimo);
    },
    enabled: !!tenantId,
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (material: MaterialInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return materiaisService.criar(material as any, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais', tenantId] });
      toast({
        title: 'Material criado',
        description: 'O material foi cadastrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar material',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...data }: MaterialUpdate & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return materiaisService.atualizar(id, data as any, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais', tenantId] });
      toast({
        title: 'Material atualizado',
        description: 'Os dados foram salvos com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar material',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      await materiaisService.excluir(id, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais', tenantId] });
      toast({
        title: 'Material excluído',
        description: 'O material foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir material',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ==================== MOVIMENTAÇÕES ====================

export function useMovimentacoes(materialId?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['movimentacoes', tenantId, materialId],
    queryFn: async () => {
      let query = supabase
        .from('movimentacoes_materiais')
        .select(`
          *,
          material:materiais(*)
        `)
        .eq('empresa_id', tenantId!)
        .order('created_at', { ascending: false });
      
      if (materialId) {
        query = query.eq('material_id', materialId);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return data as MovimentacaoRow[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateMovimentacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (movimentacao: MovimentacaoInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { data, error } = await supabase
        .from('movimentacoes_materiais')
        .insert({ ...movimentacao, empresa_id: tenantId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['materiais', tenantId] });
      toast({
        title: 'Movimentação registrada',
        description: 'O estoque foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na movimentação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ==================== MATERIAIS POR O.S. ====================

export function useMateriaisOS(osId: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['materiais-os', tenantId, osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materiais_os')
        .select(`
          *,
          material:materiais(*)
        `)
        .eq('empresa_id', tenantId!)
        .eq('os_id', osId);
      
      if (error) throw error;
      return data as MaterialOSRow[];
    },
    enabled: !!tenantId && !!osId,
  });
}

export function useAddMaterialOS() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (materialOS: MaterialOSInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { data, error } = await supabase
        .from('materiais_os')
        .insert({ ...materialOS, empresa_id: tenantId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['materiais-os', tenantId, variables.os_id] });
      queryClient.invalidateQueries({ queryKey: ['materiais', tenantId] });
      toast({
        title: 'Material adicionado',
        description: 'O material foi adicionado à O.S.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar material',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveMaterialOS() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, osId }: { id: string; osId: string }) => {
      const { error } = await supabase
        .from('materiais_os')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { osId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['materiais-os', tenantId, data.osId] });
      toast({
        title: 'Material removido',
        description: 'O material foi removido da O.S.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover material',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
