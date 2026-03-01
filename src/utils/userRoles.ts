export type AppRole = 'MASTER_TI' | 'ADMIN' | 'USUARIO';

const ROLE_PRIORITY: Record<AppRole, number> = {
  MASTER_TI: 3,
  ADMIN: 2,
  USUARIO: 1,
};

export function getEffectiveRole(roles: Array<{ role: AppRole }> | null | undefined): AppRole {
  if (!roles || roles.length === 0) return 'USUARIO';

  let selected: AppRole = 'USUARIO';
  for (const current of roles) {
    if (ROLE_PRIORITY[current.role] > ROLE_PRIORITY[selected]) {
      selected = current.role;
    }
  }

  return selected;
}
