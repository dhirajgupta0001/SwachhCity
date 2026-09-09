"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { assignComplaint, adminUpdateTaskStatus } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Loader2, UserPlus, FileImage, ShieldAlert } from "lucide-react";

export default function AdminComplaintDetails() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [task, setTask] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [collectors, setCollectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Actions state
  const [selectedCollector, setSelectedCollector] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchTask() {
      const { data, error } = await supabase
        .from("complaints")
        .select(`
          *,
          category:complaint_categories(name),
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

      // Fetch collectors for assignment
      const { data: colls } = await supabase.from("profiles").select("id, full_name").eq("role", "COLLECTOR").eq("status", "ACTIVE");
      if (colls) setCollectors(colls);

      // Evidence
      const { data: pics } = await supabase.from("complaint_photos").select("*").eq("complaint_id", id);
      if (pics && pics.length > 0) {
         const withUrls = await Promise.all(pics.map(async (p) => {
           const { data: urlData } = await supabase.storage.from("complaint-evidence").createSignedUrl(p.storage_path, 3600);
           return { ...p, url: urlData?.signedUrl };
         }));
         setEvidence(withUrls);
      }

      setLoading(false);
    }
    fetchTask();
  }, [id, supabase]);

  const handleAssign = async () => {
    if (!selectedCollector) return;
    setIsSubmitting(true);
    try {
      await assignComplaint(id, selectedCollector);
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
      await adminUpdateTaskStatus(id, "COMPLAINT", newStatus, adminNotes);
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
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/complaints")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-sm">{task.reference_id}</span>
            {task.priority === 'URGENT' && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">URGENT</span>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{task.category?.name}</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row justify-between items-center">
              <CardTitle>Complaint Details</CardTitle>
              <StatusBadge status={task.status} />
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 border-r">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase">Citizen</h3>
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

              <div className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
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

              {evidence.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Citizen Evidence</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {evidence.map((pic) => (
                      <a key={pic.id} href={pic.url} target="_blank" rel="noreferrer" className="shrink-0 w-24 h-24 rounded border overflow-hidden">
                        <img src={pic.url} alt="Evidence" className="object-cover w-full h-full" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Administrative Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full gap-2" size="lg">
                    <UserPlus className="h-5 w-5" /> 
                    {task.assigned_collector_id ? "Reassign Collector" : "Assign Collector"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign to Collector</DialogTitle>
                    <DialogDescription>Select an active collector to dispatch for this complaint.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <Select value={selectedCollector} onValueChange={setSelectedCollector}>
                      <SelectTrigger><SelectValue placeholder="Select a collector..." /></SelectTrigger>
                      <SelectContent>
                        {collectors.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAssign} disabled={!selectedCollector || isSubmitting}>
                      {isSubmitting ? "Assigning..." : "Confirm Assignment"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200">
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
                          <SelectItem value="CLOSED">Closed (Resolved/Duplicate)</SelectItem>
                          <SelectItem value="RESOLVED">Resolved</SelectItem>
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
