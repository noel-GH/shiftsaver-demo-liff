
export enum UserRole {
  MANAGER = 'manager',
  STAFF = 'staff'
}

export enum ShiftStatus {
  SCHEDULED = 'scheduled',
  CHECKED_IN = 'checked_in',
  COMPLETED = 'completed',
  GHOSTED = 'ghosted',
  BIDDING = 'bidding',
  FILLED = 'filled',
  CANCELLED = 'cancelled'
}

export interface User {
  id: string;
  created_at?: string;
  line_user_id: string;
  display_name: string;
  avatar_url?: string;
  role: UserRole;
  phone_number?: string;
  reliability_score: number;
  is_active: boolean;
  current_rich_menu_id?: string;
}

export interface Shift {
  id: string;
  created_at?: string;
  user_id?: string; // Can be null if ghosted or bidding
  user?: User; // Joined user data
  start_time: string; // ISO string
  end_time: string; // ISO string
  status: ShiftStatus;
  role_required: string;
  base_pay_rate: number;
  current_pay_rate: number;
  location_name: string;
  is_notified?: boolean; // New field to track if LINE alert was sent
}

export interface AttendanceLog {
  id: string;
  shift_id: string;
  user_id: string;
  check_in_time?: string;
  check_out_time?: string;
  gps_location?: string;
  notes?: string;
}
