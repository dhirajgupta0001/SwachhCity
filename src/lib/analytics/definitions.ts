/**
 * Analytics Data Definitions
 * 
 * Open Complaints:
 * Complaints not in a final state (not RESOLVED, REJECTED, or CLOSED).
 * 
 * Resolved Complaints:
 * Complaints whose current status is RESOLVED or CLOSED.
 * 
 * Pending Pickups:
 * Pickups whose current status is PENDING.
 * 
 * Completed Pickups:
 * Pickups whose current status is COMPLETED.
 * 
 * Active Collector:
 * Profile with role 'COLLECTOR' and status 'ACTIVE'.
 * 
 * Resolution Rate:
 * (Resolved Complaints) / (Total Complaints in selected period) * 100
 * 
 * Average Resolution Time:
 * Average duration between complaint creation and the first history entry where status = 'RESOLVED'.
 * Excludes unresolved complaints.
 */

export const DATE_RANGES = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
  { label: "All Time", value: "all" },
];

export type DateRangeValue = "today" | "7d" | "30d" | "90d" | "all";

export function getDateRangeBoundary(range: DateRangeValue): Date | null {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.setHours(0, 0, 0, 0));
    case "7d":
      return new Date(now.setDate(now.getDate() - 7));
    case "30d":
      return new Date(now.setDate(now.getDate() - 30));
    case "90d":
      return new Date(now.setDate(now.getDate() - 90));
    case "all":
    default:
      return null;
  }
}
