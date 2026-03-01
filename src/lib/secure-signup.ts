export type SignupRole = 'ADMIN' | 'USUARIO' | 'MASTER_TI';

interface BuildSecureSignupMetadataInput {
  nome: string;
  empresaId?: string;
  role?: SignupRole;
}

const VALID_ROLES: SignupRole[] = ['ADMIN', 'USUARIO', 'MASTER_TI'];

export function buildSecureSignupMetadata({
  nome,
  empresaId,
  role = 'USUARIO',
}: BuildSecureSignupMetadataInput) {
  if (!empresaId) {
    throw new Error('empresa_id é obrigatório para criação de usuário');
  }

  if (!VALID_ROLES.includes(role)) {
    throw new Error(`role '${role}' inválido. Valores permitidos: ${VALID_ROLES.join(', ')}`);
  }

  return {
    nome,
    empresa_id: empresaId,
    role,
    must_change_password: true,
  };
}
