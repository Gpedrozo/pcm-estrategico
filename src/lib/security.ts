export type AppRole =
  | 'USUARIO'
  | 'SOLICITANTE'
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
const OWNER_DOMAIN_ALIASES = new Set(
  [OWNER_DOMAIN, OWNER_DOMAIN.startsWith('www.') ? OWNER_DOMAIN.slice(4) : `www.${OWNER_DOMAIN}`]
    .map((domain) => domain.toLowerCase())
    .filter(Boolean),
);

const TENANT_BASE_DOMAIN = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase();

export function isOwnerDomain(hostname: string = window.location.hostname): boolean {
  return OWNER_DOMAIN_ALIASES.has(hostname.toLowerCase());
}

export function resolveEmpresaSlug(hostname: string = window.location.hostname): string {
  const lowerHost = hostname.toLowerCase();

  if (lowerHost === TENANT_BASE_DOMAIN) return 'default';
  if (!lowerHost.endsWith(TENANT_BASE_DOMAIN)) return 'default';

  const withoutBase = lowerHost.replace(`.${TENANT_BASE_DOMAIN}`, '');
  const [subdomain] = withoutBase.split('.');
  return subdomain || 'default';
}

export function normalizeRole(role?: string | null): AppRole | null {
  if (!role) return null;

  const normalized = role
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  const allowed: AppRole[] = [
    'USUARIO',
    'SOLICITANTE',
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
  const { roles } = options;
  const normalizedRoles = roles
    .map((role) => normalizeRole(role))
    .filter((role): role is AppRole => Boolean(role));

  if (normalizedRoles.includes('SYSTEM_OWNER')) {
    return 'SYSTEM_OWNER';
  }

  if (normalizedRoles.includes('SYSTEM_ADMIN')) {
    return 'SYSTEM_ADMIN';
  }

  if (normalizedRoles.includes('MASTER_TI')) return 'MASTER_TI';
  if (normalizedRoles.includes('OWNER')) return 'OWNER';
  if (normalizedRoles.includes('MANAGER')) return 'MANAGER';
  if (normalizedRoles.includes('PLANNER')) return 'PLANNER';
  if (normalizedRoles.includes('TECHNICIAN')) return 'TECHNICIAN';
  if (normalizedRoles.includes('SOLICITANTE')) return 'SOLICITANTE';
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
