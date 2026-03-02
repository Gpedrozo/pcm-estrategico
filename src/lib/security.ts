export type AppRole = 'USUARIO' | 'ADMIN' | 'MASTER_TI' | 'SYSTEM_OWNER';

const OWNER_DOMAIN = (import.meta.env.VITE_OWNER_DOMAIN || 'owner.gppis.com.br').toLowerCase();
const SYSTEM_OWNER_EMAILS = (import.meta.env.VITE_SYSTEM_OWNER_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const TENANT_BASE_DOMAIN = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase();

export function isOwnerDomain(hostname: string = window.location.hostname): boolean {
  return hostname.toLowerCase() === OWNER_DOMAIN;
}

export function resolveTenantSlug(hostname: string = window.location.hostname): string {
  const lowerHost = hostname.toLowerCase();

  if (lowerHost === TENANT_BASE_DOMAIN) return 'default';
  if (!lowerHost.endsWith(TENANT_BASE_DOMAIN)) return 'default';

  const withoutBase = lowerHost.replace(`.${TENANT_BASE_DOMAIN}`, '');
  const [subdomain] = withoutBase.split('.');
  return subdomain || 'default';
}

export function isSystemOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  if (SYSTEM_OWNER_EMAILS.length === 0) return false;
  return SYSTEM_OWNER_EMAILS.includes(email.toLowerCase());
}

export function getEffectiveRole(options: {
  roles: AppRole[];
  email?: string | null;
  hostname?: string;
}): AppRole {
  const { roles, email, hostname } = options;
  const ownerDomain = isOwnerDomain(hostname);

  if (ownerDomain && roles.includes('SYSTEM_OWNER') && isSystemOwnerEmail(email)) {
    return 'SYSTEM_OWNER';
  }

  if (roles.includes('MASTER_TI')) return 'MASTER_TI';
  if (roles.includes('ADMIN')) return 'ADMIN';
  return 'USUARIO';
}

export function buildSecureSignupMetadata(options: {
  tenantId: string;
  tenantSlug: string;
  email: string;
  requestedRole?: AppRole;
}) {
  const { tenantId, tenantSlug, email, requestedRole } = options;

  return {
    tenant_id: tenantId,
    tenant_slug: tenantSlug,
    requested_role: requestedRole || 'USUARIO',
    email,
  };
}

export function getPostLoginPath(role: AppRole, hostname?: string): string {
  if (isOwnerDomain(hostname)) return '/';
  if (role === 'MASTER_TI') return '/master-ti';
  return '/dashboard';
}
