// ============================================================
// Supabase Client — React Native (with SecureStore for tokens)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = 'https://dvwsferonoczgmvfubgu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2d3NmZXJvbm9jemdtdmZ1Ymd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MDU5NzUsImV4cCI6MjA1Mjk4MTk3NX0.tBvJFD-a8X3oJJHp1AP0OODV03sEeNjuZfb9t4Qfv9c';

const SecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // SecureStore can fail on emulators
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Create a Supabase client with an explicit access token in the Authorization header.
 * Uses a custom fetch wrapper to FORCE the Bearer token on every request,
 * bypassing supabase-js auth module which otherwise overrides the header with the anon key.
 */
export function createAuthenticatedClient(accessToken: string) {
  const customFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('apikey', SUPABASE_ANON_KEY);
    return fetch(input, { ...init, headers });
  };

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      fetch: customFetch,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };
