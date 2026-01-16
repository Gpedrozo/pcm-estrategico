import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InspecaoRow {
  id: string;
  numero_inspecao: number;
  rota_nome: string;
  descricao: string | null;
  turno: string | null;
  inspetor_nome: string;
  inspetor_id: string | null;
  data_inspecao: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  status: 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  itens_inspecionados: any;
  anomalias_encontradas: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InspecaoInsert {
  rota_nome: string;
  descricao?: string | null;
  turno?: string | null;
  inspetor_nome: string;
  inspetor_id?: string | null;
  data_inspecao?: string;
  hora_inicio?: string | null;
}

export interface AnomaliaRow {
  id: string;
  inspecao_id: string;
  equipamento_id: string | null;
  tag: string | null;
  descricao: string;
  severidade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
  foto_url: string | null;
  os_gerada_id: string | null;
  status: 'ABERTA' | 'EM_TRATAMENTO' | 'RESOLVIDA';
  created_at: string;
}

export function useInspecoes() {
  return useQuery({
    queryKey: ['inspecoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspecoes')
        .select('*')
        .order('data_inspecao', { ascending: false });

      if (error) throw error;
      return data as InspecaoRow[];
    },
  });
}

export function useInspecoesHoje() {
  return useQuery({
    queryKey: ['inspecoes', 'hoje'],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('inspecoes')
        .select('*')
        .eq('data_inspecao', hoje)
        .order('hora_inicio');

      if (error) throw error;
      return data as InspecaoRow[];
    },
  });
}

export function useCreateInspecao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (inspecao: InspecaoInsert) => {
      const { data, error } = await supabase
        .from('inspecoes')
        .insert({
          ...inspecao,
          status: 'EM_ANDAMENTO',
        })
        .select()
        .single();

      if (error) throw error;
      return data as InspecaoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspecoes'] });
      toast({
        title: 'Inspeção iniciada',
        description: 'A inspeção foi registrada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar inspeção',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInspecao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InspecaoRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('inspecoes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as InspecaoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspecoes'] });
      toast({
        title: 'Inspeção atualizada',
        description: 'A inspeção foi atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar inspeção',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAnomalias(inspecaoId?: string) {
  return useQuery({
    queryKey: ['anomalias', inspecaoId],
    queryFn: async () => {
      let query = supabase.from('anomalias_inspecao').select('*');
      
      if (inspecaoId) {
        query = query.eq('inspecao_id', inspecaoId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as AnomaliaRow[];
    },
    enabled: !!inspecaoId || inspecaoId === undefined,
  });
}

export function useCreateAnomalia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (anomalia: Omit<AnomaliaRow, 'id' | 'created_at' | 'os_gerada_id' | 'status'>) => {
      const { data, error } = await supabase
        .from('anomalias_inspecao')
        .insert(anomalia)
        .select()
        .single();

      if (error) throw error;
      return data as AnomaliaRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomalias'] });
      queryClient.invalidateQueries({ queryKey: ['inspecoes'] });
      toast({
        title: 'Anomalia registrada',
        description: 'A anomalia foi registrada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao registrar anomalia',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
