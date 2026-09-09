"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Calendar, Clock, AlertCircle, FileImage, ArrowLeft } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { FeedbackWidget } from "@/components/custom/FeedbackWidget";

import { MapWrapper } from "@/components/map/MapWrapper";

export default function ComplaintDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [complaint, setComplaint] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      if (!id) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch complaint
      const { data: comp, error: compError } = await supabase
        .from("complaints")
        .select(`
          *,
          category:complaint_categories(name)
        `)
        .eq("id", id)
        .single();

      if (compError || !comp) {
        setError("Complaint not found or you do not have permission to view it.");
        setLoading(false);
        return;
      }
      setComplaint(comp);

      // Fetch photos
      const { data: pics } = await supabase
        .from("complaint_photos")
        .select("*")
        .eq("complaint_id", id);
      
      if (pics) {
        // Get signed URLs for each photo
        const photosWithUrls = await Promise.all(pics.map(async (pic) => {
          const { data } = await supabase.storage
            .from("complaint-evidence")
            .createSignedUrl(pic.storage_path, 3600); // 1 hour expiry
          return { ...pic, url: data?.signedUrl };
        }));
        setPhotos(photosWithUrls);
      }

      // Fetch status history
      const { data: hist } = await supabase
        .from("complaint_status_history")
        .select("*")
        .eq("complaint_id", id)
        .order("created_at", { ascending: true });
      
      if (hist) setHistory(hist);

      setLoading(false);
    }
    
    fetchDetails();
  }, [id, supabase]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error || !complaint) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Not Found</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.push("/history")}>Back to History</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/history")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Complaint Details</h1>
          <p className="text-muted-foreground font-mono text-sm">{complaint.reference_id}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Main Info */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{complaint.category?.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" /> Reported on {new Date(complaint.created_at).toLocaleString()}
                  </CardDescription>
                </div>
                <StatusBadge status={complaint.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{complaint.description}</p>
              </div>
                <div className="space-y-2 border-t pt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-md border mb-4">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{complaint.address}</p>
                      {complaint.latitude && complaint.longitude && (
                        <p className="text-xs text-muted-foreground mt-1">
                          GPS: {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                  {complaint.latitude && complaint.longitude && (
                    <MapWrapper 
                      lat={complaint.latitude} 
                      lng={complaint.longitude} 
                      title={complaint.address} 
                    />
                  )}
                </div>
            </CardContent>
          </Card>

          {/* Evidence */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Photographic Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-md bg-gray-50">
                  <FileImage className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No photos were uploaded for this complaint.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="block relative aspect-square rounded-md overflow-hidden border hover:opacity-90 transition-opacity">
                      <img src={photo.url} alt="Evidence" className="object-cover w-full h-full" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <FeedbackWidget type="COMPLAINT" id={complaint.id} status={complaint.status} />

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                {history.map((event, index) => (
                  <div key={event.id} className="relative flex items-start gap-4">
                    <div className="absolute left-0 w-2 h-2 ml-4 -translate-x-1/2 mt-1.5 rounded-full bg-primary ring-4 ring-white z-10" />
                    <div className="pl-10 space-y-1">
                      <StatusBadge status={event.status} />
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">{event.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
