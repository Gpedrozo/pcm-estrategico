import { describe, expect, it } from 'vitest';
import { getEffectiveRole } from '@/lib/security';

describe('getEffectiveRole', () => {
  it('returns SYSTEM_OWNER for gustavus82@gmail.com when role is SYSTEM_OWNER', () => {
    const role = getEffectiveRole({
      roles: ['SYSTEM_OWNER'],
      email: 'gustavus82@gmail.com',
      hostname: 'tenant.gppis.com.br',
    });

    expect(role).toBe('SYSTEM_OWNER');
  });
});
