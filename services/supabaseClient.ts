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


// ==================================================================
// 🚀 SHIFT DATA SERVICES (เชื่อมต่อ Database จริงแทน Mock Data)
// ==================================================================

// 1. ดึงงานด่วนที่เปิดให้แย่ง (status = 'bidding') สำหรับแท็บ "รับงานเพิ่ม (EXTRA_CASH)"
export const getShifts = async () => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('status', 'bidding') 
    .order('start_time', { ascending: true });

  if (error) {
    console.error('❌ Error fetching available shifts:', error);
    throw error;
  }
  return data || [];
};

// 2. ดึงตารางงานของพนักงานคนนี้ สำหรับแท็บ "ตารางงาน (SCHEDULE)"
export const getStaffShifts = async (userId: string) => {
  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      attendance_logs (*) 
    `) // 🚨 join ตาราง attendance_logs มาด้วย เพื่อให้ UI รู้ว่า Check-in ไปหรือยัง
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('❌ Error fetching staff shifts:', error);
    throw error;
  }
  return data || [];
};