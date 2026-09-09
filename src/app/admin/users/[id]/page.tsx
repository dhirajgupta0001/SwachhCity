"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { updateUserRole, updateUserStatus } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, UserCog, UserX, ShieldAlert } from "lucide-react";

export default function AdminUserDetails() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ complaints: 0, pickups: 0, collectorActiveTasks: 0 });
  const [loading, setLoading] = useState(true);

  // Actions state
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }
      setProfile(data);
      setSelectedRole(data.role);
      setSelectedStatus(data.status);

      // Fetch basic usage stats
      let complaints = 0, pickups = 0, collectorTasks = 0;
      
      if (data.role === 'CITIZEN') {
        const { count: c } = await supabase.from("complaints").select("*", { count: 'exact', head: true }).eq("citizen_id", id);
        const { count: p } = await supabase.from("pickup_requests").select("*", { count: 'exact', head: true }).eq("citizen_id", id);
        complaints = c || 0; pickups = p || 0;
      } else if (data.role === 'COLLECTOR') {
        const { count: ct } = await supabase.from("complaints").select("*", { count: 'exact', head: true }).eq("assigned_collector_id", id).in("status", ["ASSIGNED", "IN_PROGRESS"]);
        const { count: pt } = await supabase.from("pickup_requests").select("*", { count: 'exact', head: true }).eq("assigned_collector_id", id).in("status", ["ASSIGNED", "SCHEDULED", "IN_PROGRESS"]);
        collectorTasks = (ct || 0) + (pt || 0);
      }
      
      setStats({ complaints, pickups, collectorActiveTasks: collectorTasks });
      setLoading(false);
    }
    fetchUser();
  }, [id, supabase]);

  const handleRoleChange = async () => {
    if (!confirm("Are you sure you want to change this user's role?")) return;
    setIsSubmitting(true);
    try {
      await updateUserRole(id, selectedRole as any);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async () => {
    if (!confirm("Are you sure you want to change this user's account status?")) return;
    setIsSubmitting(true);
    try {
      await updateUserStatus(id, selectedStatus as any);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!profile) return <div className="text-center py-12">User not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/users")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100">{profile.role}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{profile.full_name}</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row justify-between items-center">
              <CardTitle>Profile Information</CardTitle>
              <StatusBadge status={profile.status} />
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase">System ID</h3>
                  <p className="font-mono text-sm text-gray-900">{profile.id}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase">Joined</h3>
                  <p className="text-sm font-medium text-gray-900">{new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Activity Summary</h3>
                {profile.role === 'CITIZEN' && (
                  <div className="flex gap-4">
                    <div><span className="font-bold text-lg">{stats.complaints}</span> <span className="text-sm text-muted-foreground">Complaints</span></div>
                    <div><span className="font-bold text-lg">{stats.pickups}</span> <span className="text-sm text-muted-foreground">Pickups</span></div>
                  </div>
                )}
                {profile.role === 'COLLECTOR' && (
                  <div><span className="font-bold text-lg">{stats.collectorActiveTasks}</span> <span className="text-sm text-muted-foreground">Active Tasks Assigned</span></div>
                )}
                {profile.role === 'ADMIN' && (
                  <p className="text-sm text-muted-foreground">Administrator account.</p>
                )}
              </div>

            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Administrative Actions</CardTitle>
              <CardDescription>Role and access management.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full gap-2" variant="outline">
                    <UserCog className="h-4 w-4" /> Change Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update User Role</DialogTitle>
                    <DialogDescription>Modify what sections of the system this user can access.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CITIZEN">Citizen</SelectItem>
                        <SelectItem value="COLLECTOR">Collector</SelectItem>
                        <SelectItem value="ADMIN">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleRoleChange} disabled={selectedRole === profile.role || isSubmitting}>
                      {isSubmitting ? "Updating..." : "Confirm Role"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                    <ShieldAlert className="h-4 w-4" /> Account Status
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Account Status</DialogTitle>
                    <DialogDescription>Suspend or disable access for this user.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                        <SelectItem value="DISABLED">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedStatus !== 'ACTIVE' && (
                      <p className="text-xs text-red-600 font-medium">Warning: The user will lose access to system features immediately.</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button onClick={handleStatusChange} disabled={selectedStatus === profile.status || isSubmitting} variant="destructive">
                      {isSubmitting ? "Updating..." : "Update Status"}
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
