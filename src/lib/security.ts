export type AppRole =
  | 'USUARIO'
  | 'ADMIN'
  | 'MASTER_TI'
  | 'SYSTEM_OWNER'
  | 'SYSTEM_ADMIN'
  | 'OWNER'
  | 'MANAGER'
  | 'PLANNER'
  | 'TECHNICIAN'
  | 'VIEWER';

const OWNER_DOMAIN = (import.meta.env.VITE_OWNER_DOMAIN || 'owner.gppis.com.br').toLowerCase();
const DEFAULT_SYSTEM_OWNER_EMAILS = ['pedrozo@gppis.com.br'];
const SYSTEM_OWNER_EMAILS = (import.meta.env.VITE_SYSTEM_OWNER_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const TENANT_BASE_DOMAIN = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase();

export function isOwnerDomain(hostname: string = window.location.hostname): boolean {
  return hostname.toLowerCase() === OWNER_DOMAIN;
}

export function resolveEmpresaSlug(hostname: string = window.location.hostname): string {
  const lowerHost = hostname.toLowerCase();

  if (lowerHost === TENANT_BASE_DOMAIN) return 'default';
  if (!lowerHost.endsWith(TENANT_BASE_DOMAIN)) return 'default';

  const withoutBase = lowerHost.replace(`.${TENANT_BASE_DOMAIN}`, '');
  const [subdomain] = withoutBase.split('.');
  return subdomain || 'default';
}

export function isSystemOwnerEmail(email?: string | null): boolean {
  if (!email) return false;

  const normalizedEmail = email.toLowerCase();
  const allowlist = SYSTEM_OWNER_EMAILS.length > 0 ? SYSTEM_OWNER_EMAILS : DEFAULT_SYSTEM_OWNER_EMAILS;

  return allowlist.includes(normalizedEmail);
}

export function normalizeRole(role?: string | null): AppRole | null {
  if (!role) return null;

  const normalized = role
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  const allowed: AppRole[] = [
    'USUARIO',
    'ADMIN',
    'MASTER_TI',
    'SYSTEM_OWNER',
    'SYSTEM_ADMIN',
    'OWNER',
    'MANAGER',
    'PLANNER',
    'TECHNICIAN',
    'VIEWER',
  ];

  return (allowed as string[]).includes(normalized) ? (normalized as AppRole) : null;
}

export function getEffectiveRole(options: {
  roles: AppRole[];
  email?: string | null;
  hostname?: string;
}): AppRole {
  const { roles, email } = options;
  const normalizedRoles = roles
    .map((role) => normalizeRole(role))
    .filter((role): role is AppRole => Boolean(role));

  if (normalizedRoles.includes('SYSTEM_OWNER')) {
    return 'SYSTEM_OWNER';
  }

  if (normalizedRoles.includes('SYSTEM_ADMIN')) {
    return 'SYSTEM_ADMIN';
  }

  if (isSystemOwnerEmail(email)) {
    return 'SYSTEM_OWNER';
  }

  if (normalizedRoles.includes('MASTER_TI')) return 'MASTER_TI';
  if (normalizedRoles.includes('OWNER')) return 'OWNER';
  if (normalizedRoles.includes('MANAGER')) return 'MANAGER';
  if (normalizedRoles.includes('PLANNER')) return 'PLANNER';
  if (normalizedRoles.includes('TECHNICIAN')) return 'TECHNICIAN';
  if (normalizedRoles.includes('VIEWER')) return 'VIEWER';
  if (normalizedRoles.includes('ADMIN')) return 'ADMIN';
  return 'USUARIO';
}

export function buildSecureSignupMetadata(options: {
  empresaId: string;
  empresaSlug: string;
  email: string;
  requestedRole?: AppRole;
}) {
  const { empresaId, empresaSlug, email, requestedRole } = options;

  return {
    empresa_id: empresaId,
    empresa_slug: empresaSlug,
    requested_role: requestedRole || 'USUARIO',
    email,
  };
}

export function getPostLoginPath(role: AppRole, hostname?: string): string {
  if (isOwnerDomain(hostname)) return '/';
  if (role === 'MASTER_TI') return '/master-ti';
  return '/dashboard';
}
