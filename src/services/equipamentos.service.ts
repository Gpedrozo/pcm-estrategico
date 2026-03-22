import { supabase } from '@/integrations/supabase/client';
import { equipamentoSchema, type EquipamentoFormData } from '@/schemas/equipamento.schema';
import { writeAuditLog } from '@/lib/audit';

export const equipamentosService = {
  async listar(empresaId: string) {
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
      .eq('empresa_id', empresaId)
      .order('tag', { ascending: true });

    if (error) throw new Error(`Falha ao carregar equipamentos: ${error.message}`);
    return data;
  },

  async criar(payload: EquipamentoFormData, empresaId: string) {
    const validated = equipamentoSchema.parse(payload);
    const { data, error } = await supabase
      .from('equipamentos')
      .insert([{ ...validated, empresa_id: empresaId }])
      .select()
      .single();

    if (error) throw new Error(`Erro ao cadastrar equipamento: ${error.message}`);

    await writeAuditLog({
      action: 'CREATE_EQUIPAMENTO',
      table: 'equipamentos',
      recordId: data?.id,
      empresaId,
      source: 'equipamentos_service',
    });

    return data;
  },

  async atualizar(id: string, payload: Partial<EquipamentoFormData>, empresaId: string) {
    const { data, error } = await supabase
      .from('equipamentos')
      .update(payload)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar equipamento: ${error.message}`);

    await writeAuditLog({
      action: 'UPDATE_EQUIPAMENTO',
      table: 'equipamentos',
      recordId: id,
      empresaId,
      source: 'equipamentos_service',
      metadata: { changed_fields: Object.keys(payload) },
    });

    return data;
  },

  async excluir(id: string, empresaId: string) {
    const { error } = await supabase
      .from('equipamentos')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) throw new Error(`Erro ao excluir equipamento: ${error.message}`);

    await writeAuditLog({
      action: 'DELETE_EQUIPAMENTO',
      table: 'equipamentos',
      recordId: id,
      empresaId,
      source: 'equipamentos_service',
      severity: 'warning',
    });
  },
};
