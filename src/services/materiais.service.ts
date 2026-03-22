import { supabase } from '@/integrations/supabase/client';
import { materialSchema, type MaterialFormData } from '@/schemas/material.schema';
import { writeAuditLog } from '@/lib/audit';

export const materiaisService = {
  async listar(empresaId: string) {
    const { data, error } = await supabase
      .from('materiais')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    if (error) throw new Error(`Falha ao carregar materiais: ${error.message}`);
    return data;
  },

  async listarAtivos(empresaId: string) {
    const { data, error } = await supabase
      .from('materiais')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome');

    if (error) throw new Error(`Falha ao carregar materiais ativos: ${error.message}`);
    return data;
  },

  async criar(payload: MaterialFormData, empresaId: string) {
    const validated = materialSchema.parse(payload);
    const { data, error } = await supabase
      .from('materiais')
      .insert([{ ...validated, empresa_id: empresaId }])
      .select()
      .single();

    if (error) throw new Error(`Erro ao cadastrar material: ${error.message}`);

    await writeAuditLog({
      action: 'CREATE_MATERIAL',
      table: 'materiais',
      recordId: data?.id,
      empresaId,
      source: 'materiais_service',
    });

    return data;
  },

  async atualizar(id: string, payload: Partial<MaterialFormData>, empresaId: string) {
    const { data, error } = await supabase
      .from('materiais')
      .update(payload)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar material: ${error.message}`);

    await writeAuditLog({
      action: 'UPDATE_MATERIAL',
      table: 'materiais',
      recordId: id,
      empresaId,
      source: 'materiais_service',
      metadata: { changed_fields: Object.keys(payload) },
    });

    return data;
  },

  async excluir(id: string, empresaId: string) {
    const { error } = await supabase
      .from('materiais')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) throw new Error(`Erro ao excluir material: ${error.message}`);

    await writeAuditLog({
      action: 'DELETE_MATERIAL',
      table: 'materiais',
      recordId: id,
      empresaId,
      source: 'materiais_service',
      severity: 'warning',
    });
  },
};
