"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { sendNotification, notifyAdmins } from "@/utils/notifications";

export async function updateTaskStatus(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "COLLECTOR") throw new Error("Forbidden: Must be a collector");

  const taskId = formData.get("taskId") as string;
  const taskType = formData.get("taskType") as "COMPLAINT" | "PICKUP";
  const newStatus = formData.get("newStatus") as string;
  const notes = formData.get("notes") as string;

  if (!taskId || !taskType || !newStatus) {
    throw new Error("Missing required fields");
  }

  const table = taskType === "COMPLAINT" ? "complaints" : "pickup_requests";
  const historyTable = taskType === "COMPLAINT" ? "complaint_status_history" : "pickup_status_history";
  const historyTaskColumn = taskType === "COMPLAINT" ? "complaint_id" : "pickup_request_id";

  const { data: task, error: fetchErr } = await supabase
    .from(table)
    .select("status, assigned_collector_id, citizen_id, reference_id")
    .eq("id", taskId)
    .single();

  if (fetchErr || !task) throw new Error("Task not found");
  if (task.assigned_collector_id !== user.id) throw new Error("Task is not assigned to you");

  const currentStatus = task.status;
  let isValid = false;

  if (taskType === "COMPLAINT") {
    if (currentStatus === "ASSIGNED" && newStatus === "IN_PROGRESS") isValid = true;
    if (currentStatus === "IN_PROGRESS" && (newStatus === "RESOLVED" || newStatus === "FAILED")) isValid = true;
  } else {
    if ((currentStatus === "ASSIGNED" || currentStatus === "SCHEDULED") && newStatus === "IN_PROGRESS") isValid = true;
    if (currentStatus === "IN_PROGRESS" && (newStatus === "COMPLETED" || newStatus === "FAILED")) isValid = true;
  }

  if (!isValid) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
  }

  const updateData: any = { status: newStatus };
  if (newStatus === "RESOLVED" || newStatus === "COMPLETED") {
    updateData[taskType === "COMPLAINT" ? "resolved_at" : "completed_at"] = new Date().toISOString();
  }
  if (notes && taskType === "COMPLAINT" && newStatus === "RESOLVED") {
    updateData.resolution_notes = notes;
  }

  const { error: updateErr } = await supabase.from(table).update(updateData).eq("id", taskId);
  if (updateErr) throw new Error("Failed to update task status");

  await supabase.from(historyTable).insert({
    [historyTaskColumn]: taskId,
    status: newStatus,
    notes: notes || `Marked as ${newStatus} by collector`,
    changed_by: user.id
  });

  const files = formData.getAll("photos") as File[];
  for (const file of files) {
    if (file && file.size > 0 && file.size <= 5 * 1024 * 1024) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${taskId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("collection-evidence")
        .upload(filePath, file);

      if (!uploadError) {
        await supabase.from("collection_evidence").insert({
          task_id: taskId,
          task_type: taskType,
          storage_path: filePath,
          original_filename: file.name,
          content_type: file.type,
          uploaded_by: user.id
        });
      }
    }
  }

  // NOTIFICATIONS
  const citizenEventBase = taskType === "COMPLAINT" ? "COMPLAINT" : "PICKUP";
  let title = "";
  let message = "";
  
  if (newStatus === "IN_PROGRESS") {
    title = `${taskType === "COMPLAINT" ? "Complaint" : "Pickup"} In Progress`;
    message = `Your ${taskType.toLowerCase()} (${task.reference_id}) is now being handled by the collector.`;
  } else if (newStatus === "RESOLVED" || newStatus === "COMPLETED") {
    title = `${taskType === "COMPLAINT" ? "Complaint Resolved" : "Pickup Completed"}`;
    message = `Your ${taskType.toLowerCase()} (${task.reference_id}) has been marked as ${newStatus.toLowerCase()}.`;
  } else if (newStatus === "FAILED") {
    title = `Collection Failed`;
    message = `We were unable to complete your ${taskType.toLowerCase()} (${task.reference_id}). Please check the request details.`;
    
    // Notify admins about failure
    await notifyAdmins(
      supabase,
      "FAILED_COLLECTION",
      "Collection Task Failed",
      `A collector reported a failure for task ${task.reference_id}. Reason: ${notes}`,
      taskType,
      taskId
    );
  }

  if (title) {
    await sendNotification(
      supabase,
      task.citizen_id,
      `${citizenEventBase}_${newStatus}`,
      title,
      message,
      taskType,
      taskId
    );
  }

  revalidatePath("/collector/dashboard");
  revalidatePath("/collector/tasks");
  revalidatePath(`/collector/tasks/${taskType.toLowerCase()}/${taskId}`);

  return { success: true };
}
