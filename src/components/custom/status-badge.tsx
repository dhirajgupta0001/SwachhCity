import { Badge } from "@/components/ui/badge";

export type StatusType =
  | "NEW"
  | "ACKNOWLEDGED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "ACCEPTED"
  | "RESOLVED"
  | "COMPLETED"
  | "CLOSED"
  | "RESCHEDULED"
  | "FAILED"
  | "REJECTED";

interface StatusBadgeProps {
  status: StatusType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variantMap: Record<StatusType, string> = {
    NEW: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    ACKNOWLEDGED: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    ASSIGNED: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
    IN_PROGRESS: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    ACCEPTED: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    RESOLVED: "bg-green-100 text-green-800 hover:bg-green-200",
    COMPLETED: "bg-green-100 text-green-800 hover:bg-green-200",
    CLOSED: "bg-green-100 text-green-800 hover:bg-green-200",
    RESCHEDULED: "bg-orange-100 text-orange-800 hover:bg-orange-200",
    FAILED: "bg-red-100 text-red-800 hover:bg-red-200",
    REJECTED: "bg-red-100 text-red-800 hover:bg-red-200",
  };

  return (
    <Badge className={`${variantMap[status]} border-transparent font-medium`}>
      {status.replace("_", " ")}
    </Badge>
  );
}
