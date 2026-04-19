import { supabase } from '@/integrations/supabase/client';

/**
 * Check if adding a file would exceed the tenant's storage limit.
 * Reads limit from configuracoes_sistema (owner.limits.storage_mb)
 * and current usage from (owner.storage_used_mb).
 * Returns { allowed: true } if upload can proceed, or { allowed: false, message } if blocked.
 */
export async function checkStorageLimit(
  tenantId: string,
  fileSizeBytes: number,
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const { data: rows } = await supabase
      .from('configuracoes_sistema')
      .select('chave, valor')
      .eq('empresa_id', tenantId)
      .in('chave', ['owner.limits', 'owner.storage_used_mb']);

    if (!rows || rows.length === 0) return { allowed: true };

    const limitsRow = rows.find((r) => r.chave === 'owner.limits');
    const usageRow = rows.find((r) => r.chave === 'owner.storage_used_mb');

    const maxMb = Number((limitsRow?.valor as Record<string, unknown>)?.storage_mb ?? 0);
    if (maxMb <= 0) return { allowed: true };

    const usedMb = Number(usageRow?.valor ?? 0);
    const fileMb = fileSizeBytes / (1024 * 1024);

    if (usedMb + fileMb > maxMb) {
      return {
        allowed: false,
        message: `Limite de armazenamento atingido (${usedMb.toFixed(1)}/${maxMb} MB). Solicite ao administrador a ampliação do plano.`,
      };
    }

    return { allowed: true };
  } catch {
    // fail-open: allow upload if check fails
    return { allowed: true };
  }
}
