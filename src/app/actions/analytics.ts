"use server";

import { createClient } from "@/utils/supabase/server";
import { DateRangeValue, getDateRangeBoundary } from "@/lib/analytics/definitions";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "ADMIN") throw new Error("Forbidden: Must be an administrator");

  return supabase;
}

export async function getDashboardAnalytics(range: DateRangeValue) {
  const supabase = await verifyAdmin();
  const boundary = getDateRangeBoundary(range);
  const boundaryIso = boundary ? boundary.toISOString() : null;

  // --- COMPLAINTS ---
  let cQuery = supabase.from("complaints").select("id, status, priority, category_id, created_at");
  if (boundaryIso) cQuery = cQuery.gte("created_at", boundaryIso);
  const { data: complaintsData } = await cQuery;
  const complaints = complaintsData || [];

  // Complaint KPIs
  const totalComplaints = complaints.length;
  const openComplaints = complaints.filter(c => !["RESOLVED", "REJECTED", "CLOSED"].includes(c.status)).length;
  const resolvedComplaints = complaints.filter(c => ["RESOLVED", "CLOSED"].includes(c.status)).length;
  const complaintResolutionRate = totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : null;

  // Complaint Distributions
  const complaintsByStatus = complaints.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const complaintsByPriority = complaints.reduce((acc, c) => {
    acc[c.priority] = (acc[c.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Categories Mapping
  const { data: categoriesData } = await supabase.from("complaint_categories").select("id, name");
  const categoriesMap = (categoriesData || []).reduce((acc, cat) => {
    acc[cat.id] = cat.name;
    return acc;
  }, {} as Record<string, string>);

  const complaintsByCategory = complaints.reduce((acc, c) => {
    const name = categoriesMap[c.category_id] || "Unknown";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // --- PICKUPS ---
  let pQuery = supabase.from("pickup_requests").select("id, status, waste_type_id, created_at");
  if (boundaryIso) pQuery = pQuery.gte("created_at", boundaryIso);
  const { data: pickupsData } = await pQuery;
  const pickups = pickupsData || [];

  // Pickup KPIs
  const totalPickups = pickups.length;
  const pendingPickups = pickups.filter(p => p.status === "PENDING").length;
  const completedPickups = pickups.filter(p => p.status === "COMPLETED").length;
  const failedPickups = pickups.filter(p => p.status === "FAILED").length;
  
  const eligibleForCompletion = totalPickups - pickups.filter(p => p.status === "CANCELLED" || p.status === "REJECTED").length;
  const pickupCompletionRate = eligibleForCompletion > 0 ? (completedPickups / eligibleForCompletion) * 100 : null;

  // Pickup Distributions
  const pickupsByStatus = pickups.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Waste Types Mapping
  const { data: wasteTypesData } = await supabase.from("waste_types").select("id, name");
  const wasteTypesMap = (wasteTypesData || []).reduce((acc, wt) => {
    acc[wt.id] = wt.name;
    return acc;
  }, {} as Record<string, string>);

  const pickupsByWasteType = pickups.reduce((acc, p) => {
    const name = wasteTypesMap[p.waste_type_id] || "Unknown";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // --- WORKFORCE ---
  const { data: activeCollectorsData } = await supabase.from("profiles").select("id, full_name").eq("role", "COLLECTOR").eq("status", "ACTIVE");
  const activeCollectors = activeCollectorsData || [];
  const totalActiveCollectors = activeCollectors.length;

  // Get tasks assigned to collectors
  let workloadQuery = supabase.from("complaints").select("assigned_collector_id, status").not("assigned_collector_id", "is", null);
  if (boundaryIso) workloadQuery = workloadQuery.gte("created_at", boundaryIso);
  const { data: wComplaints } = await workloadQuery;

  let wPickupsQuery = supabase.from("pickup_requests").select("assigned_collector_id, status").not("assigned_collector_id", "is", null);
  if (boundaryIso) wPickupsQuery = wPickupsQuery.gte("created_at", boundaryIso);
  const { data: wPickups } = await wPickupsQuery;

  const allAssignedTasks = [...(wComplaints || []), ...(wPickups || [])];
  
  const workforcePerformance = activeCollectors.map(collector => {
    const tasks = allAssignedTasks.filter(t => t.assigned_collector_id === collector.id);
    const assigned = tasks.length;
    const completed = tasks.filter(t => t.status === "RESOLVED" || t.status === "CLOSED" || t.status === "COMPLETED").length;
    const failed = tasks.filter(t => t.status === "FAILED").length;
    const inProgress = tasks.filter(t => t.status === "IN_PROGRESS").length;
    
    let completionRate = null;
    if (completed + failed > 0) {
      completionRate = (completed / (completed + failed)) * 100;
    }

    return {
      collectorName: collector.full_name,
      assigned,
      inProgress,
      completed,
      failed,
      completionRate
    };
  }).sort((a, b) => b.completed - a.completed);

  // --- TIME SERIES ---
  // Aggregate volume by day (YYYY-MM-DD)
  const timeSeriesMap: Record<string, { date: string; complaints: number; pickups: number }> = {};
  
  complaints.forEach(c => {
    const d = c.created_at.split("T")[0];
    if (!timeSeriesMap[d]) timeSeriesMap[d] = { date: d, complaints: 0, pickups: 0 };
    timeSeriesMap[d].complaints += 1;
  });

  pickups.forEach(p => {
    const d = p.created_at.split("T")[0];
    if (!timeSeriesMap[d]) timeSeriesMap[d] = { date: d, complaints: 0, pickups: 0 };
    timeSeriesMap[d].pickups += 1;
  });

  const timeSeries = Object.values(timeSeriesMap).sort((a, b) => a.date.localeCompare(b.date));

  // --- RESOLUTION TIME (Approximation using status history) ---
  let avgResolutionTimeHours = null;
  let resolvedWithHistoryCount = 0;
  
  if (resolvedComplaints > 0) {
    const resolvedIds = complaints.filter(c => c.status === "RESOLVED" || c.status === "CLOSED").map(c => c.id);
    // Fetch only history for these ids
    if (resolvedIds.length > 0) {
      const { data: historyData } = await supabase
        .from("complaint_status_history")
        .select("complaint_id, created_at")
        .in("status", ["RESOLVED"])
        .in("complaint_id", resolvedIds);
        
      if (historyData && historyData.length > 0) {
        let totalHours = 0;
        
        // Match history with original complaint to get duration
        historyData.forEach(h => {
          const comp = complaints.find(c => c.id === h.complaint_id);
          if (comp) {
            const start = new Date(comp.created_at).getTime();
            const end = new Date(h.created_at).getTime();
            const hours = (end - start) / (1000 * 60 * 60);
            if (hours >= 0) {
              totalHours += hours;
              resolvedWithHistoryCount++;
            }
          }
        });
        
        if (resolvedWithHistoryCount > 0) {
          avgResolutionTimeHours = totalHours / resolvedWithHistoryCount;
        }
      }
    }
  }

  // --- PICKUP COMPLETION TIME ---
  let avgPickupCompletionHours = null;
  let completedPickupsWithHistoryCount = 0;

  if (completedPickups > 0) {
    const completedIds = pickups.filter(p => p.status === "COMPLETED").map(p => p.id);
    if (completedIds.length > 0) {
      const { data: pHistoryData } = await supabase
        .from("pickup_status_history")
        .select("pickup_request_id, created_at")
        .in("status", ["COMPLETED"])
        .in("pickup_request_id", completedIds);
        
      if (pHistoryData && pHistoryData.length > 0) {
        let totalHours = 0;
        pHistoryData.forEach(h => {
          const p = pickups.find(x => x.id === h.pickup_request_id);
          if (p) {
            const start = new Date(p.created_at).getTime();
            const end = new Date(h.created_at).getTime();
            const hours = (end - start) / (1000 * 60 * 60);
            if (hours >= 0) {
              totalHours += hours;
              completedPickupsWithHistoryCount++;
            }
          }
        });
        
        if (completedPickupsWithHistoryCount > 0) {
          avgPickupCompletionHours = totalHours / completedPickupsWithHistoryCount;
        }
      }
    }
  }

  // --- FEEDBACK QUALITY ---
  let fQuery = supabase.from("feedback").select("rating, complaint_id, pickup_request_id");
  if (boundaryIso) fQuery = fQuery.gte("created_at", boundaryIso);
  const { data: feedbackData } = await fQuery;
  const feedbacks = feedbackData || [];

  const totalFeedback = feedbacks.length;
  const avgFeedbackRating = totalFeedback > 0 ? feedbacks.reduce((acc, f) => acc + f.rating, 0) / totalFeedback : null;
  const lowRatingCount = feedbacks.filter(f => f.rating <= 2).length;
  
  const cFeedback = feedbacks.filter(f => f.complaint_id);
  const avgComplaintRating = cFeedback.length > 0 ? cFeedback.reduce((acc, f) => acc + f.rating, 0) / cFeedback.length : null;
  
  const pFeedback = feedbacks.filter(f => f.pickup_request_id);
  const avgPickupRating = pFeedback.length > 0 ? pFeedback.reduce((acc, f) => acc + f.rating, 0) / pFeedback.length : null;

  return {
    kpis: {
      totalComplaints,
      openComplaints,
      resolvedComplaints,
      complaintResolutionRate,
      avgResolutionTimeHours,
      resolvedWithHistoryCount,
      totalPickups,
      pendingPickups,
      completedPickups,
      pickupCompletionRate,
      avgPickupCompletionHours,
      completedPickupsWithHistoryCount,
      totalActiveCollectors,
      totalFeedback,
      avgFeedbackRating,
      lowRatingCount,
      avgComplaintRating,
      avgPickupRating
    },
    distributions: {
      complaintsByStatus: Object.entries(complaintsByStatus).map(([name, value]) => ({ name, value })),
      complaintsByPriority: Object.entries(complaintsByPriority).map(([name, value]) => ({ name, value })),
      complaintsByCategory: Object.entries(complaintsByCategory).map(([name, value]) => ({ name, value })),
      pickupsByStatus: Object.entries(pickupsByStatus).map(([name, value]) => ({ name, value })),
      pickupsByWasteType: Object.entries(pickupsByWasteType).map(([name, value]) => ({ name, value }))
    },
    workforcePerformance,
    timeSeries
  };
}

export async function logExportAudit(range: string, exportType: string) {
  const supabase = await verifyAdmin();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "EXPORT_ANALYTICS",
      entity_type: "ANALYTICS",
      entity_id: "GLOBAL",
      details: { range, exportType }
    });
  }
}
