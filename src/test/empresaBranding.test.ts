import { describe, expect, it } from 'vitest';
import { resolveEmpresaBranding } from '@/hooks/useEmpresaBranding';

describe('resolveEmpresaBranding', () => {
  it('aplica fallback seguro quando não há configuração', () => {
    const branding = resolveEmpresaBranding(null);

    expect(branding.nome_exibicao).toBe('PCM ESTRATÉGICO');
    expect(branding.cor_primaria).toBe('#2563eb');
    expect(branding.cor_secundaria).toBe('#0f172a');
  });

  it('preserva valores configurados da empresa', () => {
    const branding = resolveEmpresaBranding({
      nome_exibicao: 'Tenant ACME',
      cor_primaria: '#111111',
      cor_secundaria: '#222222',
      logo_url: 'https://cdn.example.com/logo.png',
    });

    expect(branding.nome_exibicao).toBe('Tenant ACME');
    expect(branding.cor_primaria).toBe('#111111');
    expect(branding.cor_secundaria).toBe('#222222');
    expect(branding.logo_url).toBe('https://cdn.example.com/logo.png');
  });
});
