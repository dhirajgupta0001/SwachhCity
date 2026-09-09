"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/custom/empty-state";

export default function CollectorHistoryList() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchTasks() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: complaints } = await supabase
        .from("complaints")
        .select(`id, reference_id, status, address, priority, resolved_at, created_at, category:complaint_categories(name)`)
        .eq("assigned_collector_id", user.id)
        .in("status", ["RESOLVED", "CLOSED", "FAILED"]);

      const { data: pickups } = await supabase
        .from("pickup_requests")
        .select(`id, reference_id, status, address, completed_at, created_at, waste_type:waste_types(name)`)
        .eq("assigned_collector_id", user.id)
        .in("status", ["COMPLETED", "CLOSED", "FAILED", "CANCELLED"]);

      const formattedComplaints = (complaints || []).map(c => ({
        ...c, taskType: "COMPLAINT", typeLabel: c.category?.name, sortDate: new Date(c.resolved_at || c.created_at)
      }));

      const formattedPickups = (pickups || []).map(p => ({
        ...p, taskType: "PICKUP", typeLabel: p.waste_type?.name, sortDate: new Date(p.completed_at || p.created_at)
      }));

      const combined = [...formattedComplaints, ...formattedPickups].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
      
      setTasks(combined);
      setLoading(false);
    }
    
    fetchTasks();
  }, [supabase]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Work History</h1>
        <p className="text-muted-foreground">Log of your previously completed or failed tasks.</p>
      </div>

      {tasks.length === 0 ? (
        <EmptyState 
          icon={ClipboardList}
          title="No history found"
          description="You have not completed any tasks yet."
        />
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${task.taskType === 'COMPLAINT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {task.taskType}
                      </span>
                      <span className="font-mono text-sm font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                        {task.reference_id}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{task.typeLabel}</h3>
                    <div className="flex items-center text-sm text-muted-foreground gap-1 pt-1">
                      <MapPin className="h-4 w-4" /> {task.address}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end justify-center border-t sm:border-t-0 pt-3 sm:pt-0 sm:pl-4 sm:border-l gap-2">
                    <StatusBadge status={task.status} />
                    <span className="text-xs text-muted-foreground">
                      {task.sortDate.toLocaleDateString()}
                    </span>
                    <Button variant="ghost" size="sm" className="gap-1 text-primary hover:bg-primary/5 mt-1 w-full" asChild>
                      <Link href={`/collector/tasks/${task.taskType.toLowerCase()}/${task.id}`}>
                        View Archive
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
