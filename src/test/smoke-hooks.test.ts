/**
 * Smoke tests — Hooks layer
 * Valida que os hooks críticos exportam as funções esperadas.
 * NÃO executa hooks (precisaria de Provider) — apenas verifica imports.
 */
import { describe, expect, it, vi } from 'vitest';
import { mockSupabase } from './smoke-supabase-mock';

/* ---- mocks globais ---- */
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/supabaseCompat', () => ({
  isMissingTableError: vi.fn().mockReturnValue(false),
  getSupabaseErrorMessage: vi.fn((e: unknown) => String(e)),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'mock-uid', email: 'test@gppis.com.br' },
    tenantId: '00000000-0000-0000-0000-000000000099',
    role: 'ADMIN',
    isAuthenticated: true,
    loading: false,
    session: { access_token: 'mock-jwt' },
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn().mockReturnValue({
    toast: vi.fn(),
  }),
}));

/* ---------- tests ---------- */

describe('Hooks — smoke imports (sem execução)', () => {

  it('useOrdensServico importa sem crash', async () => {
    const mod = await import('@/hooks/useOrdensServico');
    expect(mod).toBeDefined();
  });

  it('useEquipamentos importa sem crash', async () => {
    const mod = await import('@/hooks/useEquipamentos');
    expect(mod).toBeDefined();
  });

  it('useLubrificacao importa sem crash', async () => {
    const mod = await import('@/hooks/useLubrificacao');
    expect(mod).toBeDefined();
  });

  it('useDashboardOptimized importa e exporta useDashboardSummary', async () => {
    const mod = await import('@/hooks/useDashboardOptimized');
    expect(typeof mod.useDashboardSummary).toBe('function');
  });

  it('useMecanicos importa sem crash', async () => {
    const mod = await import('@/hooks/useMecanicos');
    expect(mod).toBeDefined();
  });

  it('usePermissoesGranulares importa sem crash', async () => {
    const mod = await import('@/hooks/usePermissoesGranulares');
    expect(mod).toBeDefined();
  });

  it('useDispositivosMoveis importa sem crash', async () => {
    const mod = await import('@/hooks/useDispositivosMoveis');
    expect(mod).toBeDefined();
  });

  it('useSolicitacoes importa sem crash', async () => {
    const mod = await import('@/hooks/useSolicitacoes');
    expect(mod).toBeDefined();
  });

  it('useUsuarios importa sem crash', async () => {
    const mod = await import('@/hooks/useUsuarios');
    expect(mod).toBeDefined();
  });

  it('useMedicoesPreditivas importa sem crash', async () => {
    const mod = await import('@/hooks/useMedicoesPreditivas');
    expect(mod).toBeDefined();
  });

  it('useIndicadores importa sem crash', async () => {
    const mod = await import('@/hooks/useIndicadores');
    expect(mod).toBeDefined();
  });

  it('useAuditoria importa sem crash', async () => {
    const mod = await import('@/hooks/useAuditoria');
    expect(mod).toBeDefined();
  });

  it('useMaintenanceSchedule importa sem crash', async () => {
    const mod = await import('@/hooks/useMaintenanceSchedule');
    expect(mod).toBeDefined();
  });

  it('useExecucoesOS importa sem crash', async () => {
    const mod = await import('@/hooks/useExecucoesOS');
    expect(mod).toBeDefined();
  });

  it('useContratos importa sem crash', async () => {
    const mod = await import('@/hooks/useContratos');
    expect(mod).toBeDefined();
  });
});
