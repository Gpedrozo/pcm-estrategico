// ============================================================
// Supabase Client — React Native (Simple, Direct Connection)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://dvwsferonoczgmvfubgu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2d3NmZXJvbm9jemdtdmZ1Ymd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0MDU5NzUsImV4cCI6MjA1Mjk4MTk3NX0.tBvJFD-a8X3oJJHp1AP0OODV03sEeNjuZfb9t4Qfv9c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export { SUPABASE_URL, SUPABASE_ANON_KEY };
