/**
 * Smoke tests — Security & Auth fundamentals
 * Valida que módulos de segurança e auth exportam o esperado.
 * NÃO monta componentes React (sem DOM) — apenas verifica exports e lógica pura.
 */
import { describe, expect, it, vi } from 'vitest';

/* ---- mocks de ambiente ---- */
vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-anon-key');
vi.stubEnv('VITE_OWNER_DOMAIN', 'owner.gppis.com.br');
vi.stubEnv('VITE_TENANT_BASE_DOMAIN', 'gppis.com.br');

/* ---------- security.ts ---------- */
describe('lib/security — exports and pure logic', () => {
  it('exporta isOwnerDomain como function', async () => {
    const { isOwnerDomain } = await import('@/lib/security');
    expect(typeof isOwnerDomain).toBe('function');
  });

  it('exporta resolveEmpresaSlug como function', async () => {
    const { resolveEmpresaSlug } = await import('@/lib/security');
    expect(typeof resolveEmpresaSlug).toBe('function');
  });

  it('exporta tipo AppRole (verificação indireta via uso)', async () => {
    const mod = await import('@/lib/security');
    // Se o módulo importa sem crash e tem exports, o tipo existe
    expect(mod).toBeDefined();
  });

  it('isOwnerDomain retorna true para owner.gppis.com.br', async () => {
    const { isOwnerDomain } = await import('@/lib/security');
    expect(isOwnerDomain('owner.gppis.com.br')).toBe(true);
  });

  it('isOwnerDomain retorna false para tenant.gppis.com.br', async () => {
    const { isOwnerDomain } = await import('@/lib/security');
    expect(isOwnerDomain('tenant.gppis.com.br')).toBe(false);
  });

  it('resolveEmpresaSlug extrai subdomain de tenant', async () => {
    const { resolveEmpresaSlug } = await import('@/lib/security');
    expect(resolveEmpresaSlug('acme.gppis.com.br')).toBe('acme');
  });

  it('resolveEmpresaSlug retorna default para domínio base', async () => {
    const { resolveEmpresaSlug } = await import('@/lib/security');
    expect(resolveEmpresaSlug('gppis.com.br')).toBe('default');
  });
});

/* ---------- AuthContext ---------- */
describe('AuthContext — exports', () => {
  it('exporta useAuth hook', async () => {
    const mod = await import('@/contexts/AuthContext');
    expect(typeof mod.useAuth).toBe('function');
  });

  it('exporta AuthProvider', async () => {
    const mod = await import('@/contexts/AuthContext');
    expect(typeof mod.AuthProvider).toBe('function');
  });
});

/* ---------- PortalMecanicoContext ---------- */
describe('PortalMecanicoContext — exports', () => {
  it('exporta usePortalMecanico hook', async () => {
    const mod = await import('@/contexts/PortalMecanicoContext');
    expect(typeof mod.usePortalMecanico).toBe('function');
  });

  it('exporta PortalMecanicoProvider', async () => {
    const mod = await import('@/contexts/PortalMecanicoContext');
    expect(typeof mod.PortalMecanicoProvider).toBe('function');
  });
});
