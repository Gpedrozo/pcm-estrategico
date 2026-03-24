import { describe, it, expect, beforeEach } from 'vitest';
import {
  isTenantBaseDomain,
  getNavigationType,
} from '@/lib/authSessionHelpers';

describe('authSessionHelpers', () => {

  describe('isTenantBaseDomain', () => {
    it('returns true for exact base domain', () => {
      expect(isTenantBaseDomain('gppis.com.br')).toBe(true);
    });

    it('returns true for www variant', () => {
      expect(isTenantBaseDomain('www.gppis.com.br')).toBe(true);
    });

    it('returns false for subdomain', () => {
      expect(isTenantBaseDomain('acme.gppis.com.br')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(isTenantBaseDomain('GPPIS.COM.BR')).toBe(true);
    });

    it('returns false for unrelated domain', () => {
      expect(isTenantBaseDomain('example.com')).toBe(false);
    });
  });

  describe('getNavigationType', () => {
    it('returns a string or null without throwing', () => {
      const result = getNavigationType();
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });
});
