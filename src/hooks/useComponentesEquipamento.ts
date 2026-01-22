import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ComponenteEquipamento {
  id: string;
  equipamento_id: string;
  parent_id: string | null;
  codigo: string;
  nome: string;
  tipo: string;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  potencia: string | null;
  rpm: string | null;
  tensao: string | null;
  corrente: string | null;
  dimensoes: {
    diametro?: string;
    comprimento?: string;
    largura?: string;
    altura?: string;
    peso?: string;
  } | null;
  especificacoes: Record<string, string> | null;
  quantidade: number;
  posicao: string | null;
  data_instalacao: string | null;
  vida_util_horas: number | null;
  horas_operacao: number;
  ultima_manutencao: string | null;
  proxima_manutencao: string | null;
  intervalo_manutencao_dias: number | null;
  estado: string;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  children?: ComponenteEquipamento[];
}

export interface ComponenteInsert {
  equipamento_id: string;
  parent_id?: string | null;
  codigo: string;
  nome: string;
  tipo: string;
  fabricante?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  potencia?: string | null;
  rpm?: string | null;
  tensao?: string | null;
  corrente?: string | null;
  dimensoes?: Record<string, string> | null;
  especificacoes?: Record<string, string> | null;
  quantidade?: number;
  posicao?: string | null;
  data_instalacao?: string | null;
  vida_util_horas?: number | null;
  horas_operacao?: number;
  ultima_manutencao?: string | null;
  proxima_manutencao?: string | null;
  intervalo_manutencao_dias?: number | null;
  estado?: string;
  ativo?: boolean;
  observacoes?: string | null;
}

export interface ComponenteUpdate extends Partial<Omit<ComponenteInsert, 'equipamento_id'>> {
  id: string;
}

export const TIPOS_COMPONENTE = [
  { value: 'MOTOR', label: 'Motor Elétrico' },
  { value: 'REDUTOR', label: 'Redutor' },
  { value: 'ACOPLAMENTO', label: 'Acoplamento' },
  { value: 'EIXO', label: 'Eixo' },
  { value: 'ROLAMENTO', label: 'Rolamento' },
  { value: 'MANCAL', label: 'Mancal' },
  { value: 'CHAVETA', label: 'Chaveta' },
  { value: 'TRANSMISSAO', label: 'Transmissão' },
  { value: 'CORREIA', label: 'Correia' },
  { value: 'POLIA', label: 'Polia' },
  { value: 'ENGRENAGEM', label: 'Engrenagem' },
  { value: 'BOMBA', label: 'Bomba' },
  { value: 'VALVULA', label: 'Válvula' },
  { value: 'CILINDRO', label: 'Cilindro' },
  { value: 'INVERSOR', label: 'Inversor de Frequência' },
  { value: 'DISJUNTOR', label: 'Disjuntor' },
  { value: 'CONTATOR', label: 'Contator' },
  { value: 'RELE', label: 'Relé' },
  { value: 'SENSOR', label: 'Sensor' },
  { value: 'FIO', label: 'Fiação/Cabo' },
  { value: 'FILTRO', label: 'Filtro' },
  { value: 'VEDACAO', label: 'Vedação/Retentor' },
  { value: 'OUTRO', label: 'Outro' },
] as const;

export const ESTADOS_COMPONENTE = [
  { value: 'BOM', label: 'Bom', color: 'bg-green-500' },
  { value: 'REGULAR', label: 'Regular', color: 'bg-yellow-500' },
  { value: 'RUIM', label: 'Ruim', color: 'bg-orange-500' },
  { value: 'SUBSTITUIR', label: 'Substituir', color: 'bg-red-500' },
] as const;

// Build hierarchical tree from flat list
function buildComponentTree(components: ComponenteEquipamento[]): ComponenteEquipamento[] {
  const map = new Map<string, ComponenteEquipamento>();
  const roots: ComponenteEquipamento[] = [];

  // First pass: create map
  components.forEach(comp => {
    map.set(comp.id, { ...comp, children: [] });
  });

  // Second pass: build tree
  components.forEach(comp => {
    const node = map.get(comp.id)!;
    if (comp.parent_id && map.has(comp.parent_id)) {
      map.get(comp.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function useComponentesEquipamento(equipamentoId?: string) {
  return useQuery({
    queryKey: ['componentes-equipamento', equipamentoId],
    queryFn: async () => {
      if (!equipamentoId) return [];
      
      const { data, error } = await supabase
        .from('componentes_equipamento')
        .select('*')
        .eq('equipamento_id', equipamentoId)
        .order('tipo', { ascending: true })
        .order('nome', { ascending: true });

      if (error) throw error;
      return buildComponentTree(data as ComponenteEquipamento[]);
    },
    enabled: !!equipamentoId,
  });
}

export function useAllComponentes(equipamentoId?: string) {
  return useQuery({
    queryKey: ['componentes-equipamento-flat', equipamentoId],
    queryFn: async () => {
      if (!equipamentoId) return [];
      
      const { data, error } = await supabase
        .from('componentes_equipamento')
        .select('*')
        .eq('equipamento_id', equipamentoId)
        .order('tipo', { ascending: true })
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as ComponenteEquipamento[];
    },
    enabled: !!equipamentoId,
  });
}

export function useCreateComponente() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (componente: ComponenteInsert) => {
      const { data, error } = await supabase
        .from('componentes_equipamento')
        .insert(componente)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['componentes-equipamento'] });
      queryClient.invalidateQueries({ queryKey: ['componentes-equipamento-flat'] });
      toast({
        title: 'Componente Cadastrado',
        description: `${data.nome} foi cadastrado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message || 'Ocorreu um erro ao cadastrar o componente.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateComponente() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ComponenteUpdate) => {
      const { data, error } = await supabase
        .from('componentes_equipamento')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['componentes-equipamento'] });
      queryClient.invalidateQueries({ queryKey: ['componentes-equipamento-flat'] });
      toast({
        title: 'Componente Atualizado',
        description: `${data.nome} foi atualizado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Ocorreu um erro ao atualizar o componente.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteComponente() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('componentes_equipamento')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['componentes-equipamento'] });
      queryClient.invalidateQueries({ queryKey: ['componentes-equipamento-flat'] });
      toast({
        title: 'Componente Excluído',
        description: 'O componente foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Ocorreu um erro ao excluir o componente.',
        variant: 'destructive',
      });
    },
  });
}

export function useDuplicateComponente() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ componente, newCodigo }: { componente: ComponenteEquipamento; newCodigo: string }) => {
      const { id, created_at, updated_at, children, ...rest } = componente;
      const { data, error } = await supabase
        .from('componentes_equipamento')
        .insert({ ...rest, codigo: newCodigo })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['componentes-equipamento'] });
      queryClient.invalidateQueries({ queryKey: ['componentes-equipamento-flat'] });
      toast({
        title: 'Componente Duplicado',
        description: `${data.nome} foi duplicado com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao duplicar',
        description: error.message || 'Ocorreu um erro ao duplicar o componente.',
        variant: 'destructive',
      });
    },
  });
}
