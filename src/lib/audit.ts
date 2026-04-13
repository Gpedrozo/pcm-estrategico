import { logger } from '@/lib/logger'
import { callRpc } from '@/integrations/supabase/rpc'
import { supabase } from '@/integrations/supabase/client'

interface AuditInput {
  action: string
  table: string
  recordId?: string | null
  empresaId?: string | null
  severity?: 'info' | 'warning' | 'error' | 'critical'
  source?: string
  metadata?: Record<string, unknown>
  dadosAntes?: Record<string, unknown> | null
  dadosDepois?: Record<string, unknown> | null
  correlacaoId?: string | null
  resultado?: 'sucesso' | 'erro' | 'rejeitado'
  mensagemErro?: string | null
}

// RPC-allowed action values
const VALID_ACTIONS = new Set([
  'CREATE', 'UPDATE', 'DELETE', 'CLOSE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT',
])

// Map Portuguese verbs to English RPC actions
const ACTION_MAP: Record<string, string> = {
  CRIAR: 'CREATE',
  EDITAR: 'UPDATE',
  EXCLUIR: 'DELETE',
  FECHAR: 'CLOSE',
  APROVAR: 'APPROVE',
  REJEITAR: 'REJECT',
  EXPORTAR: 'EXPORT',
  CADASTRAR: 'CREATE',
  ATUALIZAR: 'UPDATE',
  REMOVER: 'DELETE',
  DESATIVAR: 'DELETE',
  REVOGAR: 'DELETE',
  GERAR: 'CREATE',
  RESETAR: 'UPDATE',
  DUPLICAR: 'CREATE',
  REATIVAR: 'UPDATE',
}

function normalizeAction(action: string): string {
  const upper = action.toUpperCase()

  // Direct match (e.g. 'CREATE', 'LOGIN')
  if (VALID_ACTIONS.has(upper)) return upper

  // Full PT word match (e.g. 'CRIAR')
  if (ACTION_MAP[upper]) return ACTION_MAP[upper]

  // Extract verb prefix from composite actions (e.g. 'CREATE_EQUIPAMENTO' → 'CREATE')
  const prefix = upper.split('_')[0]
  if (VALID_ACTIONS.has(prefix)) return prefix
  if (ACTION_MAP[prefix]) return ACTION_MAP[prefix]

  // Known compound patterns
  if (upper.includes('LOGIN')) return 'LOGIN'
  if (upper.includes('LOGOUT')) return 'LOGOUT'
  if (upper.includes('CLOSE')) return 'CLOSE'
  if (upper.includes('DELETE') || upper.includes('REMOVE')) return 'DELETE'
  if (upper.includes('CREATE') || upper.includes('GENERATE')) return 'CREATE'
  if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('CHANGE')) return 'UPDATE'
  if (upper.includes('EXPORT')) return 'EXPORT'
  if (upper.includes('APPROVE')) return 'APPROVE'
  if (upper.includes('REJECT')) return 'REJECT'

  // Fallback — default to UPDATE (safest generic action)
  return 'UPDATE'
}

export async function writeAuditLog(input: AuditInput) {
  try {
    const {
      action,
      table,
      recordId = null,
      empresaId = null,
      dadosAntes = null,
      dadosDepois = null,
      correlacaoId = null,
      resultado = 'sucesso',
      mensagemErro = null,
    } = input

    // Resolve current user id for the RPC
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await callRpc<null>('app_write_audit_log', {
      p_empresa_id: empresaId,
      p_usuario_id: user?.id ?? null,
      p_acao: normalizeAction(action),
      p_tabela: table,
      p_registro_id: recordId,
      p_dados_antes: dadosAntes,
      p_dados_depois: dadosDepois,
      p_ip_address: null,
      p_user_agent: navigator?.userAgent?.slice(0, 512) ?? null,
      p_correlacao_id: correlacaoId,
      p_resultado: resultado,
      p_mensagem_erro: mensagemErro,
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
