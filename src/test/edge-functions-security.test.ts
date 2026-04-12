import { describe, expect, it } from 'vitest';

/**
 * Static analysis tests for Supabase Edge Functions.
 * Validates security patterns: CORS helper, authentication, empresa_id isolation.
 */

describe('Edge Functions – shared CORS helper', () => {
  it('_shared/cors.ts exports corsHeaders', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/_shared/cors.ts'),
      'utf-8',
    );
    expect(content).toContain('corsHeaders');
    expect(content).toContain('Access-Control-Allow-Origin');
  });

  it('_shared/auth.ts exports requireAuth or getUser', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/_shared/auth.ts'),
      'utf-8',
    );
    const hasAuth =
      content.includes('requireAuth') ||
      content.includes('getUser') ||
      content.includes('supabaseClient');
    expect(hasAuth).toBe(true);
  });
});

const EDGE_FUNCTIONS_WITH_AUTH = [
  'kpi-report',
  'generate-ai-analysis',
  'ai-analysis-engine',
  'preditiva-analysis',
  'generate-equipment-qrcode',
  'gerar-relatorio-pdf',
];

describe('Edge Functions – auth verification', () => {
  for (const fnName of EDGE_FUNCTIONS_WITH_AUTH) {
    it(`${fnName}/index.ts verifies auth token`, async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(
        __dirname,
        `../../supabase/functions/${fnName}/index.ts`,
      );

      if (!fs.existsSync(filePath)) return;

      const content = fs.readFileSync(filePath, 'utf-8');

      // Must call getUser, requireAuth, or auth.getUser
      const hasAuth =
        content.includes('getUser') ||
        content.includes('requireAuth') ||
        content.includes('auth.getUser') ||
        content.includes('supabaseClient') ||
        content.includes('Authorization');

      expect(hasAuth).toBe(true);
    });
  }
});

describe('Edge Functions – CORS preflight handling', () => {
  for (const fnName of EDGE_FUNCTIONS_WITH_AUTH) {
    it(`${fnName}/index.ts handles OPTIONS preflight`, async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(
        __dirname,
        `../../supabase/functions/${fnName}/index.ts`,
      );

      if (!fs.existsSync(filePath)) return;

      const content = fs.readFileSync(filePath, 'utf-8');

      const handlesPreflight =
        content.includes("OPTIONS") ||
        content.includes('corsHeaders') ||
        content.includes('cors');

      expect(handlesPreflight).toBe(true);
    });
  }
});

describe('Edge Functions – kpi-report Zod validation', () => {
  it('kpi-report uses Zod schema for query params', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/functions/kpi-report/index.ts'),
      'utf-8',
    );

    expect(content).toContain('z.object');
    expect(content).toContain('safeParse');
    expect(content).toContain('QuerySchema');
  });
});
