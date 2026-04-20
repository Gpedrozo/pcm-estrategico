import { describe, it, expect } from 'vitest';
import {
  getTenantBaseDomain,
  isBaseTenantHost,
  isTenantSubdomainHost,
  resolveTenantHostSlug,
  getRetryCountFromSearch,
  isHandoffFailedSearch,
  buildTenantLoginUrl,
} from '@/lib/tenantLoginFlow';

describe('tenantLoginFlow', () => {
  describe('getTenantBaseDomain', () => {
    it('returns a non-empty string', () => {
      expect(getTenantBaseDomain()).toBeTruthy();
    });
  });

  describe('isBaseTenantHost', () => {
    const base = getTenantBaseDomain();

    it('returns true for exact base domain', () => {
      expect(isBaseTenantHost(base)).toBe(true);
    });

    it('returns true for www variant', () => {
      expect(isBaseTenantHost(`www.${base}`)).toBe(true);
    });

    it('returns false for subdomain', () => {
      expect(isBaseTenantHost(`acme.${base}`)).toBe(false);
    });

    it('returns false for unrelated domain', () => {
      expect(isBaseTenantHost('example.com')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(isBaseTenantHost(base.toUpperCase())).toBe(true);
    });
  });

  describe('isTenantSubdomainHost', () => {
    const base = getTenantBaseDomain();

    it('returns true for tenant subdomain', () => {
      expect(isTenantSubdomainHost(`empresa.${base}`)).toBe(true);
    });

    it('returns false for base domain', () => {
      expect(isTenantSubdomainHost(base)).toBe(false);
    });

    it('returns false for www', () => {
      expect(isTenantSubdomainHost(`www.${base}`)).toBe(false);
    });

    it('returns false for unrelated domain', () => {
      expect(isTenantSubdomainHost('empresa.other.com')).toBe(false);
    });
  });

  describe('resolveTenantHostSlug', () => {
    const base = getTenantBaseDomain();

    it('extracts slug from subdomain', () => {
      expect(resolveTenantHostSlug(`acme.${base}`)).toBe('acme');
    });

    it('returns null for base domain', () => {
      expect(resolveTenantHostSlug(base)).toBeNull();
    });

    it('returns null for unrelated domain', () => {
      expect(resolveTenantHostSlug('example.com')).toBeNull();
    });

    it('lowercases the slug', () => {
      expect(resolveTenantHostSlug(`AcMe.${base}`)).toBe('acme');
    });
  });

  describe('getRetryCountFromSearch', () => {
    it('returns 0 for empty search', () => {
      expect(getRetryCountFromSearch('')).toBe(0);
    });

    it('parses retry_count param', () => {
      expect(getRetryCountFromSearch('?retry_count=2')).toBe(2);
    });

    it('returns 0 for negative values', () => {
      expect(getRetryCountFromSearch('?retry_count=-1')).toBe(0);
    });

    it('returns 0 for NaN', () => {
      expect(getRetryCountFromSearch('?retry_count=abc')).toBe(0);
    });

    it('truncates fractional values', () => {
      expect(getRetryCountFromSearch('?retry_count=1.7')).toBe(1);
    });
  });

  describe('isHandoffFailedSearch', () => {
    it('returns false for empty search', () => {
      expect(isHandoffFailedSearch('')).toBe(false);
    });

    it('returns true when handoff_failed=1', () => {
      expect(isHandoffFailedSearch('?handoff_failed=1')).toBe(true);
    });

    it('returns false for other values', () => {
      expect(isHandoffFailedSearch('?handoff_failed=0')).toBe(false);
    });
  });

  describe('buildTenantLoginUrl', () => {
    it('builds URL with target host', () => {
      const url = buildTenantLoginUrl('acme.gppis.com.br', { protocol: 'https:' });
      expect(url).toContain('acme.gppis.com.br');
    });

    it('includes retry_count when specified', () => {
      const url = buildTenantLoginUrl('acme.gppis.com.br', {
        retryCount: 1,
        protocol: 'https:',
      });
      expect(url).toContain('retry_count=1');
    });

    it('includes handoff_failed flag', () => {
      const url = buildTenantLoginUrl('acme.gppis.com.br', {
        handoffFailed: true,
        protocol: 'https:',
      });
      expect(url).toContain('handoff_failed=1');
    });

    it('accepts safe relative next path', () => {
      const url = buildTenantLoginUrl('acme.gppis.com.br', {
        next: '/dashboard',
        protocol: 'https:',
      });
      expect(url).toContain('next=%2Fdashboard');
    });

    it('blocks protocol-relative open redirect (//evil.com)', () => {
      const url = buildTenantLoginUrl('acme.gppis.com.br', {
        next: '//evil.com',
        protocol: 'https:',
      });
      expect(url).not.toContain('next=');
    });

    it('blocks backslash redirect (/\\evil.com)', () => {
      const url = buildTenantLoginUrl('acme.gppis.com.br', {
        next: '/\\evil.com',
        protocol: 'https:',
      });
      expect(url).not.toContain('next=');
    });

    it('blocks absolute URL redirect', () => {
      const url = buildTenantLoginUrl('acme.gppis.com.br', {
        next: 'https://evil.com/steal',
        protocol: 'https:',
      });
      expect(url).not.toContain('next=');
    });
  });
});
