import { logger } from '@/lib/logger';

/**
 * Extracts the real error message from a Supabase Edge Function invocation.
 * When a function returns non-2xx, the SDK wraps it as a generic
 * "Edge Function returned a non-2xx status code" but the actual body
 * may be in `data`, `error.context`, or parseable from the error itself.
 */
export function extractEdgeFunctionError(
  error: { message?: string; context?: unknown } | null,
  data: unknown,
): string {
  // 1. Try data.error or data.message (our edge functions return { error: "..." })
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.error === 'string' && d.error) return d.error;
    if (typeof d.message === 'string' && d.message) return d.message;
  }

  // 2. Try error.context (Supabase SDK v2.x stores response body here)
  if (error?.context && typeof error.context === 'object') {
    const ctx = error.context as Record<string, unknown>;
    if (typeof ctx.error === 'string' && ctx.error) return ctx.error;
    if (typeof ctx.message === 'string' && ctx.message) return ctx.message;
    // context might be a Response object — can't read body synchronously
  }

  // 3. Fall back to error.message
  return error?.message || 'Erro desconhecido na edge function';
}

/**
 * Async version that also inspects Response-like `error.context`
 * via `json()`/`text()` when available.
 */
export async function extractEdgeFunctionErrorAsync(
  error: { message?: string; context?: unknown } | null,
  data: unknown,
): Promise<string> {
  const syncMsg = extractEdgeFunctionError(error, data);

  if (!error?.context || typeof error.context !== 'object') {
    return syncMsg;
  }

  const context = error.context as {
    clone?: () => unknown;
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
  };

  try {
    const jsonReader = typeof context.clone === 'function' ? context.clone() as { json?: () => Promise<unknown> } : context;
    if (typeof jsonReader?.json === 'function') {
      const parsed = await jsonReader.json();
      if (parsed && typeof parsed === 'object') {
        const p = parsed as Record<string, unknown>;
        const msg = String(p.error ?? p.message ?? '').trim();
        if (msg) return msg;
      }
    }
  } catch {
    // Ignore and try text fallback.
  }

  try {
    const textReader = typeof context.clone === 'function' ? context.clone() as { text?: () => Promise<string> } : context;
    if (typeof textReader?.text === 'function') {
      const text = String(await textReader.text()).trim();
      if (text) {
        try {
          const parsed = JSON.parse(text) as Record<string, unknown>;
          const msg = String(parsed?.error ?? parsed?.message ?? '').trim();
          if (msg) return msg;
        } catch {
          return text;
        }
      }
    }
  } catch {
    // Ignore and return sync fallback.
  }

  return syncMsg;
}

export function getSupabaseErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  if ('message' in error) return String((error as { message?: unknown }).message ?? '');
  return '';
}

export function isMissingTableError(error: unknown): boolean {
  const message = getSupabaseErrorMessage(error).toLowerCase();
  return (
    message.includes('could not find the table') ||
    message.includes('relation') && message.includes('does not exist') ||
    message.includes('schema cache') && message.includes('table')
  );
}

export function extractMissingColumnName(error: unknown): string | null {
  const message = getSupabaseErrorMessage(error);
  if (!message) return null;

  const schemaCacheMatch = message.match(/could not find the '([^']+)' column/i);
  if (schemaCacheMatch?.[1]) return schemaCacheMatch[1];

  const postgresMatch = message.match(/column\s+["']?([a-zA-Z0-9_]+)["']?\s+does not exist/i);
  if (postgresMatch?.[1]) return postgresMatch[1];

  return null;
}

export function compactObject<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as T;
}

export async function insertWithColumnFallback<T>(
  runInsert: (payload: Record<string, unknown>) => Promise<{ data: T | null; error: any }>,
  payload: Record<string, unknown>,
  maxAttempts = 25,
): Promise<T> {
  const currentPayload = { ...compactObject(payload) };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data, error } = await runInsert(currentPayload);
    if (!error && data) return data;

    const missingColumn = extractMissingColumnName(error);
    if (!missingColumn || !(missingColumn in currentPayload)) {
      throw error;
    }

    logger.warn('supabase_compat_column_dropped_insert', { column: missingColumn, attempt: attempt + 1 });
    delete currentPayload[missingColumn];
  }

  throw new Error('Não foi possível concluir a inserção por incompatibilidade de colunas.');
}

export async function updateWithColumnFallback<T>(
  runUpdate: (payload: Record<string, unknown>) => Promise<{ data: T | null; error: any }>,
  payload: Record<string, unknown>,
  maxAttempts = 25,
): Promise<T> {
  const currentPayload = { ...compactObject(payload) };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data, error } = await runUpdate(currentPayload);
    if (!error && data) return data;

    const missingColumn = extractMissingColumnName(error);
    if (!missingColumn || !(missingColumn in currentPayload)) {
      throw error;
    }

    logger.warn('supabase_compat_column_dropped_update', { column: missingColumn, attempt: attempt + 1 });
    delete currentPayload[missingColumn];
  }

  throw new Error('Não foi possível concluir a atualização por incompatibilidade de colunas.');
}
