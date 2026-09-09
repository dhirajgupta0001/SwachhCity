"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cancelPickupRequest } from "@/app/actions/pickup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Loader2, MapPin, Package, XCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { FeedbackWidget } from "@/components/custom/FeedbackWidget";

const MapWrapper = dynamic(() => import("@/components/map/MapWrapper"), { 
  ssr: false,
});

export default function PickupDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [pickup, setPickup] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      if (!id) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: req, error: reqError } = await supabase
        .from("pickup_requests")
        .select(`
          *,
          waste_type:waste_types(name)
        `)
        .eq("id", id)
        .single();

      if (reqError || !req) {
        setError("Pickup request not found or you do not have permission to view it.");
        setLoading(false);
        return;
      }
      setPickup(req);

      const { data: hist } = await supabase
        .from("pickup_status_history")
        .select("*")
        .eq("pickup_request_id", id)
        .order("created_at", { ascending: true });
      
      if (hist) setHistory(hist);

      setLoading(false);
    }
    
    fetchDetails();
  }, [id, supabase]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this pickup request?")) return;
    
    setCancelling(true);
    try {
      await cancelPickupRequest(id);
      // Reload details after cancellation
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Failed to cancel request.");
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error || !pickup) {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/history")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pickup Details</h1>
            <p className="text-muted-foreground font-mono text-sm">{pickup.reference_id}</p>
          </div>
        </div>
        
        {(pickup.status === "PENDING" || pickup.status === "APPROVED") && (
          <Button 
            variant="destructive" 
            onClick={handleCancel} 
            disabled={cancelling}
            className="gap-2"
          >
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Cancel Request
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Main Info */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{pickup.waste_type?.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" /> Requested on {new Date(pickup.created_at).toLocaleString()}
                  </CardDescription>
                </div>
                <StatusBadge status={pickup.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Package className="h-4 w-4" /> Quantity
                  </h3>
                  <p className="font-medium text-gray-900">{pickup.quantity.replace("_", " ")}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Preferred Time
                  </h3>
                  <p className="font-medium text-gray-900">
                    {new Date(pickup.preferred_date).toLocaleDateString()} ({pickup.preferred_time_window})
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{pickup.description}</p>
              </div>

              <div className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-md border mb-4">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{pickup.address}</p>
                    {pickup.latitude && pickup.longitude && (
                      <p className="text-xs text-muted-foreground mt-1">
                        GPS: {pickup.latitude.toFixed(4)}, {pickup.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
                {pickup.latitude && pickup.longitude && (
                  <MapWrapper 
                    lat={pickup.latitude} 
                    lng={pickup.longitude} 
                    title={pickup.address} 
                  />
                )}
              </div>

            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <FeedbackWidget type="PICKUP" id={pickup.id} status={pickup.status} />

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
