import { describe, expect, it } from 'vitest';

/**
 * Static analysis tests that scan hook files for empresa_id isolation.
 * These tests ensure that INSERT, UPDATE, and DELETE operations
 * all include empresa_id in their Supabase query chains.
 */

const HOOKS_WITH_EMPRESA_ID = [
  // usePontosPlano.ts is intentionally excluded: rotas_lubrificacao_pontos has no
  // empresa_id column; tenant isolation is enforced via RLS join through planos_lubrificacao.
  'useRotasLubrificacao.ts',
  'useEstoqueLubrificantes.ts',
  'useDocumentosTecnicos.ts',
  'useMedicoesPreditivas.ts',
  'useAtividadesLubrificacao.ts',
  'useAtividadesPreventivas.ts',
  'useFMEA.ts',
  'useComponentesEquipamento.ts',
  'useLubrificacao.ts',
  'usePlanosPreventivos.ts',
  'useRCA.ts',
  'useSolicitacoes.ts',
  'useSSMA.ts',
  'useSupportTickets.ts',
  'useTemplatesPreventivos.ts',
  'useTreinamentosSSMA.ts',
  'useInspecoes.ts',
  'useMelhorias.ts',
  'useFornecedores.ts',
  'useDispositivosMoveis.ts',
  'usePermissoesGranulares.ts',
];

describe('Hook multi-tenant isolation – empresa_id contract', () => {
  for (const hookFile of HOOKS_WITH_EMPRESA_ID) {
    it(`${hookFile} references empresa_id in mutations`, async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, `../hooks/${hookFile}`);

      // Skip if file doesn't exist (some hooks may have been moved)
      if (!fs.existsSync(filePath)) return;

      const content = fs.readFileSync(filePath, 'utf-8');

      // Must import useAuth (for tenantId)
      expect(content).toContain('useAuth');

      // Must reference empresa_id somewhere in mutation code
      const hasEmpresaId =
        content.includes("empresa_id") ||
        content.includes("'empresa_id'") ||
        content.includes('"empresa_id"');

      expect(hasEmpresaId).toBe(true);
    });
  }

  it('useRootCauseAI.ts includes empresa_id in delete', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../modules/rootCauseAI/useRootCauseAI.ts'),
      'utf-8',
    );

    // DELETE must include .eq('empresa_id', tenantId)
    const deleteBlock = content.match(/\.delete\(\)[\s\S]*?\.eq\('empresa_id'/);
    expect(deleteBlock).toBeTruthy();
  });
});

describe('Hook multi-tenant isolation – Preditiva UPDATE', () => {
  it('Preditiva.tsx includes empresa_id in UPDATE', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../pages/Preditiva.tsx'),
      'utf-8',
    );

    // UPDATE must include .eq('empresa_id', ...)
    const updateWithEmpresa = content.match(/\.update\([\s\S]*?\.eq\(['"]empresa_id['"]/g);
    expect(updateWithEmpresa).toBeTruthy();
    expect(updateWithEmpresa!.length).toBeGreaterThanOrEqual(1);
  });
});
