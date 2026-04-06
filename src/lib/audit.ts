import { logger } from '@/lib/logger'
import { callRpc } from '@/integrations/supabase/rpc'

interface AuditInput {
  action: string
  table: string
  recordId?: string | null
  empresaId?: string | null
  severity?: 'info' | 'warning' | 'error' | 'critical'
  source?: string
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(input: AuditInput) {
  try {
    const {
      action,
      table,
      recordId = null,
      empresaId = null,
      severity = 'info',
      source = 'app',
      metadata = {},
    } = input

    const { error } = await callRpc<null>('app_write_audit_log', {
      p_action: action,
      p_table: table,
      p_record_id: recordId,
      p_empresa_id: empresaId,
      p_severity: severity,
      p_source: source,
      p_metadata: metadata,
    })

    if (error) {
      logger.error('audit_log_rpc_failed', {
        action,
        table,
        error: error.message,
      })
    }
  } catch {
    // fire-and-forget: never let audit break the caller
  }
}
