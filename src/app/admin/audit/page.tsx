import { EmptyState } from "@/components/custom/empty-state";
import { Hammer } from "lucide-react";

export default function PlaceholderPage() {
  return (
    <div className="flex-1 p-8">
      <EmptyState
        icon={Hammer}
        title="Coming Soon"
        description="This feature will be implemented in a future phase."
      />
    </div>
  );
}
