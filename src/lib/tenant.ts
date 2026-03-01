export function getTenantSlugFromHostname(hostname: string): string | null {
  if (!hostname) return null;

  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0] || null;
  }

  return null;
}
