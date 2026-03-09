import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { insertWithColumnFallback, updateWithColumnFallback } from '@/lib/supabaseCompat';

export interface EquipamentoRow {
  id: string;
  tag: string;
  nome: string;
  criticidade: string;
  nivel_risco: string;
  localizacao: string | null;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  data_instalacao: string | null;
  sistema_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  sistema?: {
    id: string;
    codigo: string;
    nome: string;
    area?: {
      id: string;
      codigo: string;
      nome: string;
      planta?: {
        id: string;
        codigo: string;
        nome: string;
      };
    };
  };
}

export interface EquipamentoInsert {
  tag: string;
  nome: string;
  criticidade?: string;
  nivel_risco?: string;
  localizacao?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  data_instalacao?: string | null;
  sistema_id?: string | null;
  ativo?: boolean;
}

export interface EquipamentoUpdate {
  nome?: string;
  criticidade?: string;
  nivel_risco?: string;
  localizacao?: string | null;
  fabricante?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  data_instalacao?: string | null;
  sistema_id?: string | null;
  ativo?: boolean;
}

export function useEquipamentos() {
  return useQuery({
    queryKey: ['equipamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipamentos')
        .select(`
          *,
          sistema:sistemas(
            id, codigo, nome,
            area:areas(
              id, codigo, nome,
              planta:plantas(id, codigo, nome)
            )
          )
        `)
        .order('tag', { ascending: true });

      if (error) throw error;
      return data as EquipamentoRow[];
    },
  });
}

export function useCreateEquipamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (equipamento: EquipamentoInsert) => {
      return insertWithColumnFallback(
        async (payload) =>
          supabase
            .from('equipamentos')
            .insert(payload)
            .select()
            .single(),
        equipamento as Record<string, unknown>,
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast({
        title: 'Equipamento Cadastrado',
        description: `TAG ${data.tag} foi cadastrado com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message || 'Ocorreu um erro ao cadastrar o equipamento.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEquipamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EquipamentoUpdate & { id: string }) => {
      return updateWithColumnFallback(
        async (payload) =>
          supabase
            .from('equipamentos')
            .update(payload)
            .eq('id', id)
            .select()
            .single(),
        updates as Record<string, unknown>,
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast({
        title: 'Equipamento Atualizado',
        description: `TAG ${data.tag} foi atualizado com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Ocorreu um erro ao atualizar o equipamento.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEquipamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast({
        title: 'Equipamento Excluído',
        description: 'O equipamento foi removido com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Ocorreu um erro ao excluir o equipamento.',
        variant: 'destructive',
      });
    },
  });
}
