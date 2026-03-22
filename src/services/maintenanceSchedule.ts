import { supabase } from '@/integrations/supabase/client';

export type MaintenanceTipo = 'preventiva' | 'lubrificacao' | 'inspecao' | 'preditiva';

export interface MaintenanceScheduleUpsertInput {
  tipo: MaintenanceTipo;
  origemId: string;
  empresaId: string;
  equipamentoId?: string | null;
  titulo: string;
  descricao?: string | null;
  dataProgramada: string;
  status?: string | null;
  responsavel?: string | null;
}

export interface MaintenanceScheduleRow {
  id: string;
  empresa_id: string;
  tipo: MaintenanceTipo;
  origem_id: string;
  equipamento_id: string | null;
  titulo: string;
  descricao: string | null;
  data_programada: string;
  status: string;
  responsavel: string | null;
  created_at: string;
}

export async function upsertMaintenanceSchedule(input: MaintenanceScheduleUpsertInput) {
  const { data, error } = await supabase
    .from('maintenance_schedule')
    .upsert(
      {
        empresa_id: input.empresaId,
        tipo: input.tipo,
        origem_id: input.origemId,
        equipamento_id: input.equipamentoId ?? null,
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        data_programada: input.dataProgramada,
        status: input.status || 'programado',
        responsavel: input.responsavel ?? null,
      },
      { onConflict: 'tipo,origem_id' },
    )
    .select()
    .single();

  if (error) throw error;
  return data as MaintenanceScheduleRow;
}

export async function deleteMaintenanceSchedule(tipo: MaintenanceTipo, origemId: string) {
  const { error } = await supabase
    .from('maintenance_schedule')
    .delete()
    .eq('tipo', tipo)
    .eq('origem_id', origemId);

  if (error) throw error;
}
