import { describe, expect, it } from 'vitest';
import { getTenantSlugFromHostname } from '@/lib/tenant';

describe('getTenantSlugFromHostname', () => {
  it('returns tenant slug for subdomains', () => {
    expect(getTenantSlugFromHostname('acme.sistema.com')).toBe('acme');
  });

  it('returns null for localhost-like hosts', () => {
    expect(getTenantSlugFromHostname('localhost')).toBeNull();
    expect(getTenantSlugFromHostname('127.0.0.1')).toBeNull();
  });

  it('returns null when host has no subdomain', () => {
    expect(getTenantSlugFromHostname('sistema.com')).toBeNull();
  });
});
