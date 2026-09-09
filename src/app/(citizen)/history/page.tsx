"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/custom/status-badge";
import { EmptyState } from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, ClipboardList, Loader2, MapPin, Truck } from "lucide-react";

export default function HistoryPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Complaints
      const { data: compData } = await supabase
        .from("complaints")
        .select(`
          id, reference_id, description, status, address, created_at,
          category:complaint_categories(name)
        `)
        .eq("citizen_id", user.id)
        .order("created_at", { ascending: false });
      
      setComplaints(compData || []);

      // Fetch Pickups
      const { data: pickData } = await supabase
        .from("pickup_requests")
        .select(`
          id, reference_id, description, status, address, created_at,
          waste_type:waste_types(name)
        `)
        .eq("citizen_id", user.id)
        .order("created_at", { ascending: false });

      setPickups(pickData || []);

      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My History</h1>
          <p className="text-muted-foreground">Track your reported issues and pickup requests.</p>
        </div>
      </div>

      <Tabs defaultValue="complaints" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="pickups">Pickup Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="complaints" className="mt-6">
          {complaints.length === 0 ? (
            <EmptyState 
              icon={ClipboardList}
              title="No complaints found"
              description="You haven't reported any sanitation issues yet."
              action={
                <Button render={<Link href="/report" />}>Report an Issue</Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {complaints.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                            {item.reference_id}
                          </span>
                          <StatusBadge status={item.status} />
                          <span className="text-xs text-muted-foreground hidden sm:inline-block ml-2">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg">{item.category?.name || "Unknown"}</h3>
                        <p className="text-sm text-gray-600 line-clamp-1">{item.description}</p>
                        <div className="flex items-center text-xs text-muted-foreground gap-1 pt-1">
                          <MapPin className="h-3 w-3" /> {item.address}
                        </div>
                      </div>
                      
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 sm:pl-4 sm:border-l">
                        <span className="text-xs text-muted-foreground sm:hidden mb-0">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                        <Button variant="ghost" className="gap-1 text-primary hover:text-primary hover:bg-primary/5" render={<Link href={`/history/${item.id}`} />}>
                            View Details <ArrowRight className="h-4 w-4" />
                          </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pickups" className="mt-6">
          {pickups.length === 0 ? (
            <EmptyState 
              icon={Truck}
              title="No pickup requests"
              description="You haven't requested any waste collections yet."
              action={
                <Button render={<Link href="/pickup" />}>Request Pickup</Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {pickups.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                            {item.reference_id}
                          </span>
                          <StatusBadge status={item.status} />
                          <span className="text-xs text-muted-foreground hidden sm:inline-block ml-2">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg">{item.waste_type?.name || "Unknown"}</h3>
                        <p className="text-sm text-gray-600 line-clamp-1">{item.description}</p>
                        <div className="flex items-center text-xs text-muted-foreground gap-1 pt-1">
                          <MapPin className="h-3 w-3" /> {item.address}
                        </div>
                      </div>
                      
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 sm:pl-4 sm:border-l">
                        <span className="text-xs text-muted-foreground sm:hidden mb-0">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                        <Button variant="ghost" className="gap-1 text-primary hover:text-primary hover:bg-primary/5" render={<Link href={`/history/pickup/${item.id}`} />}>
                            View Details <ArrowRight className="h-4 w-4" />
                          </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
