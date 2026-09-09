import { SupabaseClient, createClient as createSupabaseClient } from "@supabase/supabase-js";

// Helper to get service role client
function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("Missing SUPABASE_SERVICE_ROLE_KEY. Notifications will fail silently.");
    return null;
  }
  
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

export async function sendNotification(
  _ignoredAuthClient: SupabaseClient, // Kept for backwards compatibility in existing actions
  recipientId: string,
  type: string,
  title: string,
  message: string,
  entityType?: "COMPLAINT" | "PICKUP" | "USER",
  entityId?: string
) {
  const serviceClient = getServiceRoleClient();
  if (!serviceClient) return;

  const { error } = await serviceClient.from("notifications").insert({
    recipient_id: recipientId,
    type,
    title,
    message,
    related_entity_type: entityType || null,
    related_entity_id: entityId || null
  });

  if (error) {
    console.error(`Failed to send notification to ${recipientId}:`, error);
  }
}

export async function notifyAdmins(
  supabase: SupabaseClient,
  type: string,
  title: string,
  message: string,
  entityType?: "COMPLAINT" | "PICKUP" | "USER",
  entityId?: string
) {
  // Fetch active admins
  const { data: admins, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "ADMIN")
    .eq("status", "ACTIVE");

  if (error || !admins) return;

  // Dispatch to all admins
  await Promise.all(
    admins.map(admin =>
      sendNotification(supabase, admin.id, type, title, message, entityType, entityId)
    )
  );
}
