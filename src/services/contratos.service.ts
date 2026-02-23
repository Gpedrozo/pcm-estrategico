import { supabase } from '@/integrations/supabase/client';
import { contratoSchema, type ContratoFormData } from '@/schemas/contrato.schema';

export const contratosService = {
  async listar() {
    const { data, error } = await supabase
      .from('contratos')
      .select(`
        *,
        fornecedor:fornecedores(razao_social, nome_fantasia)
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Falha ao carregar contratos: ${error.message}`);
    return data;
  },

  async listarAtivos() {
    const { data, error } = await supabase
      .from('contratos')
      .select(`
        *,
        fornecedor:fornecedores(razao_social, nome_fantasia)
      `)
      .eq('status', 'ATIVO')
      .order('data_fim', { ascending: true });

    if (error) throw new Error(`Falha ao carregar contratos ativos: ${error.message}`);
    return data;
  },

  async criar(payload: ContratoFormData) {
    const validated = contratoSchema.parse(payload);
    const { data, error } = await supabase
      .from('contratos')
      .insert([validated])
      .select()
      .single();

    if (error) throw new Error(`Erro ao salvar no banco de dados: ${error.message}`);
    return data;
  },

  async atualizar(id: string, payload: Partial<ContratoFormData>) {
    const { data, error } = await supabase
      .from('contratos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar no banco de dados: ${error.message}`);
    return data;
  },

  async excluir(id: string) {
    const { error } = await supabase
      .from('contratos')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Erro ao excluir do banco de dados: ${error.message}`);
  },

  async listarPorFornecedor(fornecedorId: string) {
    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .eq('fornecedor_id', fornecedorId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Falha ao carregar contratos do fornecedor: ${error.message}`);
    return data;
  }
};
