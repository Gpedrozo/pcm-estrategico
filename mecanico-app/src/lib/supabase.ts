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

export { SUPABASE_URL, SUPABASE_ANON_KEY };
