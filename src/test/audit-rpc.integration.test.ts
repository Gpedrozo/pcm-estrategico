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

  it('calls RPC with severity/source/metadata and succeeds silently', async () => {
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
      p_action: 'UPDATE_PERMISSIONS',
      p_table: 'permissoes_granulares',
      p_record_id: 'user-1',
      p_empresa_id: 'empresa-1',
      p_severity: 'critical',
      p_source: 'integration_test',
      p_metadata: {
        reason: 'manual-check',
        actor_profile: 'SYSTEM_OWNER',
      },
    });
    expect(mockedLoggerError).not.toHaveBeenCalled();
  });

  it('logs unauthenticated/failure path when RPC returns error', async () => {
    mockedCallRpc.mockResolvedValue({ data: null, error: new Error('unauthenticated') });

    await writeAuditLog({
      action: 'READ_OWNER_METRICS',
      table: 'owner_metrics',
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
