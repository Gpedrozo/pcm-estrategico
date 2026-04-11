import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { hierarquiaService } from '@/services/hierarquia.service';
import { writeAuditLog } from '@/lib/audit';

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
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['plantas', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return hierarquiaService.listarPlantas(tenantId) as Promise<PlantaRow[]>;
    },
    enabled: !!tenantId,
  });
}

export function usePlantasAtivas() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['plantas', tenantId, 'ativas'],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');

      const { data, error } = await supabase
        .from('plantas')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('ativo', true)
        .order('codigo')
        .limit(500);
      
      if (error) throw error;
      return data as PlantaRow[];
    },
    enabled: !!tenantId,
  });
}

export function useCreatePlanta() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (planta: PlantaInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return hierarquiaService.criarPlanta(planta as any, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantas', tenantId] });
      writeAuditLog({ action: 'CREATE_PLANTA', table: 'plantas', empresaId: tenantId, source: 'useHierarquia' });
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...data }: PlantaUpdate & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return hierarquiaService.atualizarPlanta(id, data as any, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantas', tenantId] });
      writeAuditLog({ action: 'UPDATE_PLANTA', table: 'plantas', empresaId: tenantId, source: 'useHierarquia' });
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      await hierarquiaService.excluirPlanta(id, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantas', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['areas', tenantId] });
      writeAuditLog({ action: 'DELETE_PLANTA', table: 'plantas', empresaId: tenantId, source: 'useHierarquia', severity: 'warning' });
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
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['areas', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return hierarquiaService.listarAreas(tenantId) as Promise<AreaRow[]>;
    },
    enabled: !!tenantId,
  });
}

export function useAreasByPlanta(plantaId: string | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['areas', 'planta', plantaId, tenantId],
    queryFn: async () => {
      if (!plantaId || !tenantId) return [];
      
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .eq('empresa_id', tenantId)
        .eq('planta_id', plantaId)
        .eq('ativo', true)
        .order('codigo')
        .limit(500);
      
      if (error) throw error;
      return data as AreaRow[];
    },
    enabled: !!plantaId && !!tenantId,
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (area: AreaInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return hierarquiaService.criarArea(area as any, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas', tenantId] });
      writeAuditLog({ action: 'CREATE_AREA', table: 'areas', empresaId: tenantId, source: 'useHierarquia' });
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...data }: AreaUpdate & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return hierarquiaService.atualizarArea(id, data as any, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas', tenantId] });
      writeAuditLog({ action: 'UPDATE_AREA', table: 'areas', empresaId: tenantId, source: 'useHierarquia' });
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      await hierarquiaService.excluirArea(id, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['sistemas', tenantId] });
      writeAuditLog({ action: 'DELETE_AREA', table: 'areas', empresaId: tenantId, source: 'useHierarquia', severity: 'warning' });
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
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['sistemas', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return hierarquiaService.listarSistemas(tenantId) as Promise<SistemaRow[]>;
    },
    enabled: !!tenantId,
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
        .order('codigo')
        .limit(500);
      
      if (error) throw error;
      return data as SistemaRow[];
    },
    enabled: !!areaId,
  });
}

export function useCreateSistema() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (sistema: SistemaInsert) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return hierarquiaService.criarSistema(sistema as any, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sistemas', tenantId] });
      writeAuditLog({ action: 'CREATE_SISTEMA', table: 'sistemas', empresaId: tenantId, source: 'useHierarquia' });
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...data }: SistemaUpdate & { id: string }) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      return hierarquiaService.atualizarSistema(id, data as any, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sistemas', tenantId] });
      writeAuditLog({ action: 'UPDATE_SISTEMA', table: 'sistemas', empresaId: tenantId, source: 'useHierarquia' });
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
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('Tenant não resolvido.');
      await hierarquiaService.excluirSistema(id, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sistemas', tenantId] });
      writeAuditLog({ action: 'DELETE_SISTEMA', table: 'sistemas', empresaId: tenantId, source: 'useHierarquia', severity: 'warning' });
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
