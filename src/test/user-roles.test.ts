import { describe, expect, it } from 'vitest';
import { getEffectiveRole } from '@/utils/userRoles';

describe('getEffectiveRole', () => {
  it('returns USUARIO when there are no roles', () => {
    expect(getEffectiveRole([])).toBe('USUARIO');
    expect(getEffectiveRole(null)).toBe('USUARIO');
  });

  it('returns the highest privilege role when multiple roles exist', () => {
    expect(
      getEffectiveRole([
        { role: 'USUARIO' },
        { role: 'ADMIN' },
      ])
    ).toBe('ADMIN');

    expect(
      getEffectiveRole([
        { role: 'ADMIN' },
        { role: 'MASTER_TI' },
      ])
    ).toBe('MASTER_TI');
  });
});
