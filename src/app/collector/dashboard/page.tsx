"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2, MapPin, Truck, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/custom/empty-state";

export default function CollectorDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedToday, setCompletedToday] = useState(0);
  const [failedToday, setFailedToday] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      setProfile(prof);

      // Fetch assigned complaints
      const { data: complaints } = await supabase
        .from("complaints")
        .select(`
          id, reference_id, description, status, address, priority, created_at,
          category:complaint_categories(name)
        `)
        .eq("assigned_collector_id", user.id)
        .in("status", ["ASSIGNED", "IN_PROGRESS"])
        .order("created_at", { ascending: false });

      // Fetch assigned pickups
      const { data: pickups } = await supabase
        .from("pickup_requests")
        .select(`
          id, reference_id, description, status, address, preferred_date,
          waste_type:waste_types(name)
        `)
        .eq("assigned_collector_id", user.id)
        .in("status", ["ASSIGNED", "IN_PROGRESS", "SCHEDULED"])
        .order("preferred_date", { ascending: true });

      // Combine and format
      const formattedComplaints = (complaints || []).map(c => ({
        ...c,
        taskType: "COMPLAINT",
        typeLabel: (c.category as any)?.name,
        sortDate: new Date(c.created_at)
      }));

      const formattedPickups = (pickups || []).map(p => ({
        ...p,
        taskType: "PICKUP",
        typeLabel: (p.waste_type as any)?.name,
        sortDate: new Date(p.preferred_date) // Assuming scheduled date is close to preferred
      }));

      // Fetch completed and failed counts for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const { count: cCompletedCount } = await supabase
        .from("complaints")
        .select("*", { count: "exact", head: true })
        .eq("assigned_collector_id", user.id)
        .in("status", ["RESOLVED", "CLOSED"])
        .gte("updated_at", todayIso);

      const { count: pCompletedCount } = await supabase
        .from("pickup_requests")
        .select("*", { count: "exact", head: true })
        .eq("assigned_collector_id", user.id)
        .eq("status", "COMPLETED")
        .gte("updated_at", todayIso);

      const { count: cFailedCount } = await supabase
        .from("complaints")
        .select("*", { count: "exact", head: true })
        .eq("assigned_collector_id", user.id)
        .eq("status", "FAILED")
        .gte("updated_at", todayIso);

      const { count: pFailedCount } = await supabase
        .from("pickup_requests")
        .select("*", { count: "exact", head: true })
        .eq("assigned_collector_id", user.id)
        .eq("status", "FAILED")
        .gte("updated_at", todayIso);

      const combined = [...formattedComplaints, ...formattedPickups].sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
      
      setTasks(combined);
      setCompletedToday((cCompletedCount || 0) + (pCompletedCount || 0));
      setFailedToday((cFailedCount || 0) + (pFailedCount || 0));
      setLoading(false);
    }
    
    fetchDashboard();
  }, [supabase]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const assignedCount = tasks.filter(t => t.status === "ASSIGNED" || t.status === "SCHEDULED").length;
  const inProgressCount = tasks.filter(t => t.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {profile?.full_name ? profile.full_name.split(" ")[0] : "Collector"}
        </h1>
        <p className="text-muted-foreground">Here is your operational overview for today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedCount}</div>
            <p className="text-xs text-muted-foreground">Ready to start</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">Currently working on</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedToday}</div>
            <p className="text-xs text-muted-foreground">Successfully finished today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedToday}</div>
            <p className="text-xs text-muted-foreground">Issues encountered today</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Workspace</CardTitle>
          <CardDescription>Your prioritized list of tasks that require attention.</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <EmptyState 
              icon={ClipboardList}
              title="You're all caught up!"
              description="There are no active tasks assigned to you right now."
            />
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${task.taskType === 'COMPLAINT' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {task.taskType === 'COMPLAINT' ? 'COMPLAINT' : 'PICKUP'}
                      </span>
                      <span className="font-mono text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                        {task.reference_id}
                      </span>
                      {task.priority === 'URGENT' && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">URGENT</span>
                      )}
                    </div>
                    <p className="font-semibold text-lg">{task.typeLabel}</p>
                    <div className="flex items-center text-sm text-muted-foreground gap-1">
                      <MapPin className="h-4 w-4" /> <span className="line-clamp-1">{task.address}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 gap-2">
                    <StatusBadge status={task.status} />
                    <Button size="sm" render={<Link href={`/collector/tasks/${task.taskType.toLowerCase()}/${task.id}`} />}>
                        Open Task
                      </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
