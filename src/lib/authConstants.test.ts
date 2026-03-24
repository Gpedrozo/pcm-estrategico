import { describe, it, expect } from 'vitest';
import {
  TENANT_BASE_DOMAIN,
  IMPERSONATION_STORAGE_KEY,
  TAB_CLOSE_MARKER_STORAGE_KEY,
  SESSION_TRANSFER_REDIRECT_STORAGE_KEY,
  DEFAULT_INACTIVITY_TIMEOUT_MS,
  TAB_CLOSE_MARKER_MAX_AGE_MS,
  SESSION_TRANSFER_MAX_AGE_MS,
  SESSION_TRANSFER_REDIRECT_MAX_AGE_MS,
  LOGIN_PROFILE_TIMEOUT_MS,
  HYDRATION_TIMEOUT_MS,
  AUTH_REDIRECT_RETRY_MAX,
} from '@/lib/authConstants';

describe('authConstants', () => {
  it('TENANT_BASE_DOMAIN is a non-empty lowercase string', () => {
    expect(typeof TENANT_BASE_DOMAIN).toBe('string');
    expect(TENANT_BASE_DOMAIN.length).toBeGreaterThan(0);
    expect(TENANT_BASE_DOMAIN).toBe(TENANT_BASE_DOMAIN.toLowerCase());
  });

  it('storage keys are unique and namespaced', () => {
    const keys = [
      IMPERSONATION_STORAGE_KEY,
      TAB_CLOSE_MARKER_STORAGE_KEY,
      SESSION_TRANSFER_REDIRECT_STORAGE_KEY,
    ];
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
    keys.forEach((k) => expect(k).toContain('pcm.'));
  });

  it('timeouts are reasonable', () => {
    expect(DEFAULT_INACTIVITY_TIMEOUT_MS).toBeGreaterThanOrEqual(60_000);
    expect(DEFAULT_INACTIVITY_TIMEOUT_MS).toBeLessThanOrEqual(3_600_000);

    expect(TAB_CLOSE_MARKER_MAX_AGE_MS).toBeGreaterThan(0);
    expect(SESSION_TRANSFER_MAX_AGE_MS).toBeGreaterThan(0);
    expect(SESSION_TRANSFER_REDIRECT_MAX_AGE_MS).toBeGreaterThan(0);
    expect(LOGIN_PROFILE_TIMEOUT_MS).toBeGreaterThan(0);
    expect(HYDRATION_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('AUTH_REDIRECT_RETRY_MAX is a positive integer', () => {
    expect(Number.isInteger(AUTH_REDIRECT_RETRY_MAX)).toBe(true);
    expect(AUTH_REDIRECT_RETRY_MAX).toBeGreaterThan(0);
  });

  it('session transfer max age is shorter than tab close marker', () => {
    expect(SESSION_TRANSFER_MAX_AGE_MS).toBeLessThan(TAB_CLOSE_MARKER_MAX_AGE_MS);
  });
});
