import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  return useQuery({
    queryKey: ['materiais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materiais')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as MaterialRow[];
    },
  });
}

export function useMateriaisAtivos() {
  return useQuery({
    queryKey: ['materiais', 'ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materiais')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data as MaterialRow[];
    },
  });
}

export function useMateriaisBaixoEstoque() {
  return useQuery({
    queryKey: ['materiais', 'baixo-estoque'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materiais')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      
      // Filter materials where current stock is below minimum
      return (data as MaterialRow[]).filter(
        (m) => m.estoque_atual <= m.estoque_minimo
      );
    },
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (material: MaterialInsert) => {
      const { data, error } = await supabase
        .from('materiais')
        .insert(material)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais'] });
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

  return useMutation({
    mutationFn: async ({ id, ...data }: MaterialUpdate & { id: string }) => {
      const { error } = await supabase
        .from('materiais')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais'] });
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('materiais')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais'] });
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
  return useQuery({
    queryKey: ['movimentacoes', materialId],
    queryFn: async () => {
      let query = supabase
        .from('movimentacoes_materiais')
        .select(`
          *,
          material:materiais(*)
        `)
        .order('created_at', { ascending: false });
      
      if (materialId) {
        query = query.eq('material_id', materialId);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return data as MovimentacaoRow[];
    },
  });
}

export function useCreateMovimentacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (movimentacao: MovimentacaoInsert) => {
      const { data, error } = await supabase
        .from('movimentacoes_materiais')
        .insert(movimentacao)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['materiais'] });
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
  return useQuery({
    queryKey: ['materiais-os', osId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materiais_os')
        .select(`
          *,
          material:materiais(*)
        `)
        .eq('os_id', osId);
      
      if (error) throw error;
      return data as MaterialOSRow[];
    },
    enabled: !!osId,
  });
}

export function useAddMaterialOS() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (materialOS: MaterialOSInsert) => {
      const { data, error } = await supabase
        .from('materiais_os')
        .insert(materialOS)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['materiais-os', variables.os_id] });
      queryClient.invalidateQueries({ queryKey: ['materiais'] });
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
      queryClient.invalidateQueries({ queryKey: ['materiais-os', data.osId] });
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
