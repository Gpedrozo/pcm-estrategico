import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ==================== INTERFACES ====================

export interface PlantaRow {
  id: string;
  codigo: string;
  nome: string;
  endereco: string | null;
  responsavel: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlantaInsert {
  codigo: string;
  nome: string;
  endereco?: string;
  responsavel?: string;
  ativo?: boolean;
}

export interface PlantaUpdate {
  codigo?: string;
  nome?: string;
  endereco?: string;
  responsavel?: string;
  ativo?: boolean;
}

export interface AreaRow {
  id: string;
  planta_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  planta?: PlantaRow;
}

export interface AreaInsert {
  planta_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  ativo?: boolean;
}

export interface AreaUpdate {
  planta_id?: string;
  codigo?: string;
  nome?: string;
  descricao?: string;
  ativo?: boolean;
}

export interface SistemaRow {
  id: string;
  area_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  funcao_principal: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  area?: AreaRow;
}

export interface SistemaInsert {
  area_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  funcao_principal?: string;
  ativo?: boolean;
}

export interface SistemaUpdate {
  area_id?: string;
  codigo?: string;
  nome?: string;
  descricao?: string;
  funcao_principal?: string;
  ativo?: boolean;
}

// ==================== PLANTAS ====================

export function usePlantas() {
  return useQuery({
    queryKey: ['plantas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plantas')
        .select('*')
        .order('codigo');
      
      if (error) throw error;
      return data as PlantaRow[];
    },
  });
}

export function usePlantasAtivas() {
  return useQuery({
    queryKey: ['plantas', 'ativas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plantas')
        .select('*')
        .eq('ativo', true)
        .order('codigo');
      
      if (error) throw error;
      return data as PlantaRow[];
    },
  });
}

export function useCreatePlanta() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (planta: PlantaInsert) => {
      const { data, error } = await supabase
        .from('plantas')
        .insert(planta)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantas'] });
      toast({
        title: 'Planta criada',
        description: 'A planta foi cadastrada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar planta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePlanta() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: PlantaUpdate & { id: string }) => {
      const { error } = await supabase
        .from('plantas')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantas'] });
      toast({
        title: 'Planta atualizada',
        description: 'Os dados foram salvos com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar planta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePlanta() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plantas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantas'] });
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      toast({
        title: 'Planta excluída',
        description: 'A planta foi removida com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir planta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ==================== ÁREAS ====================

export function useAreas() {
  return useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('areas')
        .select(`
          *,
          planta:plantas(*)
        `)
        .order('codigo');
      
      if (error) throw error;
      return data as AreaRow[];
    },
  });
}

export function useAreasByPlanta(plantaId: string | undefined) {
  return useQuery({
    queryKey: ['areas', 'planta', plantaId],
    queryFn: async () => {
      if (!plantaId) return [];
      
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .eq('planta_id', plantaId)
        .eq('ativo', true)
        .order('codigo');
      
      if (error) throw error;
      return data as AreaRow[];
    },
    enabled: !!plantaId,
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (area: AreaInsert) => {
      const { data, error } = await supabase
        .from('areas')
        .insert(area)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      toast({
        title: 'Área criada',
        description: 'A área foi cadastrada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar área',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: AreaUpdate & { id: string }) => {
      const { error } = await supabase
        .from('areas')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      toast({
        title: 'Área atualizada',
        description: 'Os dados foram salvos com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar área',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
      queryClient.invalidateQueries({ queryKey: ['sistemas'] });
      toast({
        title: 'Área excluída',
        description: 'A área foi removida com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir área',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ==================== SISTEMAS ====================

export function useSistemas() {
  return useQuery({
    queryKey: ['sistemas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sistemas')
        .select(`
          *,
          area:areas(*, planta:plantas(*))
        `)
        .order('codigo');
      
      if (error) throw error;
      return data as SistemaRow[];
    },
  });
}

export function useSistemasByArea(areaId: string | undefined) {
  return useQuery({
    queryKey: ['sistemas', 'area', areaId],
    queryFn: async () => {
      if (!areaId) return [];
      
      const { data, error } = await supabase
        .from('sistemas')
        .select('*')
        .eq('area_id', areaId)
        .eq('ativo', true)
        .order('codigo');
      
      if (error) throw error;
      return data as SistemaRow[];
    },
    enabled: !!areaId,
  });
}

export function useCreateSistema() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sistema: SistemaInsert) => {
      const { data, error } = await supabase
        .from('sistemas')
        .insert(sistema)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sistemas'] });
      toast({
        title: 'Sistema criado',
        description: 'O sistema foi cadastrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar sistema',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSistema() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: SistemaUpdate & { id: string }) => {
      const { error } = await supabase
        .from('sistemas')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sistemas'] });
      toast({
        title: 'Sistema atualizado',
        description: 'Os dados foram salvos com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar sistema',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSistema() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sistemas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sistemas'] });
      toast({
        title: 'Sistema excluído',
        description: 'O sistema foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir sistema',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
