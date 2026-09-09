"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, Search, MapPin } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/custom/empty-state";

export default function AdminComplaintsList() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const supabase = createClient();

  useEffect(() => {
    async function fetchComplaints() {
      const { data } = await supabase
        .from("complaints")
        .select(`
          id, reference_id, status, priority, address, created_at,
          category:complaint_categories(name),
          collector:profiles!assigned_collector_id(full_name)
        `)
        .order("created_at", { ascending: false });
      
      setComplaints(data || []);
      setLoading(false);
    }
    fetchComplaints();
  }, [supabase]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const filtered = complaints.filter(c => {
    const matchesSearch = c.reference_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Complaint Management</h1>
          <p className="text-muted-foreground">Monitor and assign citizen complaints.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search by ID or Address..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState 
          icon={Search}
          title="No complaints found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <Card key={c.id} className="overflow-hidden hover:shadow-sm transition-shadow">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                        {c.reference_id}
                      </span>
                      <StatusBadge status={c.status} />
                      {c.priority === 'URGENT' && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">URGENT</span>}
                    </div>
                    <h3 className="font-semibold text-lg">{c.category?.name}</h3>
                    <div className="flex items-center text-sm text-muted-foreground gap-1">
                      <MapPin className="h-4 w-4" /> {c.address}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Assigned to: <span className="font-medium text-gray-900">{c.collector?.full_name || "Unassigned"}</span>
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end justify-center border-t sm:border-t-0 pt-3 sm:pt-0 sm:pl-4 sm:border-l gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                    <Button variant="outline" className="gap-1 mt-1 w-full" asChild>
                      <Link href={`/admin/complaints/${c.id}`}>
                        Manage <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
