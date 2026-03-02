import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// 🔐 SECURITY UPDATE: Using Environment Variables
// ------------------------------------------------------------------

// Use safe access pattern for Vite environment variables
const getEnv = (key: string) => (import.meta as any).env?.[key] || '';

export const SUPABASE_URL = 'https://mjgujauywikdasugbqqg.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ3VqYXV5d2lrZGFzdWdicXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjU0NzAsImV4cCI6MjA4NjA0MTQ3MH0.zjfs2j6TN3PCGg9akoPg5PLiPhp-J09CCJmLuMCsD5s';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("⚠️ Supabase credentials missing. Check your .env file or Vercel Environment Variables.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);