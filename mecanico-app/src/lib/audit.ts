import { supabase } from './supabase';

interface AuditInput {
  action: string;
  table: string;
  recordId?: string | null;
  empresaId?: string | null;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  source?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit logger for the mobile app.
 * Calls the same `app_write_audit_log` RPC used by the web app.
 * Silently catches errors so it never breaks the calling flow.
 */
export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    const {
      action,
      table,
      recordId = null,
      empresaId = null,
      severity = 'info',
      source = 'mecanico-app',
      metadata = {},
    } = input;

    await supabase.rpc('app_write_audit_log', {
      p_action: action,
      p_table: table,
      p_record_id: recordId,
      p_empresa_id: empresaId,
      p_severity: severity,
      p_source: source,
      p_metadata: metadata,
    });
  } catch {
    // Audit is fire-and-forget — never throw
  }
}
