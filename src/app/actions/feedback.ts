"use server";

import { createClient } from "@/utils/supabase/server";

export async function submitFeedback(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const ratingStr = formData.get("rating") as string;
  const rating = parseInt(ratingStr, 10);
  const comment = (formData.get("comment") as string || "").trim().substring(0, 1000);
  
  const complaint_id = formData.get("complaint_id") as string | null;
  const pickup_request_id = formData.get("pickup_request_id") as string | null;

  if (isNaN(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }

  if ((!complaint_id && !pickup_request_id) || (complaint_id && pickup_request_id)) {
    throw new Error("Feedback must reference exactly one operation (complaint or pickup).");
  }

  // 1. Verify eligibility
  if (complaint_id) {
    const { data: comp, error: cErr } = await supabase.from("complaints")
      .select("status, citizen_id")
      .eq("id", complaint_id).single();
    
    if (cErr || !comp) throw new Error("Complaint not found.");
    if (comp.citizen_id !== user.id) throw new Error("Unauthorized operation.");
    if (!["RESOLVED", "CLOSED"].includes(comp.status)) throw new Error("Complaint must be resolved before rating.");
    
    // 2. Check duplicate
    const { data: existing } = await supabase.from("feedback")
      .select("id")
      .eq("complaint_id", complaint_id)
      .eq("citizen_id", user.id).single();
      
    if (existing) throw new Error("Feedback already submitted for this complaint.");

  } else if (pickup_request_id) {
    const { data: pick, error: pErr } = await supabase.from("pickup_requests")
      .select("status, citizen_id")
      .eq("id", pickup_request_id).single();
      
    if (pErr || !pick) throw new Error("Pickup request not found.");
    if (pick.citizen_id !== user.id) throw new Error("Unauthorized operation.");
    if (pick.status !== "COMPLETED") throw new Error("Pickup must be completed before rating.");

    // 2. Check duplicate
    const { data: existing } = await supabase.from("feedback")
      .select("id")
      .eq("pickup_request_id", pickup_request_id)
      .eq("citizen_id", user.id).single();
      
    if (existing) throw new Error("Feedback already submitted for this pickup.");
  }

  // 3. Insert Feedback
  const { error } = await supabase.from("feedback").insert({
    citizen_id: user.id,
    complaint_id: complaint_id || null,
    pickup_request_id: pickup_request_id || null,
    rating,
    comment: comment || null
  });

  if (error) throw new Error(error.message);
}

export async function getFeedbackForOperation(type: "COMPLAINT" | "PICKUP", id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const column = type === "COMPLAINT" ? "complaint_id" : "pickup_request_id";
  
  const { data, error } = await supabase.from("feedback")
    .select("*")
    .eq(column, id)
    .eq("citizen_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching feedback:", error.message);
    return null;
  }
  return data;
}

// --- ADMIN ACTIONS ---

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "ADMIN") throw new Error("Forbidden: Must be an administrator");

  return { supabase, user };
}

export async function getAdminFeedback() {
  const { supabase } = await verifyAdmin();
  
  const { data, error } = await supabase.from("feedback")
    .select(`
      *,
      complaint:complaints(reference_id),
      pickup:pickup_requests(reference_id)
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Transform data to standardize operation ref
  return (data || []).map(f => {
    const isComplaint = !!f.complaint_id;
    return {
      ...f,
      type: isComplaint ? "COMPLAINT" : "PICKUP",
      reference_id: isComplaint ? f.complaint?.reference_id : f.pickup?.reference_id,
      status: f.admin_response ? "Addressed" : (f.rating <= 2 ? "Requires Review" : "New")
    };
  });
}

export async function addAdminResponse(feedbackId: string, response: string) {
  const { supabase, user } = await verifyAdmin();
  
  const cleanResponse = response.trim().substring(0, 1000);
  if (!cleanResponse) throw new Error("Response cannot be empty.");

  const { data: existing, error: existErr } = await supabase.from("feedback")
    .select("citizen_id, complaint_id, pickup_request_id")
    .eq("id", feedbackId)
    .single();

  if (existErr || !existing) throw new Error("Feedback not found.");

  const { error } = await supabase.from("feedback").update({
    admin_response: cleanResponse,
    responded_by: user.id,
    responded_at: new Date().toISOString()
  }).eq("id", feedbackId);

  if (error) throw new Error(error.message);

  // Trigger Notification to citizen
  const typeStr = existing.complaint_id ? "complaint" : "pickup request";
  await supabase.from("notifications").insert({
    user_id: existing.citizen_id,
    title: "Admin responded to your feedback",
    message: `An administrator has responded to your feedback regarding your ${typeStr}.`,
    type: "SYSTEM",
    link_url: existing.complaint_id ? `/history/${existing.complaint_id}` : `/history/pickup/${existing.pickup_request_id}`
  });

  // Audit log
  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "RESPOND_FEEDBACK",
    entity_type: "FEEDBACK",
    entity_id: feedbackId,
    details: { response_length: cleanResponse.length }
  });
}

export async function logFeedbackExport() {
  const { supabase, user } = await verifyAdmin();
  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "EXPORT_FEEDBACK",
    entity_type: "FEEDBACK",
    entity_id: "GLOBAL",
    details: {}
  });
}
