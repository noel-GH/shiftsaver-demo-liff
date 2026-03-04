import { supabase } from './supabaseClient';
import { Shift, ShiftStatus, UserRole } from '../types';

// ------------------------------------------------------------------
// This service simulates the Next.js API Route: /api/cron/notify-ghosts
// ------------------------------------------------------------------

export const notifyGhostsCron = async () => {
  console.log("🔄 CRON START: Checking for ghosted shifts...");

  try {
    // Invoke the Edge Function provided by the user
    // The user mentioned the URL ends in /line-bot
    const { data, error: invokeError } = await supabase.functions.invoke('line-bot', {
      body: { 
        action: 'notify-ghosts'
      }
    });

    if (invokeError) {
      console.error("Edge function invocation error:", invokeError);
      return { success: false, error: invokeError.message };
    }

    console.log("✅ Edge function response:", data);
    return { 
      success: data?.success || false, 
      notified_count: data?.notified_count || 0 
    };
  } catch (err: any) {
    console.error("Critical error in notifyGhostsCron:", err);
    return { success: false, error: err.message };
  }
};

export const notifySingleShift = async (shiftId: string) => {
  console.log(`🔄 NOTIFY SINGLE: Checking shift ${shiftId}...`);

  try {
    const { data, error: invokeError } = await supabase.functions.invoke('line-bot', {
      body: { 
        action: 'notify-ghosts',
        shift_id: shiftId 
      }
    });

    if (invokeError) {
      console.error("Edge function invocation error:", invokeError);
      return { success: false, error: invokeError.message };
    }

    return { success: data?.success || false };
  } catch (err: any) {
    console.error("Critical error in notifySingleShift:", err);
    return { success: false, error: err.message };
  }
};
