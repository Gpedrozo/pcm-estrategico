import { supabase } from '@/integrations/supabase/client';
import { plantaSchema, areaSchema, sistemaSchema, type PlantaFormData, type AreaFormData, type SistemaFormData } from '@/schemas/hierarquia.schema';
import { writeAuditLog } from '@/lib/audit';

export const hierarquiaService = {
  // ==================== PLANTAS ====================
  async listarPlantas(empresaId: string) {
    const { data, error } = await supabase
      .from('plantas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('codigo');

    if (error) throw new Error(`Falha ao carregar plantas: ${error.message}`);
    return data;
  },

  async criarPlanta(payload: PlantaFormData, empresaId: string) {
    const validated = plantaSchema.parse(payload);
    const { data, error } = await supabase
      .from('plantas')
      .insert([{ ...validated, empresa_id: empresaId }])
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar planta: ${error.message}`);

    await writeAuditLog({
      action: 'CREATE_PLANTA',
      table: 'plantas',
      recordId: data?.id,
      empresaId,
      source: 'hierarquia_service',
    });

    return data;
  },

  async atualizarPlanta(id: string, payload: Partial<PlantaFormData>, empresaId: string) {
    const { data, error } = await supabase
      .from('plantas')
      .update(payload)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar planta: ${error.message}`);

    await writeAuditLog({
      action: 'UPDATE_PLANTA',
      table: 'plantas',
      recordId: id,
      empresaId,
      source: 'hierarquia_service',
    });

    return data;
  },

  async excluirPlanta(id: string, empresaId: string) {
    const { error } = await supabase.from('plantas').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw new Error(`Erro ao excluir planta: ${error.message}`);

    await writeAuditLog({ action: 'DELETE_PLANTA', table: 'plantas', recordId: id, empresaId, source: 'hierarquia_service', severity: 'warning' });
  },

  // ==================== ÁREAS ====================
  async listarAreas(empresaId: string) {
    const { data, error } = await supabase
      .from('areas')
      .select('*, planta:plantas(*)')
      .eq('empresa_id', empresaId)
      .order('codigo');

    if (error) throw new Error(`Falha ao carregar áreas: ${error.message}`);
    return data;
  },

  async criarArea(payload: AreaFormData, empresaId: string) {
    const validated = areaSchema.parse(payload);
    const { data, error } = await supabase
      .from('areas')
      .insert([{ ...validated, empresa_id: empresaId }])
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar área: ${error.message}`);

    await writeAuditLog({ action: 'CREATE_AREA', table: 'areas', recordId: data?.id, empresaId, source: 'hierarquia_service' });
    return data;
  },

  async atualizarArea(id: string, payload: Partial<AreaFormData>, empresaId: string) {
    const { data, error } = await supabase.from('areas').update(payload).eq('id', id).eq('empresa_id', empresaId).select().single();
    if (error) throw new Error(`Erro ao atualizar área: ${error.message}`);

    await writeAuditLog({ action: 'UPDATE_AREA', table: 'areas', recordId: id, empresaId, source: 'hierarquia_service' });
    return data;
  },

  async excluirArea(id: string, empresaId: string) {
    const { error } = await supabase.from('areas').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw new Error(`Erro ao excluir área: ${error.message}`);

    await writeAuditLog({ action: 'DELETE_AREA', table: 'areas', recordId: id, empresaId, source: 'hierarquia_service', severity: 'warning' });
  },

  // ==================== SISTEMAS ====================
  async listarSistemas(empresaId: string) {
    const { data, error } = await supabase
      .from('sistemas')
      .select('*, area:areas(*, planta:plantas(*))')
      .eq('empresa_id', empresaId)
      .order('codigo');

    if (error) throw new Error(`Falha ao carregar sistemas: ${error.message}`);
    return data;
  },

  async criarSistema(payload: SistemaFormData, empresaId: string) {
    const validated = sistemaSchema.parse(payload);
    const { data, error } = await supabase
      .from('sistemas')
      .insert([{ ...validated, empresa_id: empresaId }])
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar sistema: ${error.message}`);

    await writeAuditLog({ action: 'CREATE_SISTEMA', table: 'sistemas', recordId: data?.id, empresaId, source: 'hierarquia_service' });
    return data;
  },

  async atualizarSistema(id: string, payload: Partial<SistemaFormData>, empresaId: string) {
    const { data, error } = await supabase.from('sistemas').update(payload).eq('id', id).eq('empresa_id', empresaId).select().single();
    if (error) throw new Error(`Erro ao atualizar sistema: ${error.message}`);

    await writeAuditLog({ action: 'UPDATE_SISTEMA', table: 'sistemas', recordId: id, empresaId, source: 'hierarquia_service' });
    return data;
  },

  async excluirSistema(id: string, empresaId: string) {
    const { error } = await supabase.from('sistemas').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw new Error(`Erro ao excluir sistema: ${error.message}`);

    await writeAuditLog({ action: 'DELETE_SISTEMA', table: 'sistemas', recordId: id, empresaId, source: 'hierarquia_service', severity: 'warning' });
  },
};
