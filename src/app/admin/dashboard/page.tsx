"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, MapPin, Truck, Users } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/custom/empty-state";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalComplaints: 0, newComplaints: 0, inProgressComplaints: 0,
    totalPickups: 0, pendingPickups: 0, activePickups: 0,
    activeCollectors: 0
  });
  
  const [attentionComplaints, setAttentionComplaints] = useState<any[]>([]);
  const [attentionPickups, setAttentionPickups] = useState<any[]>([]);
  const [collectorWorkload, setCollectorWorkload] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    async function fetchDashboard() {
      // 1. Complaint Metrics
      const { count: cTotal } = await supabase.from("complaints").select("*", { count: 'exact', head: true });
      const { count: cNew } = await supabase.from("complaints").select("*", { count: 'exact', head: true }).eq("status", "NEW");
      const { count: cInProgress } = await supabase.from("complaints").select("*", { count: 'exact', head: true }).eq("status", "IN_PROGRESS");

      // 2. Pickup Metrics
      const { count: pTotal } = await supabase.from("pickup_requests").select("*", { count: 'exact', head: true });
      const { count: pPending } = await supabase.from("pickup_requests").select("*", { count: 'exact', head: true }).eq("status", "PENDING");
      const { count: pActive } = await supabase.from("pickup_requests").select("*", { count: 'exact', head: true }).in("status", ["APPROVED", "ASSIGNED", "SCHEDULED", "IN_PROGRESS"]);

      // 3. Collector Metrics
      const { count: collActive } = await supabase.from("profiles").select("*", { count: 'exact', head: true }).eq("role", "COLLECTOR").eq("status", "ACTIVE");

      setMetrics({
        totalComplaints: cTotal || 0,
        newComplaints: cNew || 0,
        inProgressComplaints: cInProgress || 0,
        totalPickups: pTotal || 0,
        pendingPickups: pPending || 0,
        activePickups: pActive || 0,
        activeCollectors: collActive || 0
      });

      // 4. Attention Required - Complaints (NEW or URGENT)
      const { data: attnC } = await supabase.from("complaints")
        .select(`id, reference_id, status, priority, category:complaint_categories(name)`)
        .or('status.eq.NEW,priority.eq.URGENT')
        .order("created_at", { ascending: false }).limit(5);
      setAttentionComplaints(attnC || []);

      // 5. Attention Required - Pickups (PENDING)
      const { data: attnP } = await supabase.from("pickup_requests")
        .select(`id, reference_id, status, waste_type:waste_types(name)`)
        .eq("status", "PENDING")
        .order("created_at", { ascending: true }).limit(5);
      setAttentionPickups(attnP || []);

      // 6. Collector Workload (rough estimation via grouping active tasks)
      // Since Supabase JS doesn't support complex group by easily, we'll fetch assigned active tasks and group in JS.
      const { data: cTasks } = await supabase.from("complaints").select("assigned_collector_id").in("status", ["ASSIGNED", "IN_PROGRESS"]);
      const { data: pTasks } = await supabase.from("pickup_requests").select("assigned_collector_id").in("status", ["ASSIGNED", "SCHEDULED", "IN_PROGRESS"]);
      const { data: colls } = await supabase.from("profiles").select("id, full_name").eq("role", "COLLECTOR").eq("status", "ACTIVE");

      if (colls) {
        const counts: Record<string, number> = {};
        cTasks?.forEach(t => { if (t.assigned_collector_id) counts[t.assigned_collector_id] = (counts[t.assigned_collector_id] || 0) + 1; });
        pTasks?.forEach(t => { if (t.assigned_collector_id) counts[t.assigned_collector_id] = (counts[t.assigned_collector_id] || 0) + 1; });
        
        const workload = colls.map(c => ({
          id: c.id,
          name: c.full_name,
          activeTasks: counts[c.id] || 0
        })).sort((a, b) => b.activeTasks - a.activeTasks).slice(0, 5);
        setCollectorWorkload(workload);
      }

      setLoading(false);
    }
    fetchDashboard();
  }, [supabase]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Municipal Operations Control</h1>
        <p className="text-muted-foreground">Overview of city-wide waste management and sanitation activities.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Complaints</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newComplaints}</div>
            <p className="text-xs text-muted-foreground">Require assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Pickups</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingPickups}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Operations</CardTitle>
            <ClipboardList className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.inProgressComplaints + metrics.activePickups}</div>
            <p className="text-xs text-muted-foreground">Tasks currently assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Collectors</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCollectors}</div>
            <p className="text-xs text-muted-foreground">Available workforce</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Attention Required */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attention Required</CardTitle>
              <CardDescription>Items that need immediate administrative action.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Unassigned Complaints</h3>
                {attentionComplaints.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded border">No pending complaints.</p>
                ) : (
                  <div className="space-y-2">
                    {attentionComplaints.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold">{c.reference_id}</span>
                            {c.priority === 'URGENT' && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 rounded">URGENT</span>}
                          </div>
                          <p className="text-sm font-medium">{c.category?.name}</p>
                        </div>
                        <Button size="sm" variant="outline" render={<Link href={`/admin/complaints/${c.id}`} />}>Assign</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pending Pickups</h3>
                {attentionPickups.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded border">No pending pickup requests.</p>
                ) : (
                  <div className="space-y-2">
                    {attentionPickups.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                        <div>
                          <p className="font-mono text-xs font-semibold text-gray-500">{p.reference_id}</p>
                          <p className="text-sm font-medium">{p.waste_type?.name}</p>
                        </div>
                        <Button size="sm" variant="outline" render={<Link href={`/admin/pickups/${p.id}`} />}>Review</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Collector Workload */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workforce Capacity</CardTitle>
              <CardDescription>Active task distribution among collectors.</CardDescription>
            </CardHeader>
            <CardContent>
              {collectorWorkload.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No active workforce data.</p>
              ) : (
                <div className="space-y-4">
                  {collectorWorkload.map(coll => (
                    <div key={coll.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {coll.name.charAt(0)}
                        </div>
                        <p className="text-sm font-medium">{coll.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{coll.activeTasks}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Tasks</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <Button variant="link" className="w-full text-xs" render={<Link href="/admin/users?role=COLLECTOR" />}>Manage Workforce</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
