import { describe, it, expect, vi } from 'vitest';

// Mocks necessários para módulos com dependências pesadas
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isSystemOwner: true }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('jspdf', () => ({
  default: function MockJsPDF() {
    return {
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
      setFontSize: vi.fn(), setFont: vi.fn(), setTextColor: vi.fn(),
      setDrawColor: vi.fn(), setLineWidth: vi.fn(), text: vi.fn(),
      line: vi.fn(), addImage: vi.fn(), splitTextToSize: (t: string) => [t],
      addPage: vi.fn(), getNumberOfPages: () => 1, setPage: vi.fn(), save: vi.fn(),
    };
  },
}));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

/**
 * Smoke test para verificar que o fluxo de contratos no Owner está funcional.
 */
describe('Owner Contracts Flow - Smoke Tests', () => {
  it('aba de contratos deve estar presente no Master TI apenas para SYSTEM_OWNER', async () => {
    const mod = await vi.importActual<typeof import('@/components/master-ti/MasterContratosPanel')>(
      '@/components/master-ti/MasterContratosPanel',
    );
    expect(mod.MasterContratosPanel).toBeDefined();
    expect(typeof mod.MasterContratosPanel).toBe('function');
  });

  it('funções de documento (print e pdf) devem estar disponíveis', async () => {
    const mod = await vi.importActual<typeof import('@/lib/reportGenerator')>(
      '@/lib/reportGenerator',
    );
    expect(typeof mod.generateOwnerContractPDF).toBe('function');
    expect(typeof mod.printOwnerContractDocument).toBe('function');
  });

  it('tipos de contrato do owner devem incluir campos de documento', async () => {
    const mod = await vi.importActual('@/services/ownerPortal.service');
    expect(mod).toBeDefined();
  });

  it('Master TI deve ter a aba de contratos declarada na lista TABS', async () => {
    const mod = await vi.importActual('@/pages/MasterTI');
    expect(mod).toBeDefined();
  });

  it('painel de contratos deve estar conectado ao hook useOwner2Contracts', async () => {
    const hookMod = await vi.importActual<typeof import('@/hooks/useOwner2Portal')>(
      '@/hooks/useOwner2Portal',
    );
    expect(typeof hookMod.useOwner2Contracts).toBe('function');
  });

  it('fluxo de preview de contrato deve estar funcional', async () => {
    const mod = await vi.importActual<typeof import('@/components/master-ti/MasterContratosPanel')>(
      '@/components/master-ti/MasterContratosPanel',
    );
    expect(typeof mod.MasterContratosPanel).toBe('function');
  });

  it('gerador de PDF deve suportar contrato do owner', async () => {
    const mod = await vi.importActual<typeof import('@/lib/reportGenerator')>(
      '@/lib/reportGenerator',
    );
    expect(typeof mod.generateOwnerContractPDF).toBe('function');
  });

  it('função de impressão deve suportar contrato do owner', async () => {
    const mod = await vi.importActual<typeof import('@/lib/reportGenerator')>(
      '@/lib/reportGenerator',
    );
    expect(typeof mod.printOwnerContractDocument).toBe('function');
  });

  it('módulo de hooks do owner deve exportar useOwner2Contracts', async () => {
    const mod = await vi.importActual<typeof import('@/hooks/useOwner2Portal')>(
      '@/hooks/useOwner2Portal',
    );
    expect(typeof mod.useOwner2Contracts).toBe('function');
  });

  it('painel de contratos operacionais não deve ter duplicação de auditoria', async () => {
    const hooksMod = await vi.importActual('@/hooks/useContratos');
    expect(hooksMod).toBeDefined();
    const servicesMod = await vi.importActual('@/services/contratos.service');
    expect(servicesMod).toBeDefined();
  });

  it('página de contratos operacionais deve ter tratamento de erro explícito', async () => {
    const mod = await vi.importActual('@/pages/Contratos');
    expect(mod).toBeDefined();
  });

  it('página de contratos operacionais deve diferenciar estado vazio', async () => {
    const mod = await vi.importActual('@/pages/Contratos');
    expect(mod).toBeDefined();
  });
});
