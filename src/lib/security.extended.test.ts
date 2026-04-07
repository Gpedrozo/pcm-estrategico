import { describe, it, expect } from 'vitest';
import {
  isOwnerDomain,
  resolveEmpresaSlug,
  normalizeRole,
  getEffectiveRole,
} from '@/lib/security';

describe('security – extended coverage', () => {
  describe('isOwnerDomain', () => {
    it('detects owner domain', () => {
      expect(isOwnerDomain('owner.gppis.com.br')).toBe(true);
    });

    it('detects www prefix of owner domain', () => {
      expect(isOwnerDomain('www.owner.gppis.com.br')).toBe(true);
    });

    it('rejects unrelated domain', () => {
      expect(isOwnerDomain('example.com')).toBe(false);
    });

    it('rejects tenant subdomain', () => {
      expect(isOwnerDomain('acme.gppis.com.br')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(isOwnerDomain('OWNER.GPPIS.COM.BR')).toBe(true);
    });
  });

  describe('resolveEmpresaSlug', () => {
    it('returns default for base domain', () => {
      expect(resolveEmpresaSlug('gppis.com.br')).toBe('default');
    });

    it('returns default for www base', () => {
      expect(resolveEmpresaSlug('www.gppis.com.br')).toBe('default');
    });

    it('returns slug for valid subdomain', () => {
      expect(resolveEmpresaSlug('acme.gppis.com.br')).toBe('acme');
    });

    it('returns default for unrelated domain', () => {
      expect(resolveEmpresaSlug('example.com')).toBe('default');
    });

    it('lowercases slug', () => {
      expect(resolveEmpresaSlug('AcMe.gppis.com.br')).toBe('acme');
    });
  });

  describe('normalizeRole', () => {
    it('normalizes ADMIN', () => {
      expect(normalizeRole('admin')).toBe('ADMIN');
    });

    it('normalizes SYSTEM_OWNER', () => {
      expect(normalizeRole('system_owner')).toBe('SYSTEM_OWNER');
    });

    it('handles hyphenated role', () => {
      expect(normalizeRole('master-ti')).toBe('MASTER_TI');
    });

    it('handles spaces', () => {
      expect(normalizeRole('system owner')).toBe('SYSTEM_OWNER');
    });

    it('returns null for unknown role', () => {
      expect(normalizeRole('SUPERUSER')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(normalizeRole('')).toBeNull();
    });

    it('returns null for null/undefined', () => {
      expect(normalizeRole(null)).toBeNull();
      expect(normalizeRole(undefined)).toBeNull();
    });
  });

  describe('getEffectiveRole – hierarchy', () => {
    it('returns SYSTEM_OWNER as highest priority', () => {
      expect(getEffectiveRole({ roles: ['ADMIN', 'SYSTEM_OWNER', 'USUARIO'] })).toBe('SYSTEM_OWNER');
    });

    it('returns SYSTEM_ADMIN over ADMIN', () => {
      expect(getEffectiveRole({ roles: ['ADMIN', 'SYSTEM_ADMIN'] })).toBe('SYSTEM_ADMIN');
    });

    it('returns MASTER_TI over ADMIN', () => {
      expect(getEffectiveRole({ roles: ['ADMIN', 'MASTER_TI'] })).toBe('MASTER_TI');
    });

    it('maps OWNER to ADMIN (higher than MANAGER)', () => {
      expect(getEffectiveRole({ roles: ['MANAGER', 'OWNER'] })).toBe('ADMIN');
    });

    it('maps MANAGER to ADMIN (higher than PLANNER)', () => {
      expect(getEffectiveRole({ roles: ['PLANNER', 'MANAGER'] })).toBe('ADMIN');
    });

    it('maps PLANNER to USUARIO (higher priority than TECHNICIAN)', () => {
      expect(getEffectiveRole({ roles: ['TECHNICIAN', 'PLANNER'] })).toBe('USUARIO');
    });

    it('returns TECHNICIAN over SOLICITANTE', () => {
      expect(getEffectiveRole({ roles: ['SOLICITANTE', 'TECHNICIAN'] })).toBe('TECHNICIAN');
    });

    it('defaults to USUARIO for empty roles', () => {
      expect(getEffectiveRole({ roles: [] })).toBe('USUARIO');
    });

    it('returns ADMIN when only ADMIN is provided', () => {
      expect(getEffectiveRole({ roles: ['ADMIN'] })).toBe('ADMIN');
    });

    it('maps VIEWER to USUARIO', () => {
      expect(getEffectiveRole({ roles: ['VIEWER'] })).toBe('USUARIO');
    });
  });
});
