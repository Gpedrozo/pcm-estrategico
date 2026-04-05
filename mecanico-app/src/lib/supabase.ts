// ============================================================
// Supabase Client — React Native (Simple, Direct Connection)
// No Supabase Auth session — app uses custom mecanico auth
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dvwsferonoczgmvfubgu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2d3NmZXJvbm9jemdtdmZ1Ymd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MjUyODgsImV4cCI6MjA4NzMwMTI4OH0.6xSrHUtS0ag9ymjua75VKQygy2kiCGBjcczXMF65G44';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export { SUPABASE_URL, SUPABASE_ANON_KEY };
