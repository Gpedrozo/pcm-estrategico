import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeLoginRateLimitKey,
  getLoginRateLimitStatus,
  registerFailedLoginAttempt,
} from '@/lib/authRateLimit';

const RATE_LIMIT_KEY = 'pcm.auth.login.rate_limit.v1';

// Mock localStorage since jsdom may not fully support it
const store = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
  removeItem: vi.fn((key: string) => { store.delete(key); }),
  clear: vi.fn(() => { store.clear(); }),
  get length() { return store.size; },
  key: vi.fn((_i: number) => null),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

describe('authRateLimit', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  describe('normalizeLoginRateLimitKey', () => {
    it('lowercases and trims email', () => {
      expect(normalizeLoginRateLimitKey('  User@Test.COM  ')).toBe('user@test.com');
    });
  });

  describe('getLoginRateLimitStatus', () => {
    it('returns not blocked for unknown email', () => {
      const status = getLoginRateLimitStatus('new@test.com');
      expect(status.blocked).toBe(false);
      expect(status.retryAfterSeconds).toBe(0);
    });

    it('returns not blocked after less than 5 failures', () => {
      for (let i = 0; i < 4; i++) {
        registerFailedLoginAttempt('user@test.com');
      }
      const status = getLoginRateLimitStatus('user@test.com');
      expect(status.blocked).toBe(false);
    });

    it('blocks after 5 failures within window', () => {
      for (let i = 0; i < 5; i++) {
        registerFailedLoginAttempt('user@test.com');
      }
      const status = getLoginRateLimitStatus('user@test.com');
      expect(status.blocked).toBe(true);
      expect(status.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('is case-insensitive for email matching', () => {
      for (let i = 0; i < 5; i++) {
        registerFailedLoginAttempt('User@TEST.com');
      }
      const status = getLoginRateLimitStatus('user@test.com');
      expect(status.blocked).toBe(true);
    });
  });

  describe('registerFailedLoginAttempt', () => {
    it('accumulates attempts in localStorage', () => {
      registerFailedLoginAttempt('test@email.com');
      registerFailedLoginAttempt('test@email.com');
      const raw = window.localStorage.getItem('pcm.auth.login.rate_limit.v1');
      expect(raw).toBeTruthy();
      const state = JSON.parse(raw!);
      expect(state['test@email.com'].attempts).toHaveLength(2);
    });

    it('sets blockedUntil after reaching threshold', () => {
      for (let i = 0; i < 5; i++) {
        registerFailedLoginAttempt('block@test.com');
      }
      const raw = window.localStorage.getItem('pcm.auth.login.rate_limit.v1');
      const state = JSON.parse(raw!);
      expect(state['block@test.com'].blockedUntil).toBeGreaterThan(Date.now());
    });

    it('handles corrupted localStorage gracefully', () => {
      window.localStorage.setItem('pcm.auth.login.rate_limit.v1', 'not-json');
      expect(() => registerFailedLoginAttempt('test@email.com')).not.toThrow();
    });
  });
});
