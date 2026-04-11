import { supabase } from '@/integrations/supabase/client';
import { mecanicoSchema, type MecanicoFormData } from '@/schemas/mecanico.schema';
import { writeAuditLog } from '@/lib/audit';
import { compactObject, insertWithColumnFallback, isMissingTableError, updateWithColumnFallback } from '@/lib/supabaseCompat';

const MECANICOS_TABLE = 'mecanicos' as const;
let mecanicosTableAvailable: boolean | null = null;

async function ensureMecanicosTable() {
  if (mecanicosTableAvailable === true) return MECANICOS_TABLE;

  const { error } = await supabase.from(MECANICOS_TABLE).select('id').limit(1);

  if (!error) {
    mecanicosTableAvailable = true;
    return MECANICOS_TABLE;
  }

  if (isMissingTableError(error)) {
    throw new Error(
      'A tabela public.mecanicos não existe neste ambiente. Execute as migrations pendentes (incluindo 20260323000100_guard_mecanicos_table_presence.sql) para restaurar o módulo de mecânicos.',
    );
  }

  throw error;
}

export const mecanicosService = {
  async listar(empresaId: string) {
    const table = await ensureMecanicosTable();
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true })
      .limit(500);

    if (error) throw new Error(`Falha ao carregar mecânicos: ${error.message}`);
    return data ?? [];
  },

  async listarAtivos(empresaId: string) {
    const table = await ensureMecanicosTable();
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .limit(500);

    if (error) throw new Error(`Falha ao carregar mecânicos ativos: ${error.message}`);
    return data ?? [];
  },

  async criar(payload: MecanicoFormData, empresaId: string) {
    const table = await ensureMecanicosTable();
    const validated = mecanicoSchema.parse(payload);
    const insertPayload = compactObject({ ...validated, empresa_id: empresaId }) as Record<string, unknown>;

    const data = await insertWithColumnFallback(
      async (payloadToInsert) =>
        supabase
          .from(table)
          .insert([payloadToInsert])
          .select()
          .single(),
      insertPayload,
    );

    try {
      await writeAuditLog({
        action: 'CREATE_MECANICO',
        table: 'mecanicos',
        recordId: data?.id,
        empresaId,
        source: 'mecanicos_service',
      });
    } catch {
      // Falha de auditoria nao deve impedir o cadastro.
    }

    return data;
  },

  async atualizar(id: string, payload: Partial<MecanicoFormData>, empresaId: string) {
    const table = await ensureMecanicosTable();
    const updatePayload = compactObject(payload as Record<string, unknown>);

    const data = await updateWithColumnFallback(
      async (payloadToUpdate) =>
        supabase
          .from(table)
          .update(payloadToUpdate)
          .eq('id', id)
          .eq('empresa_id', empresaId)
          .select()
          .single(),
      updatePayload,
    );

    try {
      await writeAuditLog({
        action: 'UPDATE_MECANICO',
        table: 'mecanicos',
        recordId: id,
        empresaId,
        source: 'mecanicos_service',
        metadata: { changed_fields: Object.keys(payload) },
      });
    } catch {
      // Falha de auditoria nao deve impedir a atualizacao.
    }

    return data;
  },

  async excluir(id: string, empresaId: string) {
    const table = await ensureMecanicosTable();
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaId);

    if (error) throw new Error(`Erro ao excluir mecânico: ${error.message}`);

    try {
      await writeAuditLog({
        action: 'DELETE_MECANICO',
        table: 'mecanicos',
        recordId: id,
        empresaId,
        source: 'mecanicos_service',
        severity: 'warning',
      });
    } catch {
      // Falha de auditoria nao deve impedir a exclusao.
    }
  },
};
