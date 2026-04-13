/**
 * Lote 2-D / Item 2.11
 * Testes da lógica de rate-limiting do edge function auth-login
 *
 * Estratégia mista:
 *   (a) Análise estática: verifica que as constantes e patterns de bloqueio
 *       estão corretamente definidos no código-fonte do edge function
 *   (b) Lógica pura: recria a função de decisão de bloqueio isolada e a testa
 *       como unidade (sem dependência de rede ou Supabase)
 *
 * Comportamentos garantidos:
 *   - MAX_ATTEMPTS = 5 → na 5ª tentativa falha: 429
 *   - BLOCK_MS = 15 min → blocked_until é setado corretamente
 *   - Storage error (tabela login_attempts ausente) → 429 fail-closed (não permite login)
 *   - blocked_until no futuro → 429 imediato sem tentar signIn
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const EDGE_FN_PATH = path.resolve(
  __dirname,
  '../../supabase/functions/auth-login/index.ts',
);

function readEdgeFunction(): string {
  return fs.readFileSync(EDGE_FN_PATH, 'utf-8');
}

// ─── Reimplementação isolada das constantes e lógica pura ────────────────────

const WINDOW_MS = 5 * 60 * 1000;   // 5 min
const BLOCK_MS  = 15 * 60 * 1000;  // 15 min
const MAX_ATTEMPTS = 5;

interface AttemptRecord {
  attempt_count: number;
  window_start: string | null;
  blocked_until: string | null;
}

/**
 * Replica exatamente a lógica de decisão do auth-login:
 * dado o estado atual e que o signIn falhou, calcula o próximo estado
 * e se deve bloquear (retornar 429).
 */
function computeNextRateLimitState(
  current: AttemptRecord | null,
  now: number,
): {
  nextAttemptCount: number;
  shouldBlock: boolean;
  nextBlockedUntil: string | null;
  nextWindowStart: string;
} {
  const windowStartMs = current?.window_start
    ? new Date(current.window_start).getTime()
    : now;
  const isWindowExpired = now - windowStartMs > WINDOW_MS;

  const nextAttemptCount = isWindowExpired
    ? 1
    : Number(current?.attempt_count ?? 0) + 1;

  const shouldBlock = nextAttemptCount >= MAX_ATTEMPTS;
  const nextBlockedUntil = shouldBlock
    ? new Date(now + BLOCK_MS).toISOString()
    : null;

  return {
    nextAttemptCount,
    shouldBlock,
    nextBlockedUntil,
    nextWindowStart: new Date(isWindowExpired ? now : windowStartMs).toISOString(),
  };
}

function isCurrentlyBlocked(current: AttemptRecord | null, now: number): boolean {
  if (!current?.blocked_until) return false;
  return new Date(current.blocked_until).getTime() > now;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('auth-login — análise estática das constantes de rate-limit', () => {
  it('MAX_ATTEMPTS está definido como 5', () => {
    const src = readEdgeFunction();
    expect(src).toContain('MAX_ATTEMPTS = 5');
  });

  it('WINDOW_MS está definido como 5 minutos', () => {
    const src = readEdgeFunction();
    // 5 * 60 * 1000
    expect(src).toMatch(/WINDOW_MS\s*=\s*5\s*\*\s*60\s*\*\s*1000/);
  });

  it('BLOCK_MS está definido como 15 minutos', () => {
    const src = readEdgeFunction();
    // 15 * 60 * 1000
    expect(src).toMatch(/BLOCK_MS\s*=\s*15\s*\*\s*60\s*\*\s*1000/);
  });

  it('blocked_until é verificado antes de tentar o signIn (fail-locked)', () => {
    const src = readEdgeFunction();
    // blocked_until deve aparecer antes de signInWithPassword no fluxo
    const blockedIdx = src.indexOf('blockedUntilMs > now');
    const signInIdx  = src.indexOf('await signInWithPassword');
    expect(blockedIdx).toBeGreaterThan(-1);
    expect(signInIdx).toBeGreaterThan(-1);
    expect(blockedIdx).toBeLessThan(signInIdx);
  });

  it('storage error retorna 429 fail-closed', () => {
    const src = readEdgeFunction();
    // Deve ter um bloco que verifica fetchError e retorna 429 sem tentar login
    expect(src).toContain('fetchError');
    expect(src).toMatch(/fetchError[^}]*429/s);
  });

  it('upsert de login_attempts usa onConflict "email,ip_address"', () => {
    const src = readEdgeFunction();
    expect(src).toContain('onConflict: "email,ip_address"');
  });

  it('LoginSchema valida email e password com limites máximos', () => {
    const src = readEdgeFunction();
    expect(src).toMatch(/email.*max\(255\)/s);
    expect(src).toMatch(/password.*max\(128\)/s);
  });
});

describe('auth-login — lógica pura de rate-limit (unit)', () => {
  const NOW = Date.now();

  it('primeira tentativa falha: attempt_count = 1, não bloqueia', () => {
    const result = computeNextRateLimitState(null, NOW);
    expect(result.nextAttemptCount).toBe(1);
    expect(result.shouldBlock).toBe(false);
    expect(result.nextBlockedUntil).toBeNull();
  });

  it('4ª tentativa falha: attempt_count = 4, ainda não bloqueia', () => {
    const windowStart = new Date(NOW - 60_000).toISOString(); // 1 min atrás
    const result = computeNextRateLimitState(
      { attempt_count: 3, window_start: windowStart, blocked_until: null },
      NOW,
    );
    expect(result.nextAttemptCount).toBe(4);
    expect(result.shouldBlock).toBe(false);
  });

  it('5ª tentativa falha: shouldBlock = true, blocked_until definido', () => {
    const windowStart = new Date(NOW - 60_000).toISOString();
    const result = computeNextRateLimitState(
      { attempt_count: 4, window_start: windowStart, blocked_until: null },
      NOW,
    );
    expect(result.nextAttemptCount).toBe(5);
    expect(result.shouldBlock).toBe(true);
    expect(result.nextBlockedUntil).not.toBeNull();

    const blockedUntilMs = new Date(result.nextBlockedUntil!).getTime();
    const expectedBlockEnd = NOW + BLOCK_MS;
    // Tolerância de 1 segundo
    expect(Math.abs(blockedUntilMs - expectedBlockEnd)).toBeLessThan(1000);
  });

  it('blocked_until expirado: janela reinicia (isWindowExpired = true)', () => {
    // Chamada anterior dentro da janela → deve resetar
    const oldWindow = new Date(NOW - WINDOW_MS - 1000).toISOString(); // expirou
    const result = computeNextRateLimitState(
      { attempt_count: 4, window_start: oldWindow, blocked_until: null },
      NOW,
    );
    // Janela expirou → recome do 1
    expect(result.nextAttemptCount).toBe(1);
    expect(result.shouldBlock).toBe(false);
  });

  it('isCurrentlyBlocked: retorna true quando blocked_until está no futuro', () => {
    const blocked_until = new Date(NOW + 300_000).toISOString(); // 5 min no futuro
    expect(isCurrentlyBlocked(
      { attempt_count: 5, window_start: null, blocked_until },
      NOW,
    )).toBe(true);
  });

  it('isCurrentlyBlocked: retorna false quando blocked_until está no passado', () => {
    const blocked_until = new Date(NOW - 1000).toISOString(); // 1 s no passado
    expect(isCurrentlyBlocked(
      { attempt_count: 5, window_start: null, blocked_until },
      NOW,
    )).toBe(false);
  });

  it('isCurrentlyBlocked: retorna false quando não há blocked_until', () => {
    expect(isCurrentlyBlocked(null, NOW)).toBe(false);
    expect(isCurrentlyBlocked({ attempt_count: 0, window_start: null, blocked_until: null }, NOW)).toBe(false);
  });

  it('BLOCK_MS cobre exatamente 900 segundos (15 min)', () => {
    expect(BLOCK_MS / 1000).toBe(900);
  });
});
