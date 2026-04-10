/**
 * Supabase client mock reutilizável para smoke tests.
 * Não depende de variáveis de ambiente nem de rede.
 */
import { vi } from 'vitest';

/* ---------- helpers ---------- */
const noop = () => ({});
const resolvedData = (data: unknown = null) =>
  Promise.resolve({ data, error: null, count: null, status: 200, statusText: 'OK' });

/* ---------- chainable query builder ---------- */
function chainBuilder(resolvedPayload: unknown = []) {
  const chain: Record<string, unknown> = {};
  const methods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike',
    'is', 'in', 'contains', 'containedBy', 'range',
    'filter', 'not', 'or', 'and',
    'order', 'limit', 'single', 'maybeSingle',
    'csv', 'geojson', 'explain',
    'textSearch', 'match', 'overlaps',
  ];

  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }

  // Terminal – retorna Promise
  chain['then'] = vi.fn((resolve: (v: unknown) => void) =>
    resolve({ data: resolvedPayload, error: null }),
  );

  return chain;
}

/* ---------- mock client factory ---------- */
export function createMockSupabaseClient() {
  const authUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'test@gppis.com.br',
    app_metadata: { empresa_id: '00000000-0000-0000-0000-000000000099', role: 'ADMIN' },
    user_metadata: {},
  };

  const session = {
    access_token: 'mock-jwt',
    refresh_token: 'mock-refresh',
    user: authUser,
  };

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: authUser }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: noop } } }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session, user: authUser }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: authUser }, error: null }),
    },
    from: vi.fn().mockReturnValue(chainBuilder()),
    rpc: vi.fn().mockImplementation(() => resolvedData([])),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: noop }),
    }),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'mock' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://mock.url/file' } }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  };
}

/* ---------- singleton used by vi.mock ---------- */
export const mockSupabase = createMockSupabaseClient();
