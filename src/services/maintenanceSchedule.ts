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

/**
 * Materializa uma projeção virtual: cria um novo registro real no DB
 * clonando o master, mas com a data projetada.
 * Retorna o novo registro real (com UUID gerado pelo banco).
 */
export async function materializeSchedule(
  master: MaintenanceScheduleRow,
  projectedDate: string,
) {
  const { data, error } = await supabase
    .from('maintenance_schedule')
    .insert({
      empresa_id: master.empresa_id,
      tipo: master.tipo,
      origem_id: master.origem_id,
      equipamento_id: master.equipamento_id,
      titulo: master.titulo,
      descricao: master.descricao,
      data_programada: projectedDate,
      status: 'programado',
      responsavel: master.responsavel,
    })
    .select()
    .single();
  if (error) throw error;
  return data as MaintenanceScheduleRow;
}

/**
 * Avança o master (registro original) para a próxima data de recorrência.
 * Se intervalDays <= 0, apenas marca como emitido sem avançar.
 */
export async function advanceMasterSchedule(
  masterId: string,
  empresaId: string,
  currentDate: string,
  intervalDays: number,
) {
  if (intervalDays <= 0) return;
  const nextDate = new Date(new Date(currentDate).getTime() + intervalDays * 86400000);
  const { error } = await supabase
    .from('maintenance_schedule')
    .update({ data_programada: nextDate.toISOString(), status: 'programado' })
    .eq('id', masterId)
    .eq('empresa_id', empresaId);
  if (error) throw error;
}

export async function deleteMaintenanceSchedule(tipo: MaintenanceTipo, origemId: string, empresaId?: string) {
  if (!empresaId) throw new Error('empresa_id obrigatório para delete em maintenance_schedule');
  const query = supabase
    .from('maintenance_schedule')
    .delete()
    .eq('tipo', tipo)
    .eq('origem_id', origemId)
    .eq('empresa_id', empresaId);

  const { error } = await query;
  if (error) throw error;
}
