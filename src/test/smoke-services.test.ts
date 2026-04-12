/**
 * Smoke tests — Services layer
 * Valida que os módulos de serviço exportam as funções esperadas
 * e que chamadas básicas passam pelo mock sem crash.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockSupabase } from './smoke-supabase-mock';

/* ---- mock supabase antes de qualquer import de serviço ---- */
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

/* ---------- tests ---------- */

describe('Services — smoke exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ordensServicoService exporta listar, listarRecentes, listarPendentes', async () => {
    const { ordensServicoService } = await import('@/services/ordensServico.service');
    expect(typeof ordensServicoService.listar).toBe('function');
    expect(typeof ordensServicoService.listarRecentes).toBe('function');
    expect(typeof ordensServicoService.listarPendentes).toBe('function');
  });

  it('equipamentosService exporta módulo sem crash', async () => {
    const mod = await import('@/services/equipamentos.service');
    expect(mod).toBeDefined();
    // O serviço pode exportar named ou default — basta não crashar
  });

  it('ownerPortal.service exporta callOwnerAdmin e deleteCompanyByOwner', async () => {
    const { callOwnerAdmin, deleteCompanyByOwner, purgeTableData } = await import(
      '@/services/ownerPortal.service'
    );
    expect(typeof callOwnerAdmin).toBe('function');
    expect(typeof deleteCompanyByOwner).toBe('function');
    expect(typeof purgeTableData).toBe('function');
  });

  it('mecanicos.service exporta módulo sem crash', async () => {
    const mod = await import('@/services/mecanicos.service');
    expect(mod).toBeDefined();
  });

  it('storage.service exporta módulo sem crash', async () => {
    const mod = await import('@/services/storage');
    expect(mod).toBeDefined();
  });

  it('hierarquia.service exporta módulo sem crash', async () => {
    const mod = await import('@/services/hierarquia.service');
    expect(mod).toBeDefined();
  });

  it('contratos.service exporta módulo sem crash', async () => {
    const mod = await import('@/services/contratos.service');
    expect(mod).toBeDefined();
  });

  it('materiais.service exporta módulo sem crash', async () => {
    const mod = await import('@/services/materiais.service');
    expect(mod).toBeDefined();
  });

  it('maintenanceSchedule exporta módulo sem crash', async () => {
    const mod = await import('@/services/maintenanceSchedule');
    expect(mod).toBeDefined();
  });
});
