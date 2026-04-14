// ============================================================
// Supabase Client — React Native
// Global singleton starts as anon; after device binding we call
// setGlobalAuth() to upgrade it to `authenticated` role via JWT.
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL) {
  console.warn('[supabase] EXPO_PUBLIC_SUPABASE_URL not set. Set it in .env or app.json extra.');
}
if (!SUPABASE_ANON_KEY) {
  console.warn('[supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY not set. Set it in .env or app.json extra.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

/** Create a one-off client that carries a JWT in the Authorization header. */
export function createAuthenticatedClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

/**
 * Upgrade the global singleton from anon → authenticated.
 * After this call every `supabase.from(...)` query uses the JWT.
 */
export async function setGlobalAuth(accessToken: string, refreshToken: string): Promise<void> {
  await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
}

/** Drop the session so the global client reverts to anon. */
export async function clearGlobalAuth(): Promise<void> {
  await supabase.auth.signOut().catch(() => {});
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };