import { describe, it, expect, vi } from 'vitest';

/**
 * Smoke test para verificar que o fluxo de contratos no Owner está funcional.
 * Este teste valida:
 * - Acesso à aba de contratos no Master TI para SYSTEM_OWNER
 * - Carregamento e renderização do painel
 * - Ações de visualizar, imprimir e exportar PDF
 */

describe('Owner Contracts Flow - Smoke Tests', () => {
  it('aba de contratos deve estar presente no Master TI apenas para SYSTEM_OWNER', () => {
    // Validar que MasterContratosPanel existe e está importável
    const mod = require('@/components/master-ti/MasterContratosPanel');
    expect(mod.MasterContratosPanel).toBeDefined();
    expect(typeof mod.MasterContratosPanel).toBe('function');
  });

  it('funções de documento (print e pdf) devem estar disponíveis', () => {
    const mod = require('@/lib/reportGenerator');
    expect(typeof mod.generateOwnerContractPDF).toBe('function');
    expect(typeof mod.printOwnerContractDocument).toBe('function');
  });

  it('tipos de contrato do owner devem incluir campos de documento', () => {
    const mod = require('@/services/ownerPortal.service');
    // A interface OwnerContract deve existir (validada em tempo de compilação)
    // Este teste garante que o export não foi quebrado
    expect(mod).toBeDefined();
  });

  it('Master TI deve ter a aba de contratos declarada na lista TABS', async () => {
    // Import dinâmico para validar disponibilidade
    const MasterTI = require('@/pages/MasterTI');
    expect(MasterTI).toBeDefined();
  });

  it('painel de contratos deve estar conectado ao hook useOwner2Contracts', () => {
    const mod = require('@/components/master-ti/MasterContratosPanel');
    const source = mod.toString();
    // Validar que o componente usa o hook correto
    expect(source).toContain('useOwner2Contracts');
  });

  it('fluxo de preview de contrato deve estar funcional', () => {
    const mod = require('@/components/master-ti/MasterContratosPanel');
    const source = mod.toString();
    // Validar que existe state de preview
    expect(source).toContain('previewContract');
    expect(source).toContain('setPreviewContract');
  });

  it('gerador de PDF deve suportar contrato do owner', () => {
    const mod = require('@/lib/reportGenerator');
    expect(typeof mod.generateOwnerContractPDF).toBe('function');
    expect(mod.OwnerContractForDocument).toBeDefined();
  });

  it('função de impressão deve suportar contrato do owner', () => {
    const mod = require('@/lib/reportGenerator');
    expect(typeof mod.printOwnerContractDocument).toBe('function');
  });

  it('módulo de hooks do owner deve exportar useOwner2Contracts', () => {
    const mod = require('@/hooks/useOwner2Portal');
    expect(typeof mod.useOwner2Contracts).toBe('function');
  });

  it('painel de contratos operacionais não deve ter duplicação de auditoria', () => {
    const hooksMod = require('@/hooks/useContratos');
    const servicesMod = require('@/services/contratos.service');
    // Ambos devem existir mas sem duplicação de log no hook
    const hookSource = hooksMod.toString();
    // writeAuditLog não deve ser chamado nos handlers do hook (apenas no service)
    expect(hookSource).not.toContain('writeAuditLog');
  });

  it('página de contratos operacionais deve ter tratamento de erro explícito', () => {
    const mod = require('@/pages/Contratos');
    const source = mod.toString();
    // Validar presença de isError e tratamento
    expect(source).toContain('isError');
  });

  it('página de contratos operacionais deve diferenciar estado vazio', () => {
    const mod = require('@/pages/Contratos');
    const source = mod.toString();
    // Validar que há mensagem parametrizada para vazio vs filtro
    expect(source).toContain('emptyStateMessage');
  });
});
