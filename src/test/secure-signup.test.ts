import { describe, expect, it } from 'vitest';
import { buildSecureSignupMetadata } from '@/lib/secure-signup';

describe('buildSecureSignupMetadata', () => {
  it('deve exigir empresa_id para cadastro seguro', () => {
    expect(() => buildSecureSignupMetadata({ nome: 'Teste' })).toThrow('empresa_id é obrigatório para criação de usuário');
  });

  it('deve gerar metadata com must_change_password ativado', () => {
    const metadata = buildSecureSignupMetadata({
      nome: 'Teste',
      empresaId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      role: 'USUARIO',
    });

    expect(metadata).toEqual({
      nome: 'Teste',
      empresa_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      role: 'USUARIO',
      must_change_password: true,
    });
  });

  it('deve rejeitar role inválida com mensagem orientativa', () => {
    expect(() =>
      buildSecureSignupMetadata({
        nome: 'Teste',
        empresaId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        role: 'GESTOR' as 'USUARIO',
      }),
    ).toThrow("role 'GESTOR' inválido. Valores permitidos: ADMIN, USUARIO, MASTER_TI");
  });
});
