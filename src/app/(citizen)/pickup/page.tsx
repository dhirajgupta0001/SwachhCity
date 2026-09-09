"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { submitPickupRequest } from "@/app/actions/pickup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import Link from "next/link";

import { LocationPickerWrapper } from "@/components/map/LocationPickerWrapper";

export default function PickupPage() {
  const [wasteTypes, setWasteTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ referenceId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [wasteTypeId, setWasteTypeId] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTimeWindow, setPreferredTimeWindow] = useState("");

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadWasteTypes() {
      const { data } = await supabase.from("waste_types").select("*").eq("is_active", true);
      if (data) setWasteTypes(data);
    }
    loadWasteTypes();
  }, [supabase]);

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("wasteTypeId", wasteTypeId);
      formData.append("description", description);
      formData.append("quantity", quantity);
      formData.append("address", address);
      if (location) {
        formData.append("latitude", location.lat.toString());
        formData.append("longitude", location.lng.toString());
      }
      formData.append("preferredDate", preferredDate);
      formData.append("preferredTimeWindow", preferredTimeWindow);

      const result = await submitPickupRequest(formData);
      
      if (result.success) {
        setSuccessData({ referenceId: result.referenceId });
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Request Submitted Successfully</h1>
        <p className="text-muted-foreground text-lg">Your pickup request has been received and is pending approval.</p>
        
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Your Reference ID</p>
            <p className="text-2xl font-mono font-bold text-gray-900">{successData.referenceId}</p>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 pt-4">
          <Button render={<Link href={`/history`} />}>Track Request</Button>
          <Button variant="outline" onClick={() => {
            setSuccessData(null);
            setWasteTypeId("");
            setDescription("");
            setQuantity("");
            setAddress("");
            setLocation(null);
            setPreferredDate("");
            setPreferredTimeWindow("");
          }}>
            Request Another Pickup
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Request Waste Pickup</h1>
        <p className="text-muted-foreground">Schedule a waste collection for specific or bulk items.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Waste Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Waste Type *</label>
                <Select value={wasteTypeId} onValueChange={(val: string | null) => setWasteTypeId(val || "")} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {wasteTypes.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Approximate Quantity *</label>
                <Select value={quantity} onValueChange={(val: string | null) => setQuantity(val || "")} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select volume" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMALL">Small (1-2 bags)</SelectItem>
                    <SelectItem value="MEDIUM">Medium (3-5 bags)</SelectItem>
                    <SelectItem value="LARGE">Large (Pickup truck load)</SelectItem>
                    <SelectItem value="VERY_LARGE">Very Large (Dumpster needed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <Textarea 
                placeholder="Tell us what waste you need collected and anything the collector should know." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="min-h-[100px]"
              />
            </div>

            {/* Location */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Text Address *</label>
                <Input 
                  placeholder="Full address where the waste is located" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <LocationPickerWrapper 
                onLocationSelect={(lat: number, lng: number) => setLocation({lat, lng})} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
              {/* Preferred Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred Pickup Date *</label>
                <Input 
                  type="date" 
                  min={getTodayString()}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  required
                />
              </div>

              {/* Preferred Time Window */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred Time Window *</label>
                <Select value={preferredTimeWindow} onValueChange={(val: string | null) => setPreferredTimeWindow(val || "")} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MORNING">Morning (8 AM - 12 PM)</SelectItem>
                    <SelectItem value="AFTERNOON">Afternoon (12 PM - 4 PM)</SelectItem>
                    <SelectItem value="EVENING">Evening (4 PM - 8 PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-100">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !wasteTypeId || !description || !quantity || !address || !preferredDate || !preferredTimeWindow}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Request...</>
              ) : (
                "Submit Pickup Request"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
