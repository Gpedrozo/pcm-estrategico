import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks hoisted ────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const limitSpy = vi.fn();
  const selectSpy = vi.fn(() => ({ limit: limitSpy }));
  const fromSpy = vi.fn(() => ({ select: selectSpy }));
  return { fromSpy, selectSpy, limitSpy };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.fromSpy },
}));

vi.mock('@/lib/supabaseCompat', () => ({
  insertWithColumnFallback: vi.fn(),
  // Fiel à implementação real: verifica mensagem de texto, não código
  isMissingTableError: (err: unknown) => {
    const msg = (typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : ''
    ).toLowerCase();
    return (
      msg.includes('could not find the table') ||
      (msg.includes('relation') && msg.includes('does not exist')) ||
      (msg.includes('schema cache') && msg.includes('table'))
    );
  },
  updateWithColumnFallback: vi.fn(),
}));

// ─── Testes ───────────────────────────────────────────────────────────────────
describe('getSolicitacoesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Resetar cache interno entre testes via módulo isolado
    vi.resetModules();
  });

  it('retorna "solicitacoes_manutencao" quando a primeira tabela existe', async () => {
    mocks.limitSpy.mockResolvedValueOnce({ data: [], error: null });

    const { getSolicitacoesTable: fn } = await import('@/hooks/useSolicitacoes');
    const result = await fn();

    expect(result).toBe('solicitacoes_manutencao');
    expect(mocks.fromSpy).toHaveBeenCalledWith('solicitacoes_manutencao');
  });

  it('faz fallback para "solicitacoes" quando solicitacoes_manutencao não existe', async () => {
    // Primeira chamada: tabela não existe (42P01)
    mocks.limitSpy
      .mockResolvedValueOnce({ data: null, error: { code: '42P01', message: 'relation "solicitacoes_manutencao" does not exist' } })
      // Segunda chamada: tabela existe
      .mockResolvedValueOnce({ data: [], error: null });

    const { getSolicitacoesTable: fn } = await import('@/hooks/useSolicitacoes');
    const result = await fn();

    expect(result).toBe('solicitacoes');
    expect(mocks.fromSpy).toHaveBeenCalledWith('solicitacoes_manutencao');
    expect(mocks.fromSpy).toHaveBeenCalledWith('solicitacoes');
  });

  it('lança erro quando nenhuma tabela compatível é encontrada', async () => {
    // Mensagem que a implementação real de isMissingTableError reconhece como ausente
    mocks.limitSpy.mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation "solicitacoes_manutencao" does not exist' },
    });

    const { getSolicitacoesTable: fn } = await import('@/hooks/useSolicitacoes');
    await expect(fn()).rejects.toThrow('Nenhuma tabela de solicitações compatível');
  });

  it('lança erro imediatamente se erro não é de tabela ausente', async () => {
    mocks.limitSpy.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    });

    const { getSolicitacoesTable: fn } = await import('@/hooks/useSolicitacoes');
    await expect(fn()).rejects.toMatchObject({ code: '42501' });
  });
});
