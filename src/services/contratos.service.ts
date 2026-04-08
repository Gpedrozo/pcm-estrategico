import { supabase } from '@/integrations/supabase/client';
import { contratoSchema, contratoUpdateSchema, type ContratoFormData } from '@/schemas/contrato.schema';
import { writeAuditLog } from '@/lib/audit';

export const contratosService = {
  async listar(empresaId: string) {
    const { data, error } = await supabase
      .from('contratos')
      .select(`
        *,
        fornecedor:fornecedores(razao_social, nome_fantasia)
      `)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Falha ao carregar contratos: ${error.message}`);
    return data;
  },

  async listarAtivos(empresaId: string) {
    const { data, error } = await supabase
      .from('contratos')
      .select(`
        *,
        fornecedor:fornecedores(razao_social, nome_fantasia)
      `)
      .eq('empresa_id', empresaId)
      .eq('status', 'ATIVO')
      .order('data_fim', { ascending: true });

    if (error) throw new Error(`Falha ao carregar contratos ativos: ${error.message}`);
    return data;
  },

  async criar(payload: ContratoFormData, empresaId: string) {
    const validated = contratoSchema.parse(payload);
    const { data, error } = await supabase
      .from('contratos')
      .insert([{ ...validated, empresa_id: empresaId }])
      .select()
      .single();

    if (error) throw new Error(`Erro ao salvar no banco de dados: ${error.message}`);

    await writeAuditLog({
      action: 'CREATE_CONTRACT',
      table: 'contratos',
      recordId: data?.id,
      source: 'contratos_service',
      metadata: {
        fornecedor_id: data?.fornecedor_id,
        status: data?.status,
      },
    });

    return data;
  },

  async atualizar(id: string, payload: Partial<ContratoFormData>, empresaId: string) {
    const validated = contratoUpdateSchema.parse(payload);
    const { data, error } = await supabase
      .from('contratos')
      .update(validated)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar no banco de dados: ${error.message}`);

    await writeAuditLog({
      action: 'UPDATE_CONTRACT',
      table: 'contratos',
      recordId: id,
      source: 'contratos_service',
      metadata: {
        changed_fields: Object.keys(payload),
      },
    });

    return data;
  },

  async excluir(id: string, empresaId: string) {
    const { error } = await supabase
      .from('contratos')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) throw new Error(`Erro ao excluir do banco de dados: ${error.message}`);

    await writeAuditLog({
      action: 'DELETE_CONTRACT',
      table: 'contratos',
      recordId: id,
      source: 'contratos_service',
      severity: 'warning',
    });
  },

  async listarPorFornecedor(fornecedorId: string, empresaId: string) {
    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('fornecedor_id', fornecedorId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Falha ao carregar contratos do fornecedor: ${error.message}`);
    return data;
  }
};
