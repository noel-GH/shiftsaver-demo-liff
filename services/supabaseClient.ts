import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// 🔐 SECURITY UPDATE: Using Environment Variables
// ------------------------------------------------------------------

// Use safe access pattern for Vite environment variables
const getEnv = (key: string) => (import.meta as any).env?.[key] || '';

export const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("⚠️ Supabase credentials missing. Check your .env file or Vercel Environment Variables.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);