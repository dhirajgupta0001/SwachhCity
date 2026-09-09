"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2, MapPin, Plus, Truck, Calendar } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/custom/empty-state";

export default function CitizenDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [recentPickups, setRecentPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setProfile(prof);

      const { data: complaints } = await supabase
        .from("complaints")
        .select(`
          id, reference_id, description, status, address, created_at,
          category:complaint_categories(name)
        `)
        .eq("citizen_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      
      setRecentComplaints(complaints || []);

      const { data: pickups } = await supabase
        .from("pickup_requests")
        .select(`
          id, reference_id, status, address, created_at, preferred_date,
          waste_type:waste_types(name)
        `)
        .eq("citizen_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      setRecentPickups(pickups || []);

      setLoading(false);
    }
    
    fetchDashboard();
  }, [supabase]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {profile?.full_name ? profile.full_name.split(" ")[0] : "Citizen"}
          </h1>
          <p className="text-muted-foreground">Here is an overview of your reports and requests.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/report">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Report Issue
            </Button>
          </Link>
          <Link href="/pickup">
            <Button variant="outline" className="gap-2">
              <Truck className="h-4 w-4" /> Request Pickup
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle>Recent Complaints</CardTitle>
            <CardDescription>Sanitation issues you have reported.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {recentComplaints.length === 0 ? (
              <div className="flex-1">
                <EmptyState 
                  icon={ClipboardList}
                  title="No reports yet"
                  description="You haven't reported any issues."
                />
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                {recentComplaints.map((comp) => (
                  <div key={comp.id} className="flex justify-between items-start p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                          {comp.reference_id}
                        </span>
                      </div>
                      <p className="font-medium text-sm line-clamp-1">{comp.category?.name}</p>
                      <div className="flex items-center text-xs text-muted-foreground gap-1">
                        <MapPin className="h-3 w-3" /> <span className="line-clamp-1">{comp.address}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(comp.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                      <StatusBadge status={comp.status} />
                      <Button variant="link" size="sm" className="h-auto p-0" asChild>
                        <Link href={`/history/${comp.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {recentComplaints.length > 0 && (
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/history">View all complaints</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Pickup Placeholder */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle>Pickup Requests</CardTitle>
            <CardDescription>Your scheduled waste collection requests.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {recentPickups.length === 0 ? (
              <div className="flex-1">
                <EmptyState 
                  icon={Truck}
                  title="No pickup requests"
                  description="You haven't scheduled any collections."
                  action={
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/pickup">Request Pickup</Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                {recentPickups.map((pick) => (
                  <div key={pick.id} className="flex justify-between items-start p-3 border rounded-lg bg-white hover:shadow-sm transition-shadow">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                          {pick.reference_id}
                        </span>
                      </div>
                      <p className="font-medium text-sm line-clamp-1">{pick.waste_type?.name}</p>
                      <div className="flex items-center text-xs text-muted-foreground gap-1">
                        <Calendar className="h-3 w-3" /> <span className="line-clamp-1">Preferred: {new Date(pick.preferred_date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-primary">Status updated {new Date(pick.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                      <StatusBadge status={pick.status} />
                      <Button variant="link" size="sm" className="h-auto p-0" asChild>
                        <Link href={`/history/pickup/${pick.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {recentPickups.length > 0 && (
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/history?tab=pickups">View all requests</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-primary">Recycling Tip of the Day</h3>
            <p className="text-sm text-gray-700">Make sure to rinse plastic containers before tossing them in the recycling bin. Food residue can contaminate entire batches of recyclables!</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/education">Learn More</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
