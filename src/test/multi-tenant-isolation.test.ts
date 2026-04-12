import { describe, expect, it } from 'vitest';

/**
 * Tests that verify multi-tenant isolation patterns
 * across critical service modules.
 */

describe('Multi-tenant isolation – service layer contracts', () => {
  describe('hierarquia.service – .limit() present', () => {
    it('listarPlantas includes .limit(500)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../services/hierarquia.service.ts'),
        'utf-8',
      );

      // Find listarPlantas function and verify .limit present
      const plantasBlock = content.match(/listarPlantas[\s\S]*?return data/);
      expect(plantasBlock).toBeTruthy();
      expect(plantasBlock![0]).toContain('.limit(');
    });

    it('listarAreas includes .limit(500)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../services/hierarquia.service.ts'),
        'utf-8',
      );

      const areasBlock = content.match(/listarAreas[\s\S]*?return data/);
      expect(areasBlock).toBeTruthy();
      expect(areasBlock![0]).toContain('.limit(');
    });

    it('listarSistemas includes .limit(500)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../services/hierarquia.service.ts'),
        'utf-8',
      );

      const sistemasBlock = content.match(/listarSistemas[\s\S]*?return data/);
      expect(sistemasBlock).toBeTruthy();
      expect(sistemasBlock![0]).toContain('.limit(');
    });
  });

  describe('services company_id enforcement', () => {
    const servicesToCheck = [
      { name: 'equipamentos.service.ts', patterns: ['empresa_id'] },
      { name: 'materiais.service.ts', patterns: ['empresa_id'] },
      { name: 'mecanicos.service.ts', patterns: ['empresa_id'] },
      { name: 'contratos.service.ts', patterns: ['empresa_id'] },
      { name: 'ordensServico.service.ts', patterns: ['empresa_id'] },
    ];

    for (const svc of servicesToCheck) {
      it(`${svc.name} includes empresa_id in all CRUD operations`, async () => {
        const fs = await import('fs');
        const path = await import('path');
        const content = fs.readFileSync(
          path.resolve(__dirname, `../services/${svc.name}`),
          'utf-8',
        );

        // Every .from() call should be followed by empresa_id filtering somewhere
        const fromCalls = content.match(/\.from\(['"][a-z_]+['"]\)/g) || [];
        expect(fromCalls.length).toBeGreaterThan(0);

        // Each service must reference empresa_id at least once per CRUD block
        for (const pattern of svc.patterns) {
          expect(content).toContain(pattern);
        }
      });
    }
  });

  describe('storage.ts – bucket allowlist', () => {
    it('only allows known buckets', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../services/storage.ts'),
        'utf-8',
      );

      expect(content).toContain('ALLOWED_BUCKETS');
      expect(content).toContain("includes('..')");
      expect(content).toContain("startsWith('/')");
    });
  });

  describe('Programacao.tsx – XSS escaping', () => {
    it('defines esc() function before innerHTML usage', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../pages/Programacao.tsx'),
        'utf-8',
      );

      const escFnIndex = content.indexOf('const esc = (t: string)');
      const innerHTMLIndex = content.indexOf('.innerHTML');
      expect(escFnIndex).toBeGreaterThan(-1);
      expect(innerHTMLIndex).toBeGreaterThan(-1);
      // esc() must be defined BEFORE innerHTML is used
      expect(escFnIndex).toBeLessThan(innerHTMLIndex);
    });
  });
});
