import { supabase } from './supabase';

interface AuditInput {
  action: string;
  table: string;
  recordId?: string | null;
  empresaId?: string | null;
  dadosAntes?: Record<string, unknown> | null;
  dadosDepois?: Record<string, unknown> | null;
  correlacaoId?: string | null;
  resultado?: 'sucesso' | 'erro' | 'rejeitado';
  mensagemErro?: string | null;
}

const VALID_ACTIONS = new Set([
  'CREATE', 'UPDATE', 'DELETE', 'CLOSE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT',
]);

function normalizeAction(action: string): string {
  const upper = action.toUpperCase();
  if (VALID_ACTIONS.has(upper)) return upper;
  const prefix = upper.split('_')[0];
  if (VALID_ACTIONS.has(prefix)) return prefix;
  if (upper.includes('LOGIN')) return 'LOGIN';
  if (upper.includes('LOGOUT')) return 'LOGOUT';
  if (upper.includes('CLOSE')) return 'CLOSE';
  if (upper.includes('DELETE') || upper.includes('REMOVE')) return 'DELETE';
  if (upper.includes('CREATE') || upper.includes('GENERATE')) return 'CREATE';
  if (upper.includes('UPDATE') || upper.includes('EDIT')) return 'UPDATE';
  if (upper.includes('EXPORT')) return 'EXPORT';
  return 'UPDATE';
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
      dadosAntes = null,
      dadosDepois = null,
      correlacaoId = null,
      resultado = 'sucesso',
      mensagemErro = null,
    } = input;

    const { data: { user } } = await supabase.auth.getUser();

    await supabase.rpc('app_write_audit_log', {
      p_empresa_id: empresaId,
      p_usuario_id: user?.id ?? null,
      p_acao: normalizeAction(action),
      p_tabela: table,
      p_registro_id: recordId,
      p_dados_antes: dadosAntes,
      p_dados_depois: dadosDepois,
      p_ip_address: null,
      p_user_agent: null,
      p_correlacao_id: correlacaoId,
      p_resultado: resultado,
      p_mensagem_erro: mensagemErro,
    });
  } catch {
    // Audit is fire-and-forget — never throw
  }
}
