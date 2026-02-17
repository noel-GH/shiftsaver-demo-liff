import { supabase } from './supabaseClient';
import { Shift, ShiftStatus, UserRole } from '../types';

// ------------------------------------------------------------------
// This service simulates the Next.js API Route: /api/cron/notify-ghosts
// ------------------------------------------------------------------

export const notifyGhostsCron = async () => {
  console.log("🔄 CRON START: Checking for ghosted shifts...");

  // 1. Configuration - Loaded from Environment Variables
  const getEnv = (key: string) => (import.meta as any).env?.[key] || '';

  const LINE_CHANNEL_ACCESS_TOKEN = getEnv('VITE_LINE_CHANNEL_ACCESS_TOKEN');
  const LIFF_BASE_URL = getEnv('VITE_LIFF_BASE_URL');

  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error("❌ Missing VITE_LINE_CHANNEL_ACCESS_TOKEN in environment variables.");
    return { success: false, error: "Server Configuration Error: Missing Line Token" };
  }

  // 2. Query Database
  // Fetch shifts where status is 'ghosted' AND is_notified is FALSE (or null)
  const { data: ghostShifts, error: shiftError } = await supabase
    .from('shifts')
    .select('*')
    .eq('status', ShiftStatus.GHOSTED)
    .not('is_notified', 'eq', true);

  if (shiftError) {
    console.error("Database Error (Shifts):", shiftError);
    return { success: false, error: shiftError.message };
  }

  if (!ghostShifts || ghostShifts.length === 0) {
    console.log("✅ No new ghost shifts detected.");
    return { success: true, notified_count: 0 };
  }

  // Fetch all staff members to notify
  const { data: staffMembers, error: userError } = await supabase
    .from('users')
    .select('line_user_id')
    .eq('role', UserRole.STAFF)
    .eq('is_active', true);

  if (userError || !staffMembers || staffMembers.length === 0) {
    console.error("Database Error (Users):", userError);
    return { success: false, error: "No staff found to notify" };
  }

  const staffLineIds = staffMembers.map(u => u.line_user_id).filter(id => id && id !== 'temp');
  console.log(`📢 Target Audience: ${staffLineIds.length} staff members.`);

  // 3. Loop & Send (The Logic)
  let notifiedCount = 0;

  for (const shift of ghostShifts) {
    // Construct LINE Flex Message (JSON)
    const flexMessage = {
      type: "flex",
      altText: "🚨 URGENT: Shift Opportunity Available!",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#ef4444", // Red Alert
          paddingAll: "lg",
          contents: [
            {
              type: "text",
              text: "GHOST DETECTED! 👻",
              weight: "bold",
              color: "#ffffff",
              size: "lg",
              align: "center"
            }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            {
              type: "text",
              text: "A shift has been abandoned. Fill it now for extra pay!",
              wrap: true,
              size: "sm",
              color: "#666666"
            },
            {
              type: "separator",
              margin: "md"
            },
            {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              margin: "md",
              contents: [
                {
                  type: "box",
                  layout: "baseline",
                  contents: [
                    { type: "text", text: "Role", color: "#aaaaaa", size: "sm", flex: 2 },
                    { type: "text", text: shift.role_required, weight: "bold", color: "#333333", size: "sm", flex: 4 }
                  ]
                },
                {
                  type: "box",
                  layout: "baseline",
                  contents: [
                    { type: "text", text: "Time", color: "#aaaaaa", size: "sm", flex: 2 },
                    { type: "text", text: `${new Date(shift.start_time).getHours()}:00 - ${new Date(shift.end_time).getHours()}:00`, weight: "bold", color: "#333333", size: "sm", flex: 4 }
                  ]
                },
                {
                  type: "box",
                  layout: "baseline",
                  contents: [
                    { type: "text", text: "Rate", color: "#aaaaaa", size: "sm", flex: 2 },
                    { type: "text", text: `1.5x ($${shift.current_pay_rate}/hr)`, weight: "bold", color: "#ef4444", size: "sm", flex: 4 }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#ef4444",
              height: "sm",
              action: {
                type: "uri",
                label: "ACCEPT SHIFT",
                uri: `${LIFF_BASE_URL}/accept/${shift.id}`
              }
            }
          ]
        }
      }
    };

    // Simulate sending via LINE Messaging API
    // In a real backend: await axios.post('https://api.line.me/v2/bot/message/multicast', { to: staffLineIds, messages: [flexMessage] }, headers...);
    
    console.group(`🚀 SENDING NOTIFICATION FOR SHIFT ${shift.id.slice(0,4)}`);
    console.log("To:", staffLineIds);
    console.log("Payload:", JSON.stringify(flexMessage, null, 2));
    console.groupEnd();

    // 4. Update Database
    // Mark as notified to prevent spamming
    const { error: updateError } = await supabase
      .from('shifts')
      .update({ 
        is_notified: true,
        status: ShiftStatus.BIDDING // Ensure it's open for bidding now that we notified
      })
      .eq('id', shift.id);

    if (updateError) {
      console.error("Failed to update shift status:", updateError);
    } else {
      notifiedCount++;
    }
  }

  console.log(`✅ CRON FINISHED. Notified about ${notifiedCount} shifts.`);
  return { success: true, notified_count: notifiedCount };
};