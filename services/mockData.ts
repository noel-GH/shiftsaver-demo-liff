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
    avatar_url: 'https://picsum.photos/100/100?random=4'
  }
];

// --- Service Functions ---

export const getCurrentUser = async (role: UserRole, lineId?: string): Promise<User> => {
  if (lineId) {
    // Try to find by LINE ID
    const { data } = await supabase.from('users').select('*').eq('line_user_id', lineId).single();
    if (data) return data;
  }
  
  // Fallback: Fetch the first user with the requested role for simulation
  const { data } = await supabase.from('users').select('*').eq('role', role).limit(1).single();
  if (data) return data;
  
  // Last resort fallback if DB is empty
  return {
    id: 'temp',
    line_user_id: 'temp',
    display_name: 'Guest',
    role: role,
    reliability_score: 100,
    is_active: true
  };
};

export const getShifts = async (): Promise<Shift[]> => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*, user:users(*)');

  if (error) {
    console.error('Error fetching shifts:', error);
    return [];
  }
  return data || [];
};

export const triggerReplacement = async (shiftId: string): Promise<void> => {
  // 1. Fetch current shift to get base rate
  const { data: shift } = await supabase.from('shifts').select('*').eq('id', shiftId).single();
  if (!shift) throw new Error("Shift not found");

  // 2. Update status and pay rate
  const { error } = await supabase
    .from('shifts')
    .update({
      status: ShiftStatus.BIDDING,
      current_pay_rate: shift.base_pay_rate * 1.5, // 1.5x surge
      user_id: null // Unassign the ghost
    })
    .eq('id', shiftId);

  if (error) throw error;
};

export const markShiftAsGhost = async (shiftId: string): Promise<void> => {
  const { error } = await supabase
    .from('shifts')
    .update({
      status: ShiftStatus.GHOSTED,
      user_id: null // Unassign the user immediately
    })
    .eq('id', shiftId);

  if (error) throw error;
};

/**
 * Accepts a shift using a Supabase RPC function for atomic safety.
 * Returns an object with success status and a message.
 */
export const acceptShift = async (shiftId: string, lineUserId: string): Promise<{ success: boolean; message: string }> => {
  const { data, error } = await supabase.rpc('accept_shift', {
    target_shift_id: shiftId,
    actor_line_id: lineUserId
  });

  if (error) {
    console.error('Error accepting shift RPC:', error);
    return { success: false, message: "System Error: Failed to communicate with server." };
  }

  // Expecting { success: boolean, message: string } from the RPC
  return data as { success: boolean; message: string };
};

// --- SEED FUNCTION ---
export const seedDatabase = async () => {
  console.log("Seeding Database...");
  
  // 1. Insert Users
  const { data: users, error: userError } = await supabase
    .from('users')
    .upsert(SEED_USERS, { onConflict: 'line_user_id' })
    .select();

  if (userError || !users) {
    console.error("Error seeding users:", userError);
    return;
  }

  console.log("Users seeded:", users);

  // Helper to find user ID by role/name
  const getUser = (namePart: string) => users.find(u => u.display_name.includes(namePart))?.id;

  // 2. Create Shifts linked to real User IDs
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
    },
    {
      user_id: getUser('Emily'),
      start_time: setDateHours(today, 8),
      end_time: setDateHours(today, 14),
      status: ShiftStatus.GHOSTED,
      role_required: 'Cashier',
      base_pay_rate: 14.0,
      current_pay_rate: 14.0,
      location_name: 'Downtown Burger'
    },
    {
      user_id: null, // Open for bidding
      start_time: setDateHours(today, 17),
      end_time: setDateHours(today, 23),
      status: ShiftStatus.BIDDING,
      role_required: 'Server',
      base_pay_rate: 15.0,
      current_pay_rate: 22.5,
      location_name: 'Downtown Burger'
    }
  ];

  const { error: shiftError } = await supabase.from('shifts').insert(shiftsToInsert);
  
  if (shiftError) console.error("Error seeding shifts:", shiftError);
  else alert("Database Seeded Successfully! Refreshing...");
};