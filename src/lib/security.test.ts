import { describe, expect, it } from 'vitest';
import { getEffectiveRole } from '@/lib/security';

describe('getEffectiveRole', () => {
  it('returns SYSTEM_OWNER when role is SYSTEM_OWNER', () => {
    const role = getEffectiveRole({
      roles: ['SYSTEM_OWNER'],
      hostname: 'tenant.gppis.com.br',
    });

    expect(role).toBe('SYSTEM_OWNER');
  });

  it('returns SYSTEM_OWNER even when email is not provided', () => {
    const role = getEffectiveRole({
      roles: ['SYSTEM_OWNER'],
      hostname: 'tenant.gppis.com.br',
    });

    expect(role).toBe('SYSTEM_OWNER');
  });

  it('does not return SYSTEM_OWNER when user has no SYSTEM_OWNER role', () => {
    const role = getEffectiveRole({
      roles: ['ADMIN'],
      email: 'gustavus82@gmail.com',
      hostname: 'tenant.gppis.com.br',
    });

    expect(role).toBe('ADMIN');
  });
});
