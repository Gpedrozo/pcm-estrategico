import { beforeEach, describe, expect, it, vi } from 'vitest';
import { writeAuditLog } from '@/lib/audit';
import { callRpc } from '@/integrations/supabase/rpc';
import { logger } from '@/lib/logger';

vi.mock('@/integrations/supabase/rpc', () => ({
  callRpc: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

const mockedCallRpc = vi.mocked(callRpc);
const mockedLoggerError = vi.mocked(logger.error);

describe('app_write_audit_log integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls RPC with correct Portuguese params and succeeds silently', async () => {
    mockedCallRpc.mockResolvedValue({ data: null, error: null });

    await writeAuditLog({
      action: 'UPDATE_PERMISSIONS',
      table: 'permissoes_granulares',
      recordId: 'user-1',
      empresaId: 'empresa-1',
      severity: 'critical',
      source: 'integration_test',
      metadata: {
        reason: 'manual-check',
        actor_profile: 'SYSTEM_OWNER',
      },
    });

    expect(mockedCallRpc).toHaveBeenCalledWith('app_write_audit_log', {
      p_empresa_id: 'empresa-1',
      p_usuario_id: null,
      p_acao: 'UPDATE',
      p_tabela: 'permissoes_granulares',
      p_registro_id: 'user-1',
      p_dados_antes: null,
      p_dados_depois: {
        action_detail: 'UPDATE_PERMISSIONS',
        severity: 'critical',
        source: 'integration_test',
        reason: 'manual-check',
        actor_profile: 'SYSTEM_OWNER',
      },
      p_ip_address: null,
      p_user_agent: expect.any(String),
      p_correlacao_id: null,
      p_resultado: 'sucesso',
      p_mensagem_erro: null,
    });
    expect(mockedLoggerError).not.toHaveBeenCalled();
  });

  it('skips silently when empresaId is missing', async () => {
    mockedCallRpc.mockResolvedValue({ data: null, error: null });

    await writeAuditLog({
      action: 'READ_OWNER_METRICS',
      table: 'owner_metrics',
      source: 'integration_test',
    });

    expect(mockedCallRpc).not.toHaveBeenCalled();
    expect(mockedLoggerError).not.toHaveBeenCalled();
  });

  it('logs failure path when RPC returns error', async () => {
    mockedCallRpc.mockResolvedValue({ data: null, error: new Error('unauthenticated') });

    await writeAuditLog({
      action: 'READ_OWNER_METRICS',
      table: 'owner_metrics',
      empresaId: 'empresa-1',
      source: 'integration_test',
      metadata: {
        route: '/owner',
      },
    });

    expect(mockedLoggerError).toHaveBeenCalledWith('audit_log_rpc_failed', {
      action: 'READ_OWNER_METRICS',
      table: 'owner_metrics',
      error: 'unauthenticated',
    });
  });
});
