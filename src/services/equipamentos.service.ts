import { supabase } from '@/integrations/supabase/client';
import { equipamentoSchema, type EquipamentoFormData } from '@/schemas/equipamento.schema';
import { writeAuditLog } from '@/lib/audit';
import { isMissingTableError } from '@/lib/supabaseCompat';

const EQUIPAMENTOS_TABLE = 'equipamentos' as const;
let equipamentosTableAvailable: boolean | null = null;

function isMissingEquipamentosSistemasRelationshipError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const message = (error as { message?: string }).message;
  if (typeof message !== 'string') return false;

  const normalized = message.toLowerCase();
  return (
    normalized.includes('could not find a relationship between') &&
    normalized.includes("'equipamentos'") &&
    normalized.includes("'sistemas'")
  );
}

async function ensureEquipamentosTable() {
  if (equipamentosTableAvailable === true) return EQUIPAMENTOS_TABLE;

  const { error } = await supabase.from(EQUIPAMENTOS_TABLE).select('id').limit(1);

  if (!error) {
    equipamentosTableAvailable = true;
    return EQUIPAMENTOS_TABLE;
  }

  if (isMissingTableError(error)) {
    throw new Error(
      'A tabela public.equipamentos não existe neste ambiente. Execute as migrations pendentes (incluindo 20260322193000_restore_equipamentos_table.sql e 20260322235930_guard_equipamentos_table_presence.sql) para restaurar o módulo de ativos.',
    );
  }

  throw error;
}

export const equipamentosService = {
  async listar(empresaId: string) {
    const table = await ensureEquipamentosTable();

    const withSistemaQuery = supabase
      .from(table)
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
      .eq('empresa_id', empresaId);

    const { data, error } = await withSistemaQuery.order('tag', { ascending: true }).limit(500);

    if (error && isMissingEquipamentosSistemasRelationshipError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from(table)
        .select('*')
        .eq('empresa_id', empresaId)
        .order('tag', { ascending: true })
        .limit(500);

      if (fallbackError) {
        throw new Error(`Falha ao carregar equipamentos: ${fallbackError.message}`);
      }

      return fallbackData;
    }

    if (error) throw new Error(`Falha ao carregar equipamentos: ${error.message}`);
    return data;
  },

  async criar(payload: EquipamentoFormData, empresaId: string) {
    const table = await ensureEquipamentosTable();
    const validated = equipamentoSchema.parse(payload);
    const { data, error } = await supabase
      .from(table)
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
    const table = await ensureEquipamentosTable();
    const { data, error } = await supabase
      .from(table)
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
    const table = await ensureEquipamentosTable();
    const { error } = await supabase
      .from(table)
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
