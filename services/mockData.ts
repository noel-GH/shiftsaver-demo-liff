import { supabase } from './supabaseClient';
import { Shift, ShiftStatus, User, UserRole } from '../types';

// --- Helpers for Seed Data ---
const getToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const setDateHours = (date: Date, hours: number) => {
  const d = new Date(date);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
};

const today = getToday();

// --- Seed Data (Used to populate empty DB) ---
const SEED_USERS: Partial<User>[] = [
  {
    line_user_id: 'manager_mike',
    display_name: 'Manager Mike',
    role: UserRole.MANAGER,
    reliability_score: 100,
    is_active: true,
    avatar_url: 'https://picsum.photos/100/100?random=1'
  },
  {
    line_user_id: 'staff_sarah',
    display_name: 'Sarah Server',
    role: UserRole.STAFF,
    reliability_score: 95,
    is_active: true,
    avatar_url: 'https://picsum.photos/100/100?random=2'
  },
  {
    line_user_id: 'staff_john',
    display_name: 'John Cook',
    role: UserRole.STAFF,
    reliability_score: 88,
    is_active: true,
    avatar_url: 'https://picsum.photos/100/100?random=3'
  },
  {
    line_user_id: 'staff_emily',
    display_name: 'Emily Cashier',
    role: UserRole.STAFF,
    reliability_score: 92,
    is_active: true,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily'
  }
];

// --- Service Functions ---

export const getCurrentUser = async (role: UserRole, lineId?: string): Promise<User> => {
  if (lineId) {
    const { data } = await supabase.from('users').select('*').eq('line_user_id', lineId).single();
    if (data) return data;
  }
  
  const { data } = await supabase.from('users').select('*').eq('role', role).limit(1).single();
  if (data) return data;
  
  return {
    id: 'temp',
    line_user_id: 'temp',
    display_name: 'Guest',
    role: role,
    reliability_score: 100,
    is_active: true
  };
};

export const getAllStaff = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', UserRole.STAFF)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching staff:', error);
    return [];
  }
  return data || [];
};

export const getShifts = async (): Promise<Shift[]> => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*, user:users(*)')
    .neq('status', ShiftStatus.CANCELLED)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching shifts:', error);
    return [];
  }
  return data || [];
};

// Improved createShift to handle multiple slots in one call
export const createShift = async (shiftData: Partial<Shift>, slots: number = 1): Promise<{ success: boolean; error?: string }> => {
  const shiftsToInsert = Array.from({ length: Math.max(1, slots) }).map(() => ({
    ...shiftData,
    status: shiftData.user_id ? ShiftStatus.SCHEDULED : ShiftStatus.BIDDING,
    current_pay_rate: shiftData.current_pay_rate || shiftData.base_pay_rate,
  }));

  const { error } = await supabase
    .from('shifts')
    .insert(shiftsToInsert);

  if (error) {
    console.error('Error creating shift(s):', error);
    return { success: false, error: error.message };
  }
  return { success: true };
};

export const updateShift = async (shiftId: string, shiftData: Partial<Shift>): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('shifts')
    .update(shiftData)
    .match({ id: shiftId });

  if (error) {
    console.error('Error updating shift:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
};

// Enhanced Hard Delete with match() for better reliability
export const cancelShift = async (shiftId: string): Promise<{ success: boolean; error?: string }> => {
  console.log(`Attempting to delete shift: ${shiftId}`);
  
  const { error } = await supabase
    .from('shifts')
    .delete()
    .match({ id: shiftId });

  if (error) {
    console.error('Supabase Delete Error:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
};

export const triggerReplacement = async (shiftId: string): Promise<void> => {
  const { data: shift } = await supabase.from('shifts').select('*').eq('id', shiftId).single();
  if (!shift) throw new Error("Shift not found");

  const { error } = await supabase
    .from('shifts')
    .update({
      status: ShiftStatus.BIDDING,
      current_pay_rate: shift.base_pay_rate * 1.5,
      user_id: null
    })
    .eq('id', shiftId);

  if (error) throw error;
};

export const markShiftAsGhost = async (shiftId: string): Promise<void> => {
  const { error } = await supabase
    .from('shifts')
    .update({
      status: ShiftStatus.GHOSTED,
      user_id: null
    })
    .eq('id', shiftId);

  if (error) throw error;
};

export const acceptShift = async (shiftId: string, lineUserId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('handle-accept-shift', {
      body: { 
        shift_id: shiftId, 
        line_user_id: lineUserId 
      }
    });

    if (error) {
      console.error('Error invoking edge function:', error);
      return { success: false, message: "Connection Error" };
    }

    return {
      success: data?.success || false,
      message: data?.message || "Unexpected response from server"
    };
  } catch (err) {
    console.error("Critical error in acceptShift service:", err);
    return { success: false, message: "Connection Error" };
  }
};

export const getStaffShifts = async (userId: string): Promise<Shift[]> => {
  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      attendance_logs ( id, check_in_time, check_out_time )
    `)
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching staff shifts:', error);
    return [];
  }
  return data || [];
};

export const checkIn = async (shiftId: string, userId: string, lat: number, lng: number): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('attendance_logs')
    .insert({
      shift_id: shiftId,
      user_id: userId,
      check_in_time: new Date().toISOString(),
      gps_location: `${lat},${lng}`
    });

  if (error) {
    console.error('Error checking in:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
};

export const checkOut = async (logId: string): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('attendance_logs')
    .update({
      check_out_time: new Date().toISOString()
    })
    .eq('id', logId);

  if (error) {
    console.error('Error checking out:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
};

// --- SEED FUNCTION ---
export const seedDatabase = async () => {
  console.log("Seeding Database...");
  
  const { data: users, error: userError } = await supabase
    .from('users')
    .upsert(SEED_USERS, { onConflict: 'line_user_id' })
    .select();

  if (userError || !users) {
    console.error("Error seeding users:", userError);
    return;
  }

  const getUser = (namePart: string) => users.find(u => u.display_name.includes(namePart))?.id;

  const shiftsToInsert = [
    {
      user_id: getUser('Sarah'),
      start_time: setDateHours(today, 9),
      end_time: setDateHours(today, 15),
      status: ShiftStatus.CHECKED_IN,
      role_required: 'Server',
      base_pay_rate: 15.0,
      current_pay_rate: 15.0,
      location_name: 'Downtown Burger'
    },
    {
      user_id: getUser('John'),
      start_time: setDateHours(today, 11),
      end_time: setDateHours(today, 17),
      status: ShiftStatus.SCHEDULED,
      role_required: 'Cook',
      base_pay_rate: 18.0,
      current_pay_rate: 18.0,
      location_name: 'Downtown Burger'
    }
  ];

  const { error: shiftError } = await supabase.from('shifts').insert(shiftsToInsert);
  
  if (shiftError) console.error("Error seeding shifts:", shiftError);
  else alert("Database Seeded Successfully! Refreshing...");
};