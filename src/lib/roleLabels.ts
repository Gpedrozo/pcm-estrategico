export const ROLE_LABELS: Record<string, string> = {
  // New canonical names
  OWNER_MASTER: 'Owner Master',
  OWNER_SYSTEM: 'Owner Sistema',
  ADMIN_TI: 'Admin TI',
  ADMIN: 'Administrador',
  USER: 'Usuário',
  MECANICO: 'Mecânico',
  SOLICITANTE: 'Solicitante',

  // Legacy names (same labels for backward compat)
  SYSTEM_OWNER: 'Owner Master',
  SYSTEM_ADMIN: 'Owner Sistema',
  MASTER_TI: 'Admin TI',
  USUARIO: 'Usuário',
  TECHNICIAN: 'Mecânico',

  // Phantom roles (mapped to closest)
  OWNER: 'Proprietário',
  MANAGER: 'Gestor',
  PLANNER: 'Planejador',
  VIEWER: 'Visualizador',
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}
