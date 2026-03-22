import { supabase } from '@/integrations/supabase/client';
import { ordemServicoSchema, ordemServicoUpdateSchema, type OrdemServicoFormData, type OrdemServicoUpdateData } from '@/schemas/ordemServico.schema';
import { writeAuditLog } from '@/lib/audit';

export const ordensServicoService = {
  async listar(empresaId: string) {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('numero_os', { ascending: false });

    if (error) throw new Error(`Falha ao carregar ordens de serviço: ${error.message}`);
    return data;
  },

  async listarRecentes(empresaId: string, limit = 5) {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_solicitacao', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Falha ao carregar O.S recentes: ${error.message}`);
    return data;
  },

  async listarPendentes(empresaId: string) {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*')
      .eq('empresa_id', empresaId)
      .neq('status', 'FECHADA')
      .neq('status', 'CANCELADA')
      .order('prioridade', { ascending: true })
      .order('data_solicitacao', { ascending: true });

    if (error) throw new Error(`Falha ao carregar O.S pendentes: ${error.message}`);
    return data;
  },

  async criar(payload: OrdemServicoFormData, empresaId: string) {
    const validated = ordemServicoSchema.parse(payload);
    const insertPayload = {
      empresa_id: empresaId,
      ...validated,
      prioridade: validated.prioridade ?? 'MEDIA',
      status: 'ABERTA',
    };

    const { data, error } = await supabase
      .from('ordens_servico')
      .insert([insertPayload])
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar ordem de serviço: ${error.message}`);

    await writeAuditLog({
      action: 'CREATE_ORDEM_SERVICO',
      table: 'ordens_servico',
      recordId: data?.id,
      empresaId,
      source: 'ordensServico_service',
      metadata: { numero_os: data?.numero_os, tipo: data?.tipo },
    });

    return data;
  },

  async atualizar(id: string, payload: OrdemServicoUpdateData, empresaId: string) {
    const validated = ordemServicoUpdateSchema.parse(payload);
    const { data, error } = await supabase
      .from('ordens_servico')
      .update(validated)
      .eq('id', id)
      .eq('empresa_id', empresaId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar ordem de serviço: ${error.message}`);

    await writeAuditLog({
      action: 'UPDATE_ORDEM_SERVICO',
      table: 'ordens_servico',
      recordId: id,
      empresaId,
      source: 'ordensServico_service',
      metadata: { status: data?.status, changed_fields: Object.keys(payload) },
    });

    return data;
  },
};
