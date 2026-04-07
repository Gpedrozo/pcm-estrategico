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

const VALID_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'CLOSE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT'] as const

function normalizeAction(raw: string): string {
  const upper = raw.toUpperCase()
  // Direct match
  const direct = VALID_ACTIONS.find((a) => a === upper)
  if (direct) return direct
  // Prefix match: CREATE_EQUIPAMENTO → CREATE
  const prefix = VALID_ACTIONS.find((a) => upper.startsWith(a))
  if (prefix) return prefix
  // Fallback heuristics
  if (upper.includes('DELETE') || upper.includes('REMOVE') || upper.includes('PURGE') || upper.includes('CLEANUP')) return 'DELETE'
  if (upper.includes('CREATE') || upper.includes('ADD') || upper.includes('GENERATE') || upper.includes('REGISTER')) return 'CREATE'
  if (upper.includes('UPDATE') || upper.includes('SET') || upper.includes('CHANGE') || upper.includes('RESET') || upper.includes('RESPOND') || upper.includes('REGENERATE')) return 'UPDATE'
  if (upper.includes('BLOCK') || upper.includes('REJECT')) return 'REJECT'
  if (upper.includes('APPROVE')) return 'APPROVE'
  if (upper.includes('LOGIN') || upper.includes('VALIDAR') || upper.includes('IMPERSONAT')) return 'LOGIN'
  if (upper.includes('LOGOUT')) return 'LOGOUT'
  if (upper.includes('EXPORT')) return 'EXPORT'
  if (upper.includes('CLOSE') || upper.includes('STOP')) return 'CLOSE'
  // Final fallback
  return 'UPDATE'
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

    if (!empresaId) {
      // empresa_id is required by the RPC — skip silently when unavailable
      return
    }

    const normalizedAction = normalizeAction(action)

    const { error } = await callRpc<null>('app_write_audit_log', {
      p_empresa_id: empresaId,
      p_usuario_id: null,
      p_acao: normalizedAction,
      p_tabela: table,
      p_registro_id: recordId,
      p_dados_antes: null,
      p_dados_depois: { action_detail: action, severity, source, ...metadata },
      p_ip_address: null,
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      p_correlacao_id: null,
      p_resultado: 'sucesso',
      p_mensagem_erro: null,
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
