"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { sendNotification, notifyAdmins } from "@/utils/notifications";

export async function submitPickupRequest(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const wasteTypeId = formData.get("wasteTypeId") as string;
  const description = formData.get("description") as string;
  const quantity = formData.get("quantity") as string;
  const address = formData.get("address") as string;
  const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
  const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;
  const preferredDate = formData.get("preferredDate") as string;
  const preferredTimeWindow = formData.get("preferredTimeWindow") as string;
  
  if (!wasteTypeId || !description || !quantity || !address || !preferredDate || !preferredTimeWindow) {
    throw new Error("Missing required fields");
  }

  const reqDate = new Date(preferredDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (reqDate < today) {
    throw new Error("Preferred date cannot be in the past.");
  }

  const { data: pickup, error: pickupError } = await supabase
    .from("pickup_requests")
    .insert({
      citizen_id: user.id,
      waste_type_id: wasteTypeId,
      description,
      quantity,
      address,
      latitude,
      longitude,
      preferred_date: preferredDate,
      preferred_time_window: preferredTimeWindow,
      status: "PENDING"
    })
    .select()
    .single();

  if (pickupError || !pickup) {
    console.error("Pickup creation error:", pickupError);
    throw new Error("Failed to create pickup request.");
  }

  // Notify Citizen
  await sendNotification(
    supabase,
    user.id,
    "PICKUP_SUBMITTED",
    "Pickup Request Submitted",
    `Your pickup request (${pickup.reference_id}) has been received and is awaiting approval.`,
    "PICKUP",
    pickup.id
  );

  // Notify Admins
  await notifyAdmins(
    supabase,
    "NEW_PICKUP_REQUEST",
    "New Pickup Request",
    `A new pickup request (${pickup.reference_id}) requires approval.`,
    "PICKUP",
    pickup.id
  );

  revalidatePath("/dashboard");
  revalidatePath("/history");
  
  return { success: true, referenceId: pickup.reference_id };
}

export async function cancelPickupRequest(pickupId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: existingReq, error: fetchErr } = await supabase
    .from("pickup_requests")
    .select("status, citizen_id, reference_id")
    .eq("id", pickupId)
    .single();

  if (fetchErr || !existingReq) throw new Error("Request not found.");
  if (existingReq.citizen_id !== user.id) throw new Error("Unauthorized.");
  if (existingReq.status !== "PENDING" && existingReq.status !== "APPROVED") {
    throw new Error("Request cannot be cancelled in its current status.");
  }

  const { error: updateErr } = await supabase
    .from("pickup_requests")
    .update({ status: "CANCELLED" })
    .eq("id", pickupId)
    .eq("citizen_id", user.id);

  if (updateErr) throw new Error("Failed to cancel request.");

  await supabase.from("pickup_status_history").insert({
    pickup_request_id: pickupId,
    status: "CANCELLED",
    notes: "Cancelled by citizen.",
    changed_by: user.id
  });

  await sendNotification(
    supabase,
    user.id,
    "PICKUP_CANCELLED",
    "Pickup Request Cancelled",
    `You have successfully cancelled pickup request ${existingReq.reference_id}.`,
    "PICKUP",
    pickupId
  );

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath(`/history/pickup/${pickupId}`);

  return { success: true };
}
