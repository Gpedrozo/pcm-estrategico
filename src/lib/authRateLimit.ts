const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const LOGIN_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const LOGIN_RATE_LIMIT_BLOCK_MS = 15 * 60 * 1000;

const LOGIN_RATE_LIMIT_KEY = 'pcm.auth.login.rate_limit.v1';

export type LoginRateLimitEntry = {
  attempts: number[];
  blockedUntil: number;
};

export function normalizeLoginRateLimitKey(email: string) {
  return email.trim().toLowerCase();
}

export function loadLoginRateLimitState(): Record<string, LoginRateLimitEntry> {
  try {
    const raw = window.localStorage.getItem(LOGIN_RATE_LIMIT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LoginRateLimitEntry>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLoginRateLimitState(state: Record<string, LoginRateLimitEntry>) {
  try {
    window.localStorage.setItem(LOGIN_RATE_LIMIT_KEY, JSON.stringify(state));
  } catch {
    // noop
  }
}

export function getLoginRateLimitStatus(email: string) {
  const now = Date.now();
  const key = normalizeLoginRateLimitKey(email);
  const state = loadLoginRateLimitState();
  const entry = state[key];

  if (!entry) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  const attempts = (entry.attempts ?? []).filter((ts) => now - ts <= LOGIN_RATE_LIMIT_WINDOW_MS);
  const blockedUntil = Number(entry.blockedUntil ?? 0);
  const blocked = blockedUntil > now;

  state[key] = { attempts, blockedUntil };
  saveLoginRateLimitState(state);

  return {
    blocked,
    retryAfterSeconds: blocked ? Math.max(1, Math.ceil((blockedUntil - now) / 1000)) : 0,
  };
}

export function registerFailedLoginAttempt(email: string) {
  const now = Date.now();
  const key = normalizeLoginRateLimitKey(email);
  const state = loadLoginRateLimitState();
  const current = state[key] ?? { attempts: [], blockedUntil: 0 };
  const attempts = (current.attempts ?? []).filter((ts) => now - ts <= LOGIN_RATE_LIMIT_WINDOW_MS);
  attempts.push(now);

  let blockedUntil = Number(current.blockedUntil ?? 0);
  if (attempts.length >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    blockedUntil = now + LOGIN_RATE_LIMIT_BLOCK_MS;
  }

  state[key] = {
    attempts,
    blockedUntil,
  };
  saveLoginRateLimitState(state);

  return {
    blockedUntil,
    attemptsCount: attempts.length,
  };
}

export function resetLoginRateLimit(email: string) {
  const key = normalizeLoginRateLimitKey(email);
  const state = loadLoginRateLimitState();
  if (!state[key]) return;
  delete state[key];
  saveLoginRateLimitState(state);
}
