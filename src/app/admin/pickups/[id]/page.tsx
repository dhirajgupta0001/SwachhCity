"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { approvePickup, assignPickup, adminUpdateTaskStatus } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Loader2, UserPlus, CheckCircle, Package, Clock, ShieldAlert } from "lucide-react";

export default function AdminPickupDetails() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [task, setTask] = useState<any>(null);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Actions state
  const [selectedCollector, setSelectedCollector] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchTask() {
      const { data, error } = await supabase
        .from("pickup_requests")
        .select(`
          *,
          waste_type:waste_types(name),
          citizen:profiles!citizen_id(full_name, email),
          collector:profiles!assigned_collector_id(full_name)
        `)
        .eq("id", id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }
      setTask(data);
      // Pre-fill schedule input with citizen preference if it hasn't been officially scheduled yet
      if (!data.scheduled_at) {
        setScheduledDate(data.preferred_date);
      } else {
        setScheduledDate(new Date(data.scheduled_at).toISOString().split('T')[0]);
      }

      const { data: colls } = await supabase.from("profiles").select("id, full_name").eq("role", "COLLECTOR").eq("status", "ACTIVE");
      if (colls) setCollectors(colls);

      setLoading(false);
    }
    fetchTask();
  }, [id, supabase]);

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve this pickup?")) return;
    setIsSubmitting(true);
    try {
      await approvePickup(id);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedCollector) return;
    setIsSubmitting(true);
    try {
      await assignPickup(id, selectedCollector, scheduledDate);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  const handleStatusOverride = async () => {
    if (!newStatus || !adminNotes) {
      alert("Status and Notes are required for administrative override.");
      return;
    }
    setIsSubmitting(true);
    try {
      await adminUpdateTaskStatus(id, "PICKUP", newStatus, adminNotes);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!task) return <div className="text-center py-12">Task not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/pickups")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-sm">{task.reference_id}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{task.waste_type?.name}</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row justify-between items-center">
              <CardTitle>Pickup Details</CardTitle>
              <StatusBadge status={task.status} />
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 border-r">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase">Citizen Requestor</h3>
                  <p className="font-medium">{task.citizen?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{task.citizen?.email}</p>
                </div>
                <div className="space-y-1 pl-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase">Assigned Collector</h3>
                  {task.collector ? (
                    <p className="font-medium text-blue-700">{task.collector.full_name}</p>
                  ) : (
                    <p className="text-gray-500 italic">Unassigned</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-1 border-r">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Package className="h-4 w-4"/> Quantity</h3>
                  <p className="font-medium text-gray-900">{task.quantity.replace("_", " ")}</p>
                </div>
                <div className="space-y-1 pl-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4"/> Preference</h3>
                  <p className="font-medium text-gray-900">{new Date(task.preferred_date).toLocaleDateString()} ({task.preferred_time_window})</p>
                </div>
              </div>

              {task.scheduled_at && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <p className="text-sm font-semibold text-blue-800">Officially Scheduled For</p>
                  <p className="text-sm text-blue-900">{new Date(task.scheduled_at).toLocaleDateString()}</p>
                </div>
              )}

              <div className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-medium text-muted-foreground">Citizen Description</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{task.description}</p>
              </div>

              <div className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-md border">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{task.address}</p>
                    {task.latitude && task.longitude && (
                      <p className="text-xs text-muted-foreground mt-1">GPS: {task.latitude.toFixed(4)}, {task.longitude.toFixed(4)}</p>
                    )}
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Administrative Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              
              {task.status === "PENDING" && (
                <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" size="lg" onClick={handleApprove} disabled={isSubmitting}>
                  <CheckCircle className="h-5 w-5" /> 
                  {isSubmitting ? "Processing..." : "Approve Pickup"}
                </Button>
              )}

              {["APPROVED", "ASSIGNED", "SCHEDULED"].includes(task.status) && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                      <UserPlus className="h-5 w-5" /> 
                      {task.assigned_collector_id ? "Reassign/Reschedule" : "Assign & Schedule"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dispatch Operations</DialogTitle>
                      <DialogDescription>Assign a collector and officially schedule this pickup.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Collector</label>
                        <Select value={selectedCollector} onValueChange={setSelectedCollector}>
                          <SelectTrigger><SelectValue placeholder="Select active collector..." /></SelectTrigger>
                          <SelectContent>
                            {collectors.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Official Date (Optional)</label>
                        <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Citizen preferred: {new Date(task.preferred_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAssign} disabled={!selectedCollector || isSubmitting}>
                        {isSubmitting ? "Assigning..." : "Confirm Dispatch"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 mt-4">
                    <ShieldAlert className="h-4 w-4" /> Override Status
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Administrative Status Override</DialogTitle>
                    <DialogDescription>Force a status change. This action is audited.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">New Status</label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="FAILED">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Override Reason (Required)</label>
                      <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Explain why this administrative override was performed." />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleStatusOverride} disabled={!newStatus || !adminNotes || isSubmitting} variant="destructive">
                      {isSubmitting ? "Updating..." : "Force Override"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
