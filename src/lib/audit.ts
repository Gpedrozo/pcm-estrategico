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
  impersonadoPorId?: string | null
  impersonadoPorEmail?: string | null
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
      metadata,
      dadosAntes = null,
      dadosDepois = null,
      correlacaoId = null,
      resultado = 'sucesso',
      mensagemErro = null,
      impersonadoPorId = null,
      impersonadoPorEmail = null,
    } = input

    // Resolve current user id for the RPC
    const { data: { user } } = await supabase.auth.getUser()

    // When no explicit dadosDepois but metadata exists, persist metadata so UI can display it
    const finalDadosDepois = dadosDepois ?? (metadata && Object.keys(metadata).length > 0 ? metadata : null)

    const { error } = await callRpc<null>('app_write_audit_log', {
      p_empresa_id: empresaId,
      p_usuario_id: user?.id ?? null,
      p_acao: normalizeAction(action),
      p_tabela: table,
      p_registro_id: recordId,
      p_dados_antes: dadosAntes,
      p_dados_depois: finalDadosDepois,
      p_ip_address: null,
      p_user_agent: navigator?.userAgent?.slice(0, 512) ?? null,
      p_correlacao_id: correlacaoId,
      p_resultado: resultado,
      p_mensagem_erro: mensagemErro,
      p_impersonado_por_id: impersonadoPorId,
      p_impersonado_por_email: impersonadoPorEmail,
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

// ── Internal helper ───────────────────────────────────────────────────────────
async function _writeAudit(params: {
  acao: string
  tabela: string
  recordId?: string | null
  empresaId?: string | null
  dadosAntes?: Record<string, unknown> | null
  dadosDepois?: Record<string, unknown> | null
  resultado?: 'sucesso' | 'erro' | 'rejeitado'
  mensagemErro?: string | null
}) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await callRpc<null>('app_write_audit_log', {
    p_empresa_id: params.empresaId ?? null,
    p_usuario_id: user?.id ?? null,
    p_acao: params.acao,
    p_tabela: params.tabela,
    p_registro_id: params.recordId ?? null,
    p_dados_antes: params.dadosAntes ?? null,
    p_dados_depois: params.dadosDepois ?? null,
    p_ip_address: null,
    p_user_agent: navigator?.userAgent?.slice(0, 512) ?? null,
    p_correlacao_id: null,
    p_resultado: params.resultado ?? 'sucesso',
    p_mensagem_erro: params.mensagemErro ?? null,
  })
  if (error) {
    logger.error('audit_rpc_failed', { acao: params.acao, tabela: params.tabela, error: error.message })
  }
}

// ── Typed helpers ─────────────────────────────────────────────────────────────

/** Entity creation — stores all initial field values */
export async function auditCreate(args: {
  tabela: string
  recordId?: string | null
  dadosDepois: Record<string, unknown>
  empresaId?: string | null
}) {
  try {
    await _writeAudit({
      acao: 'CREATE',
      tabela: args.tabela,
      recordId: args.recordId ?? null,
      empresaId: args.empresaId ?? null,
      dadosAntes: null,
      dadosDepois: args.dadosDepois,
      resultado: 'sucesso',
    })
  } catch { /* fire-and-forget */ }
}

/** Entity update — stores before/after; RPC computes field-level diff automatically */
export async function auditUpdate(args: {
  tabela: string
  recordId?: string | null
  dadosAntes: Record<string, unknown>
  dadosDepois: Record<string, unknown>
  empresaId?: string | null
}) {
  try {
    await _writeAudit({
      acao: 'UPDATE',
      tabela: args.tabela,
      recordId: args.recordId ?? null,
      empresaId: args.empresaId ?? null,
      dadosAntes: args.dadosAntes,
      dadosDepois: args.dadosDepois,
      resultado: 'sucesso',
    })
  } catch { /* fire-and-forget */ }
}

/** Entity deletion — stores snapshot of deleted record */
export async function auditDelete(args: {
  tabela: string
  recordId?: string | null
  dadosAntes: Record<string, unknown>
  empresaId?: string | null
}) {
  try {
    await _writeAudit({
      acao: 'DELETE',
      tabela: args.tabela,
      recordId: args.recordId ?? null,
      empresaId: args.empresaId ?? null,
      dadosAntes: args.dadosAntes,
      dadosDepois: null,
      resultado: 'sucesso',
    })
  } catch { /* fire-and-forget */ }
}

/** Login attempt — records email, result, attempt count and error message */
export async function auditLogin(args: {
  email: string
  resultado: 'sucesso' | 'erro'
  empresaId?: string | null
  mensagemErro?: string | null
  tentativas?: number
}) {
  try {
    await _writeAudit({
      acao: 'LOGIN',
      tabela: 'auth',
      recordId: null,
      empresaId: args.empresaId ?? null,
      dadosAntes: null,
      dadosDepois: {
        email: args.email,
        resultado: args.resultado,
        tentativas: args.tentativas ?? 1,
        ...(args.mensagemErro ? { mensagem_erro: args.mensagemErro } : {}),
      },
      resultado: args.resultado,
      mensagemErro: args.resultado === 'erro' ? (args.mensagemErro ?? 'Credenciais inválidas') : null,
    })
  } catch { /* fire-and-forget */ }
}

/** Data export — records format, applied filters and record count */
export async function auditExport(args: {
  tabela: string
  formato?: string
  totalRegistros?: number
  filtros?: Record<string, unknown>
  empresaId?: string | null
}) {
  try {
    await _writeAudit({
      acao: 'EXPORT',
      tabela: args.tabela,
      recordId: null,
      empresaId: args.empresaId ?? null,
      dadosAntes: null,
      dadosDepois: {
        formato: args.formato ?? 'csv',
        total_registros: args.totalRegistros ?? 0,
        ...(args.filtros ? { filtros: args.filtros } : {}),
      },
      resultado: 'sucesso',
    })
  } catch { /* fire-and-forget */ }
}
