"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { updateTaskStatus } from "@/app/actions/collector";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Camera, Loader2, PlayCircle, CheckCircle2, AlertTriangle, FileImage, X } from "lucide-react";
import { MapWrapper } from "@/components/map/MapWrapper";

export default function CollectorComplaintDetails() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [task, setTask] = useState<any>(null);
  const [citizenEvidence, setCitizenEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Completion Form State
  const [isUpdating, setIsUpdating] = useState(false);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchTask() {
      // RLS guarantees we only get this if assigned_collector_id == auth.uid()
      const { data, error: fetchErr } = await supabase
        .from("complaints")
        .select(`
          *,
          category:complaint_categories(name)
        `)
        .eq("id", id)
        .single();

      if (fetchErr || !data) {
        setError("Task not found or you are not authorized to view it.");
        setLoading(false);
        return;
      }
      setTask(data);

      // Fetch citizen's photos using RPC or direct if admin/policy allows.
      // Wait, RLS for complaint_photos requires citizen_id=uid or admin.
      // We didn't explicitly grant Collectors access to `complaint_photos` in phase 3 RLS.
      // For this phase, we assume the backend would provide them via an admin bypass or we'll skip displaying citizen photos if RLS blocks it safely.
      // Let's attempt to fetch. If it returns 0 rows due to RLS, it fails securely.
      const { data: pics } = await supabase.from("complaint_photos").select("*").eq("complaint_id", id);
      if (pics && pics.length > 0) {
         // Create signed urls
         const withUrls = await Promise.all(pics.map(async (p) => {
           const { data: urlData } = await supabase.storage.from("complaint-evidence").createSignedUrl(p.storage_path, 3600);
           return { ...p, url: urlData?.signedUrl };
         }));
         setCitizenEvidence(withUrls);
      }

      setLoading(false);
    }
    fetchTask();
  }, [id, supabase]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(f => f.size <= 5 * 1024 * 1024 && f.type.startsWith("image/"));
      setPhotos(prev => [...prev, ...newFiles]);
      setPhotoPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (newStatus === "FAILED" && !notes) {
      alert("Please provide notes explaining why the task failed.");
      return;
    }

    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append("taskId", id);
      formData.append("taskType", "COMPLAINT");
      formData.append("newStatus", newStatus);
      formData.append("notes", notes);
      photos.forEach(p => formData.append("photos", p));

      await updateTaskStatus(formData);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
      setIsUpdating(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  
  if (error || !task) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.push("/collector/dashboard")}>Return to Dashboard</Button>
      </div>
    );
  }

  const mapUrl = task.latitude && task.longitude 
    ? `https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.address)}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/collector/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">COMPLAINT</span>
            <span className="text-muted-foreground font-mono text-sm">{task.reference_id}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{task.category?.name}</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Task Details</CardTitle>
                <StatusBadge status={task.status} />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                <div className="flex items-start justify-between gap-4 p-3 bg-gray-50 rounded-md border mb-4">
                  <div className="flex gap-2">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{task.address}</p>
                      {task.latitude && task.longitude && (
                        <p className="text-xs text-muted-foreground mt-1">GPS: {task.latitude.toFixed(4)}, {task.longitude.toFixed(4)}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" render={<a href={mapUrl} target="_blank" rel="noreferrer" />}>
                    Open in Maps
                  </Button>
                </div>
                {task.latitude && task.longitude && (
                  <MapWrapper 
                    lat={task.latitude} 
                    lng={task.longitude} 
                    title={task.address} 
                  />
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Citizen Description</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{task.description}</p>
              </div>

              {citizenEvidence.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Provided Evidence</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {citizenEvidence.map((pic) => (
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
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              
              {task.status === "ASSIGNED" && (
                <Button className="w-full gap-2" size="lg" onClick={() => handleStatusUpdate("IN_PROGRESS")} disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
                  Start Task
                </Button>
              )}

              {task.status === "IN_PROGRESS" && (
                <>
                  <Dialog>
                    <DialogTrigger render={<Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white" size="lg" />}>
                      <CheckCircle2 className="h-5 w-5" /> Mark Resolved
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Complete Task</DialogTitle>
                        <DialogDescription>Provide resolution details and photographic proof of the cleared area.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Resolution Notes *</label>
                          <Textarea 
                            placeholder="What actions were taken?" 
                            value={notes} onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Photo Proof</label>
                          <div className="flex gap-2">
                            {photoPreviews.map((p, i) => (
                              <div key={i} className="relative w-16 h-16 border rounded overflow-hidden">
                                <img src={p} className="object-cover w-full h-full" alt="preview" />
                                <button className="absolute top-0 right-0 bg-red-500 text-white p-0.5" onClick={() => removePhoto(i)}><X className="w-3 h-3"/></button>
                              </div>
                            ))}
                            {photos.length < 3 && (
                              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 border-2 border-dashed flex flex-col items-center justify-center text-gray-500 rounded">
                                <Camera className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <input type="file" ref={fileInputRef} onChange={handlePhotoSelect} accept="image/*" multiple className="hidden" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => handleStatusUpdate("RESOLVED")} disabled={!notes || isUpdating} className="w-full bg-green-600 hover:bg-green-700">
                          {isUpdating ? "Submitting..." : "Submit Resolution"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger render={<Button variant="outline" className="w-full gap-2 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50" />}>
                      <AlertTriangle className="h-4 w-4" /> Report Issue
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Task Failed</DialogTitle>
                        <DialogDescription>Indicate why this task could not be completed.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Reason for Failure *</label>
                          <Textarea 
                            placeholder="E.g., Location inaccessible, safety hazard..." 
                            value={notes} onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => handleStatusUpdate("FAILED")} disabled={!notes || isUpdating} variant="destructive" className="w-full">
                          {isUpdating ? "Submitting..." : "Mark as Failed"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {["RESOLVED", "CLOSED", "FAILED"].includes(task.status) && (
                <div className="text-center p-4 bg-gray-50 border rounded text-sm text-gray-500">
                  This task is no longer active.
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
