"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/utils/notifications";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "ADMIN") throw new Error("Forbidden: Must be an administrator");

  return { supabase, user };
}

async function logAudit(supabase: any, actorId: string, action: string, entityType: string, entityId: string, details: any = {}) {
  await supabase.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details
  });
}

export async function assignComplaint(complaintId: string, collectorId: string) {
  const { supabase, user } = await verifyAdmin();

  // Get complaint to find citizen
  const { data: complaint } = await supabase.from("complaints").select("citizen_id, reference_id").eq("id", complaintId).single();

  const { error } = await supabase.from("complaints")
    .update({ status: "ASSIGNED", assigned_collector_id: collectorId })
    .eq("id", complaintId);
  if (error) throw new Error("Failed to assign complaint");

  await supabase.from("complaint_status_history").insert({
    complaint_id: complaintId,
    status: "ASSIGNED",
    notes: "Assigned to collector by municipal admin.",
    changed_by: user.id
  });

  await logAudit(supabase, user.id, "ASSIGN_COMPLAINT", "COMPLAINT", complaintId, { collector_id: collectorId });

  // Notifications
  if (complaint) {
    await sendNotification(supabase, complaint.citizen_id, "COMPLAINT_ASSIGNED", "Complaint Assigned", `A collector has been assigned to your complaint (${complaint.reference_id}).`, "COMPLAINT", complaintId);
    await sendNotification(supabase, collectorId, "TASK_ASSIGNED", "New Task Assigned", `You have been assigned a new complaint task (${complaint.reference_id}).`, "COMPLAINT", complaintId);
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/complaints");
  revalidatePath(`/admin/complaints/${complaintId}`);
  return { success: true };
}

export async function approvePickup(pickupId: string) {
  const { supabase, user } = await verifyAdmin();

  const { data: pickup } = await supabase.from("pickup_requests").select("citizen_id, reference_id").eq("id", pickupId).single();

  const { error } = await supabase.from("pickup_requests")
    .update({ status: "APPROVED" })
    .eq("id", pickupId);
  if (error) throw new Error("Failed to approve pickup");

  await supabase.from("pickup_status_history").insert({
    pickup_request_id: pickupId,
    status: "APPROVED",
    notes: "Approved by municipal admin.",
    changed_by: user.id
  });

  await logAudit(supabase, user.id, "APPROVE_PICKUP", "PICKUP_REQUEST", pickupId);

  if (pickup) {
    await sendNotification(supabase, pickup.citizen_id, "PICKUP_APPROVED", "Pickup Approved", `Your pickup request (${pickup.reference_id}) has been approved.`, "PICKUP", pickupId);
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/pickups");
  revalidatePath(`/admin/pickups/${pickupId}`);
  return { success: true };
}

export async function assignPickup(pickupId: string, collectorId: string, scheduledDate?: string) {
  const { supabase, user } = await verifyAdmin();

  const { data: pickup } = await supabase.from("pickup_requests").select("citizen_id, reference_id, assigned_collector_id, scheduled_at").eq("id", pickupId).single();

  const updatePayload: any = { 
    status: scheduledDate ? "SCHEDULED" : "ASSIGNED", 
    assigned_collector_id: collectorId 
  };
  
  if (scheduledDate) {
    updatePayload.scheduled_at = new Date(scheduledDate).toISOString();
  }

  const { error } = await supabase.from("pickup_requests").update(updatePayload).eq("id", pickupId);
  if (error) throw new Error("Failed to assign pickup");

  await supabase.from("pickup_status_history").insert({
    pickup_request_id: pickupId,
    status: updatePayload.status,
    notes: `Assigned to collector ${scheduledDate ? 'and scheduled' : ''} by municipal admin.`,
    changed_by: user.id
  });

  await logAudit(supabase, user.id, "ASSIGN_PICKUP", "PICKUP_REQUEST", pickupId, { collector_id: collectorId, scheduled_at: scheduledDate });

  if (pickup) {
    // Notify Citizen
    let msg = `A collector has been assigned to your pickup (${pickup.reference_id}).`;
    if (scheduledDate) msg += ` It is officially scheduled for ${new Date(scheduledDate).toLocaleDateString()}.`;
    await sendNotification(supabase, pickup.citizen_id, "PICKUP_ASSIGNED", "Pickup Assigned & Scheduled", msg, "PICKUP", pickupId);

    // Notify Collector
    if (pickup.assigned_collector_id && pickup.assigned_collector_id !== collectorId) {
      // Reassignment
      await sendNotification(supabase, pickup.assigned_collector_id, "TASK_REASSIGNED", "Task Reassigned", `A pickup task (${pickup.reference_id}) has been reassigned to another collector.`, "PICKUP", pickupId);
      await sendNotification(supabase, collectorId, "TASK_ASSIGNED", "New Task Assigned", `You have been reassigned to a pickup task (${pickup.reference_id}).`, "PICKUP", pickupId);
    } else {
      await sendNotification(supabase, collectorId, "TASK_ASSIGNED", "New Task Assigned", `You have been assigned a new pickup task (${pickup.reference_id}).`, "PICKUP", pickupId);
    }
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/pickups");
  revalidatePath(`/admin/pickups/${pickupId}`);
  return { success: true };
}

export async function updateUserRole(targetUserId: string, newRole: "CITIZEN" | "COLLECTOR" | "ADMIN") {
  const { supabase, user } = await verifyAdmin();

  if (newRole !== "ADMIN") {
    const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "ADMIN").eq("status", "ACTIVE");
    if (count && count <= 1) {
      const { data: targetProfile } = await supabase.from("profiles").select("role").eq("id", targetUserId).single();
      if (targetProfile?.role === "ADMIN") throw new Error("Cannot remove the last active administrator.");
    }
  }

  const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", targetUserId);
  if (error) throw new Error("Failed to update user role");

  await logAudit(supabase, user.id, "UPDATE_USER_ROLE", "USER", targetUserId, { new_role: newRole });

  await sendNotification(supabase, targetUserId, "ACCOUNT_STATUS_CHANGED", "Role Updated", `Your account role has been updated to ${newRole}.`);

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  return { success: true };
}

export async function updateUserStatus(targetUserId: string, newStatus: "ACTIVE" | "SUSPENDED" | "DISABLED") {
  const { supabase, user } = await verifyAdmin();

  if (newStatus !== "ACTIVE") {
    const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "ADMIN").eq("status", "ACTIVE");
    if (count && count <= 1) {
      const { data: targetProfile } = await supabase.from("profiles").select("role").eq("id", targetUserId).single();
      if (targetProfile?.role === "ADMIN") throw new Error("Cannot disable or suspend the last active administrator.");
    }
  }

  const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", targetUserId);
  if (error) throw new Error("Failed to update user status");

  await logAudit(supabase, user.id, "UPDATE_USER_STATUS", "USER", targetUserId, { new_status: newStatus });

  // Note: if disabled, they can't log in to see the notification, but it's recorded anyway.
  await sendNotification(supabase, targetUserId, "ACCOUNT_STATUS_CHANGED", "Account Status Updated", `Your account status has been changed to ${newStatus}.`);

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  return { success: true };
}

export async function adminUpdateTaskStatus(taskId: string, taskType: "COMPLAINT" | "PICKUP", newStatus: string, notes: string) {
  const { supabase, user } = await verifyAdmin();

  const table = taskType === "COMPLAINT" ? "complaints" : "pickup_requests";
  const historyTable = taskType === "COMPLAINT" ? "complaint_status_history" : "pickup_status_history";
  const idCol = taskType === "COMPLAINT" ? "complaint_id" : "pickup_request_id";

  const { data: task } = await supabase.from(table).select("citizen_id, reference_id, assigned_collector_id").eq("id", taskId).single();

  const { error } = await supabase.from(table).update({ status: newStatus }).eq("id", taskId);
  if (error) throw new Error("Failed to override task status");

  await supabase.from(historyTable).insert({
    [idCol]: taskId,
    status: newStatus,
    notes: notes || "Status updated administratively.",
    changed_by: user.id
  });

  await logAudit(supabase, user.id, "ADMIN_STATUS_OVERRIDE", taskType, taskId, { new_status: newStatus, notes });

  if (task) {
    await sendNotification(supabase, task.citizen_id, "SYSTEM_ALERT", "Task Status Overridden", `An administrator has updated your ${taskType.toLowerCase()} (${task.reference_id}) to ${newStatus}.`, taskType, taskId);
    if (task.assigned_collector_id) {
      await sendNotification(supabase, task.assigned_collector_id, "TASK_CANCELLED", "Task Updated Administratively", `A task assigned to you (${task.reference_id}) was administratively updated to ${newStatus}.`, taskType, taskId);
    }
  }

  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/${taskType.toLowerCase()}s`);
  revalidatePath(`/admin/${taskType.toLowerCase()}s/${taskId}`);
  return { success: true };
}
