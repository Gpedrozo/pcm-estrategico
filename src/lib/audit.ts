import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/lib/logger'

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
  const {
    action,
    table,
    recordId = null,
    empresaId = null,
    severity = 'info',
    source = 'app',
    metadata = {},
  } = input

  const { error } = await supabase.rpc('app_write_audit_log', {
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
}
