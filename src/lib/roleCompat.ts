/**
 * Role Compatibility Layer
 * 
 * Maps legacy role names to the new standardized names.
 * Both old and new names are supported simultaneously.
 * Old names will be phased out gradually.
 * 
 * New hierarchy:
 *   OWNER_MASTER  (was SYSTEM_OWNER)  — Platform owner, audits OWNER_SYSTEM
 *   OWNER_SYSTEM  (was SYSTEM_ADMIN)  — Platform admin, audited by OWNER_MASTER
 *   ADMIN_TI      (was MASTER_TI)     — Tenant IT admin, full tenant access
 *   ADMIN         (unchanged)         — Tenant business admin
 *   USER          (was USUARIO)       — Standard user
 *   MECANICO      (was TECHNICIAN)    — Mobile mechanic
 *   SOLICITANTE   (unchanged)         — Requester (mobile)
 */

/** Map from old role name → new canonical role name */
const LEGACY_TO_CANONICAL: Record<string, string> = {
  // New names map to themselves
  OWNER_MASTER: 'OWNER_MASTER',
  OWNER_SYSTEM: 'OWNER_SYSTEM',
  ADMIN_TI: 'ADMIN_TI',
  ADMIN: 'ADMIN',
  USER: 'USER',
  MECANICO: 'MECANICO',
  SOLICITANTE: 'SOLICITANTE',

  // Legacy names map to new names
  SYSTEM_OWNER: 'OWNER_MASTER',
  SYSTEM_ADMIN: 'OWNER_SYSTEM',
  MASTER_TI: 'ADMIN_TI',
  USUARIO: 'USER',
  TECHNICIAN: 'MECANICO',

  // Phantom roles map to closest equivalent
  OWNER: 'ADMIN',
  MANAGER: 'ADMIN',
  PLANNER: 'USER',
  VIEWER: 'USER',
};

/** Map from new canonical name → old name (for DB queries until migration) */
const CANONICAL_TO_LEGACY: Record<string, string> = {
  OWNER_MASTER: 'SYSTEM_OWNER',
  OWNER_SYSTEM: 'SYSTEM_ADMIN',
  ADMIN_TI: 'MASTER_TI',
  ADMIN: 'ADMIN',
  USER: 'USUARIO',
  MECANICO: 'TECHNICIAN',
  SOLICITANTE: 'SOLICITANTE',
};

/**
 * Translate any role string to the new canonical name.
 * Returns the input unchanged if it's already canonical or unknown.
 */
export function toCanonicalRole(role: string): string {
  const upper = role.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return LEGACY_TO_CANONICAL[upper] ?? upper;
}

/**
 * Translate a canonical role name back to the legacy DB name.
 * Useful until the DB enum is fully migrated.
 */
export function toLegacyRole(canonicalRole: string): string {
  return CANONICAL_TO_LEGACY[canonicalRole] ?? canonicalRole;
}

/**
 * Check if two role strings refer to the same role,
 * regardless of whether they use old or new naming.
 */
export function isSameRole(roleA: string, roleB: string): boolean {
  return toCanonicalRole(roleA) === toCanonicalRole(roleB);
}
