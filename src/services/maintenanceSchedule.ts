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
  const payload = {
    empresa_id: input.empresaId,
    tipo: input.tipo,
    origem_id: input.origemId,
    equipamento_id: input.equipamentoId ?? null,
    titulo: input.titulo,
    descricao: input.descricao ?? null,
    data_programada: input.dataProgramada,
    status: input.status || 'programado',
    responsavel: input.responsavel ?? null,
  };

  const { error } = await supabase
    .from('maintenance_schedule')
    .upsert(payload, { onConflict: 'tipo,origem_id' });

  if (error) throw error;

  return {
    id: '',
    empresa_id: payload.empresa_id,
    tipo: payload.tipo,
    origem_id: payload.origem_id,
    equipamento_id: payload.equipamento_id,
    titulo: payload.titulo,
    descricao: payload.descricao,
    data_programada: payload.data_programada,
    status: payload.status,
    responsavel: payload.responsavel,
    created_at: new Date().toISOString(),
  } as MaintenanceScheduleRow;
}

export async function deleteMaintenanceSchedule(tipo: MaintenanceTipo, origemId: string, empresaId?: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para delete em maintenance_schedule');
  let query = supabase
    .from('maintenance_schedule')
    .delete()
    .eq('tipo', tipo)
    .eq('origem_id', origemId)
    .eq('empresa_id', empresaId);

  const { error } = await query;
  if (error) throw error;
}
