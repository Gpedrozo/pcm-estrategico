import { supabase } from '@/integrations/supabase/client';
import { mecanicoSchema, type MecanicoFormData } from '@/schemas/mecanico.schema';
import { writeAuditLog } from '@/lib/audit';

export const mecanicosService = {
  async listar(empresaId: string) {
    const { data, error } = await supabase
      .from('mecanicos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true });

    if (error) throw new Error(`Falha ao carregar mecânicos: ${error.message}`);
    return data ?? [];
  },

  async listarAtivos(empresaId: string) {
    const { data, error } = await supabase
      .from('mecanicos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) throw new Error(`Falha ao carregar mecânicos ativos: ${error.message}`);
    return data ?? [];
  },

  async criar(payload: MecanicoFormData, empresaId: string) {
    const validated = mecanicoSchema.parse(payload);
    const { data, error } = await supabase
      .from('mecanicos')
      .insert([{ ...validated, empresa_id: empresaId }])
      .select()
      .single();

    if (error) throw new Error(`Erro ao cadastrar mecânico: ${error.message}`);

    await writeAuditLog({
      action: 'CREATE_MECANICO',
      table: 'mecanicos',
      recordId: data?.id,
      empresaId,
      source: 'mecanicos_service',
    });

    return data;
  },

  async atualizar(id: string, payload: Partial<MecanicoFormData>, empresaId: string) {
    const { data, error } = await supabase
      .from('mecanicos')
      .update(payload)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar mecânico: ${error.message}`);

    await writeAuditLog({
      action: 'UPDATE_MECANICO',
      table: 'mecanicos',
      recordId: id,
      empresaId,
      source: 'mecanicos_service',
      metadata: { changed_fields: Object.keys(payload) },
    });

    return data;
  },

  async excluir(id: string, empresaId: string) {
    const { error } = await supabase
      .from('mecanicos')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) throw new Error(`Erro ao excluir mecânico: ${error.message}`);

    await writeAuditLog({
      action: 'DELETE_MECANICO',
      table: 'mecanicos',
      recordId: id,
      empresaId,
      source: 'mecanicos_service',
      severity: 'warning',
    });
  },
};
