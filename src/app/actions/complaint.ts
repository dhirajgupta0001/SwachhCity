"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { sendNotification, notifyAdmins } from "@/utils/notifications";

export async function submitComplaint(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const categoryId = formData.get("categoryId") as string;
  const description = formData.get("description") as string;
  const address = formData.get("address") as string;
  const latitude = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
  const longitude = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;
  
  if (!categoryId || !description || !address) {
    throw new Error("Missing required fields");
  }

  // 1. Insert Complaint
  const { data: complaint, error: complaintError } = await supabase
    .from("complaints")
    .insert({
      citizen_id: user.id,
      category_id: categoryId,
      description,
      address,
      latitude,
      longitude,
      priority: "MEDIUM", // Default
      status: "NEW" // Server enforced
    })
    .select()
    .single();

  if (complaintError || !complaint) {
    console.error("Complaint error", complaintError);
    throw new Error("Failed to create complaint.");
  }

  // 2. Upload Photos & Insert Photo records
  const files = formData.getAll("photos") as File[];
  
  for (const file of files) {
    if (file && file.size > 0 && file.size <= 5 * 1024 * 1024) { // 5MB limit
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${complaint.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("complaint-evidence")
        .upload(filePath, file);

      if (!uploadError) {
        await supabase.from("complaint_photos").insert({
          complaint_id: complaint.id,
          storage_path: filePath,
          original_filename: file.name,
          content_type: file.type
        });
      }
    }
  }

  // Send Notifications
  await sendNotification(
    supabase,
    user.id,
    "COMPLAINT_SUBMITTED",
    "Complaint Submitted",
    `Your complaint (${complaint.reference_id}) has been successfully submitted and is under review.`,
    "COMPLAINT",
    complaint.id
  );

  await notifyAdmins(
    supabase,
    "URGENT_COMPLAINT",
    "New Complaint Received",
    `A new complaint (${complaint.reference_id}) has been submitted.`,
    "COMPLAINT",
    complaint.id
  );

  revalidatePath("/dashboard");
  revalidatePath("/history");
  
  // Return the newly created complaint reference ID to show in UI
  return { success: true, referenceId: complaint.reference_id };
}
