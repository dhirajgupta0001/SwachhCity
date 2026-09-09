"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { submitComplaint } from "@/app/actions/complaint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, CheckCircle2, Loader2, MapPin, X } from "lucide-react";
import Link from "next/link";
import { LocationPickerWrapper } from "@/components/map/LocationPickerWrapper";

export default function ReportPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<{ referenceId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from("complaint_categories").select("*").eq("is_active", true);
      if (data) setCategories(data);
    }
    loadCategories();
  }, [supabase]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(file => file.size <= 5 * 1024 * 1024 && file.type.startsWith("image/"));
      
      if (validFiles.length < newFiles.length) {
        setError("Some files were skipped. Only images under 5MB are allowed.");
      }

      setPhotos(prev => [...prev, ...validFiles]);
      
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("categoryId", categoryId);
      formData.append("description", description);
      formData.append("address", address);
      if (location) {
        formData.append("latitude", location.lat.toString());
        formData.append("longitude", location.lng.toString());
      }
      photos.forEach(photo => {
        formData.append("photos", photo);
      });

      const result = await submitComplaint(formData);
      
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
        <h1 className="text-3xl font-bold tracking-tight">Issue Reported Successfully</h1>
        <p className="text-muted-foreground text-lg">Thank you for helping keep our city clean.</p>
        
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-6">
            <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Your Reference ID</p>
            <p className="text-2xl font-mono font-bold text-gray-900">{successData.referenceId}</p>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 pt-4">
          <Button asChild>
            <Link href={`/history`}>Track Complaint</Link>
          </Button>
          <Button variant="outline" onClick={() => {
            setSuccessData(null);
            setCategoryId("");
            setDescription("");
            setAddress("");
            setLocation(null);
            setPhotos([]);
            setPhotoPreviews([]);
          }}>
            Report Another Issue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Report an Issue</h1>
        <p className="text-muted-foreground">Submit a sanitation problem to the municipal authorities.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Issue Category *</label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <Textarea 
                placeholder="Describe what you see, where it is, and how long the issue has been present." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="min-h-[120px]"
              />
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Photographs (Evidence)</label>
              <p className="text-xs text-muted-foreground mb-2">Upload up to 3 photos. Max 5MB each.</p>
              
              <div className="flex flex-wrap gap-4">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative w-24 h-24 rounded-md border overflow-hidden">
                    <img src={preview} alt="Preview" className="object-cover w-full h-full" />
                    <button 
                      type="button" 
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-xs">Add Photo</span>
                  </button>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoSelect} 
                accept="image/*" 
                multiple 
                className="hidden" 
              />
            </div>

            {/* Location */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Text Address *</label>
                <Input 
                  placeholder="E.g., In front of Central Park gate" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <LocationPickerWrapper 
                onLocationSelect={(lat: number, lng: number) => setLocation({lat, lng})} 
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-100">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !categoryId || !description || !address}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
              ) : (
                "Submit Complaint"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
