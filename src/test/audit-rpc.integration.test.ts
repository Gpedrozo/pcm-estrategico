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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
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
      action: 'UPDATE',
      table: 'permissoes_granulares',
      recordId: 'user-1',
      empresaId: 'empresa-1',
    });

    expect(mockedCallRpc).toHaveBeenCalledWith('app_write_audit_log', {
      p_empresa_id: 'empresa-1',
      p_usuario_id: 'test-user-id',
      p_acao: 'UPDATE',
      p_tabela: 'permissoes_granulares',
      p_registro_id: 'user-1',
      p_dados_antes: null,
      p_dados_depois: null,
      p_ip_address: null,
      p_user_agent: expect.any(String),
      p_correlacao_id: null,
      p_resultado: 'sucesso',
      p_mensagem_erro: null,
    });
    expect(mockedLoggerError).not.toHaveBeenCalled();
  });

  it('normalizes Portuguese action names to English', async () => {
    mockedCallRpc.mockResolvedValue({ data: null, error: null });

    await writeAuditLog({
      action: 'CRIAR',
      table: 'ordens_servico',
      empresaId: 'empresa-1',
    });

    expect(mockedCallRpc).toHaveBeenCalledWith('app_write_audit_log', expect.objectContaining({
      p_acao: 'CREATE',
    }));
  });

  it('passes dados_antes/dados_depois when provided', async () => {
    mockedCallRpc.mockResolvedValue({ data: null, error: null });

    const antes = { status: 'aberta' };
    const depois = { status: 'fechada' };

    await writeAuditLog({
      action: 'CLOSE',
      table: 'ordens_servico',
      recordId: 'os-1',
      empresaId: 'empresa-1',
      dadosAntes: antes,
      dadosDepois: depois,
      resultado: 'sucesso',
    });

    expect(mockedCallRpc).toHaveBeenCalledWith('app_write_audit_log', expect.objectContaining({
      p_dados_antes: antes,
      p_dados_depois: depois,
      p_resultado: 'sucesso',
    }));
  });

  it('logs unauthenticated/failure path when RPC returns error', async () => {
    mockedCallRpc.mockResolvedValue({ data: null, error: new Error('unauthenticated') });

    await writeAuditLog({
      action: 'EXPORT',
      table: 'owner_metrics',
      empresaId: 'empresa-1',
    });

    expect(mockedLoggerError).toHaveBeenCalledWith('audit_log_rpc_failed', {
      action: 'EXPORT',
      table: 'owner_metrics',
      error: 'unauthenticated',
    });
  });
});
