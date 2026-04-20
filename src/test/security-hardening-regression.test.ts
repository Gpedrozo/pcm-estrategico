/**
 * Security hardening regression tests — validates fixes applied in the zero-failure plan.
 * Run: npx vitest run src/test/security-hardening-regression.test.ts
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC = path.resolve(__dirname, '..');

function readSrc(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf-8');
}

describe('Security Hardening Regression Tests', () => {
  // ═══════════════════════════════════════════
  // 1. Open Redirect Protection (Commit #1)
  // ═══════════════════════════════════════════
  describe('tenantLoginFlow — open redirect block', () => {
    const content = readSrc('lib/tenantLoginFlow.ts');

    it('defines isSafeRelativePath helper', () => {
      expect(content).toContain('isSafeRelativePath');
    });

    it('blocks protocol-relative paths (//)', () => {
      expect(content).toMatch(/startsWith\(['"]\/\/['"]\)/);
    });

    it('blocks backslash paths (/\\)', () => {
      expect(content).toMatch(/\\[\\@\\]/);
    });
  });

  // ═══════════════════════════════════════════
  // 2. PortalMecanico Hardening (Commit #2)
  // ═══════════════════════════════════════════
  describe('PortalMecanicoContext — input validation & rate limiting', () => {
    const content = readSrc('contexts/PortalMecanicoContext.tsx');

    it('defines MAX_CODIGO_LENGTH constant', () => {
      expect(content).toMatch(/MAX_CODIGO_LENGTH\s*=\s*20/);
    });

    it('defines MAX_SENHA_LENGTH constant', () => {
      expect(content).toMatch(/MAX_SENHA_LENGTH\s*=\s*128/);
    });

    it('defines MAX_LOGIN_ATTEMPTS constant', () => {
      expect(content).toMatch(/MAX_LOGIN_ATTEMPTS\s*=\s*5/);
    });

    it('defines LOCKOUT_DURATION_MS constant', () => {
      expect(content).toMatch(/LOCKOUT_DURATION_MS\s*=\s*60[_]?000/);
    });

    it('validates input length before login', () => {
      expect(content).toContain('code.length > MAX_CODIGO_LENGTH');
      expect(content).toContain('pass.length > MAX_SENHA_LENGTH');
    });

    it('checks lockout before login attempt', () => {
      expect(content).toContain('lockoutUntilRef.current');
    });

    it('increments attempts on failed credential validation', () => {
      expect(content).toContain('loginAttemptsRef.current += 1');
    });

    it('resets attempts on successful login', () => {
      expect(content).toContain('loginAttemptsRef.current = 0');
      expect(content).toContain('lockoutUntilRef.current = 0');
    });
  });

  // ═══════════════════════════════════════════
  // 3. Tenant Isolation Fixes (Commit #3)
  // ═══════════════════════════════════════════
  describe('useAllComponentes — tenantId guard in enabled', () => {
    const content = readSrc('hooks/useComponentesEquipamento.ts');

    it('useAllComponentes filters by tenantId (empresa_id)', () => {
      // Find the useAllComponentes function and check it uses tenantId
      const funcStart = content.indexOf('function useAllComponentes');
      expect(funcStart).toBeGreaterThan(-1);

      const funcBody = content.slice(funcStart, funcStart + 600);
      // Must destructure tenantId from useAuth
      expect(funcBody).toContain('tenantId');
      // Must filter by empresa_id = tenantId
      expect(funcBody).toMatch(/\.eq\(['"]empresa_id['"],\s*tenantId/);
    });
  });

  describe('TenantContext — fail-closed fallback', () => {
    const content = readSrc('contexts/TenantContext.tsx');

    it('fallback branch sets is_active to false (not true)', () => {
      // The fallback branch (when empresa info fetch fails) should be fail-closed
      const fallbackMatch = content.match(/fallback.*?is_active:\s*(true|false)/s);
      if (fallbackMatch) {
        expect(fallbackMatch[1]).toBe('false');
      }
      // Also verify no unconditional is_active: true in fallback context
      const lines = content.split('\n');
      const fallbackLine = lines.findIndex(l => l.includes('tenant_resolution_company_not_found_fallback_applied'));
      if (fallbackLine > -1) {
        // Check the setTenant block before this log line
        const block = lines.slice(Math.max(0, fallbackLine - 10), fallbackLine).join('\n');
        expect(block).toContain('is_active: false');
        expect(block).not.toContain('is_active: true');
      }
    });

    it('normal resolution derives is_active from actual status', () => {
      expect(content).toContain("normalizedStatus === 'active' || normalizedStatus === 'ativo'");
    });

    it('does NOT trust user_metadata for empresa_id', () => {
      // The context should use app_metadata, not user_metadata
      expect(content).not.toMatch(/user_metadata\s*[\.\?]?\s*\.?\s*empresa_id/);
    });
  });

  // ═══════════════════════════════════════════
  // 4. AI Prompt Injection Defense (Commit #4)
  // ═══════════════════════════════════════════
  describe('AssistentePCM — prompt input sanitization', () => {
    const content = readSrc('components/assistente/AssistentePCM.tsx');

    it('defines sanitizePromptInput function', () => {
      expect(content).toContain('sanitizePromptInput');
    });

    it('strips dangerous chars from input', () => {
      // The sanitize regex should strip < > { } [ ] \
      expect(content).toMatch(/\[<>{}/);
    });

    it('enforces max length on input field', () => {
      expect(content).toContain('maxLength={500}');
    });

    it('slices input on change handler', () => {
      expect(content).toContain('.slice(0, 500)');
    });
  });

  // ═══════════════════════════════════════════
  // 5. innerHTML / XSS Protection
  // ═══════════════════════════════════════════
  describe('XSS prevention across codebase', () => {
    it('Programacao.tsx uses DOMPurify.sanitize for innerHTML', () => {
      const content = readSrc('pages/Programacao.tsx');
      expect(content).toContain('DOMPurify.sanitize');
    });

    it('main.tsx uses escapeHtml before innerHTML', () => {
      const content = readSrc('main.tsx');
      expect(content).toContain('escapeHtml');
      // escapeHtml must be defined before renderBootstrapFatalFallback
      const escIdx = content.indexOf('function escapeHtml');
      const renderIdx = content.indexOf('function renderBootstrapFatalFallback');
      expect(escIdx).toBeGreaterThan(-1);
      expect(renderIdx).toBeGreaterThan(-1);
      expect(escIdx).toBeLessThan(renderIdx);
    });

    it('chart.tsx uses safeCssColor validator for dangerouslySetInnerHTML', () => {
      const content = readSrc('components/ui/chart.tsx');
      expect(content).toContain('safeCssColor');
      expect(content).toContain('safeCssIdent');
    });
  });

  // ═══════════════════════════════════════════
  // 6. Supabase Client — No Localhost Fallback in Production
  // ═══════════════════════════════════════════
  describe('Supabase client.ts — safe configuration', () => {
    const content = readSrc('integrations/supabase/client.ts');

    it('throws error if env vars missing in non-test environment', () => {
      expect(content).toContain("throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set");
    });

    it('localhost fallback is only for test environment', () => {
      expect(content).toMatch(/isTestEnvironment\s*\?\s*['"]http:\/\/127\.0\.0\.1:54321['"]/);
    });

    it('fallback key is empty string in non-test environment', () => {
      expect(content).toMatch(/isTestEnvironment\s*\?\s*['"]test-key['"]\s*:\s*['"]['"]|fallbackKey\s*=\s*isTestEnvironment\s*\?\s*['"]test-key['"]\s*:\s*['"]['""]/);
    });
  });

  // ═══════════════════════════════════════════
  // 7. Session Transfer — Signed & Time-Limited
  // ═══════════════════════════════════════════
  describe('Session Transfer Edge Function — security controls', () => {
    it('has signing secret separated from service role key', () => {
      const content = fs.readFileSync(
        path.resolve(SRC, '..', 'supabase', 'functions', 'session-transfer', 'index.ts'),
        'utf-8',
      );
      // Must use a dedicated signing secret
      expect(content).toContain('SESSION_TRANSFER_SIGNING_SECRET');
      // Must throw if secret is not configured (error message warns against using service role key)
      expect(content).toMatch(/throw new Error.*SESSION_TRANSFER_SIGNING_SECRET must be set/);
    });

    it('validates target_host against domain allowlist', () => {
      const content = fs.readFileSync(
        path.resolve(SRC, '..', 'supabase', 'functions', 'session-transfer', 'index.ts'),
        'utf-8',
      );
      expect(content).toContain('isAllowedHost');
      expect(content).toContain('gppis.com.br');
    });

    it('checks expiry on consume', () => {
      const content = fs.readFileSync(
        path.resolve(SRC, '..', 'supabase', 'functions', 'session-transfer', 'index.ts'),
        'utf-8',
      );
      expect(content).toContain('transfer code expired');
      expect(content).toContain('expires_at');
    });

    it('has rate limiting on both create and consume', () => {
      const content = fs.readFileSync(
        path.resolve(SRC, '..', 'supabase', 'functions', 'session-transfer', 'index.ts'),
        'utf-8',
      );
      expect(content).toContain('session_transfer_create');
      expect(content).toContain('session_transfer_consume');
      expect(content).toContain('enforceRateLimit');
    });
  });

  // ═══════════════════════════════════════════
  // 8. All 4 Hooks — Tenant Isolation Complete
  // ═══════════════════════════════════════════
  describe('Tenant isolation in preventive/lubrication hooks', () => {
    const hookFiles = [
      'hooks/useExecucoesPreventivas.ts',
      'hooks/useComponentesEquipamento.ts',
      'hooks/useAtividadesPreventivas.ts',
      'hooks/useAtividadesLubrificacao.ts',
    ];

    hookFiles.forEach((hookFile) => {
      describe(hookFile, () => {
        const content = readSrc(hookFile);

        it('imports useAuth', () => {
          expect(content).toContain('useAuth');
        });

        it('uses tenantId from useAuth', () => {
          expect(content).toContain('tenantId');
        });

        it('includes tenantId in queryKey', () => {
          expect(content).toMatch(/queryKey:\s*\[.*tenantId/);
        });

        it('filters by empresa_id in queries', () => {
          expect(content).toMatch(/\.eq\(['"]empresa_id['"],\s*tenantId/);
        });

        it('guards mutations with tenantId check', () => {
          expect(content).toMatch(/if\s*\(\s*!tenantId\s*\)/);
        });
      });
    });
  });

  // ═══════════════════════════════════════════
  // 9. Etapas Ponto Lubrificação — Tenant Cache Isolation
  // ═══════════════════════════════════════════
  describe('useEtapasPontoLubrificacao — tenant isolation', () => {
    const content = readSrc('hooks/useEtapasPontoLubrificacao.ts');

    it('useEtapasByPonto includes tenantId in queryKey', () => {
      const funcStart = content.indexOf('function useEtapasByPonto');
      const funcBody = content.slice(funcStart, funcStart + 400);
      expect(funcBody).toMatch(/queryKey:.*tenantId/);
    });

    it('useEtapasByPlano includes tenantId in queryKey', () => {
      const funcStart = content.indexOf('function useEtapasByPlano');
      const funcBody = content.slice(funcStart, funcStart + 400);
      expect(funcBody).toMatch(/queryKey:.*tenantId/);
    });

    it('queries are guarded with enabled: !!tenantId', () => {
      expect(content).toMatch(/enabled:.*&&\s*!!tenantId/);
    });

    it('all 3 mutations guard with tenantId check', () => {
      const guards = content.match(/if \(!tenantId\) throw/g) || [];
      expect(guards.length).toBeGreaterThanOrEqual(3);
    });
  });
});
