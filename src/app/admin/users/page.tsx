"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/custom/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, Search, Users, UserCog, User } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/custom/empty-state";

export default function AdminUsersList() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const supabase = createClient();

  useEffect(() => {
    async function fetchUsers() {
      // RLS phase 6 allows admins to select all profiles
      const { data } = await supabase
        .from("profiles")
        .select(`id, full_name, role, status, created_at`)
        .order("created_at", { ascending: false });
      
      setUsers(data || []);
      setLoading(false);
    }
    fetchUsers();
  }, [supabase]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const filtered = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    if (role === 'ADMIN') return <UserCog className="h-5 w-5 text-red-600" />;
    if (role === 'COLLECTOR') return <Users className="h-5 w-5 text-blue-600" />;
    return <User className="h-5 w-5 text-gray-600" />;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage roles, staff, and account statuses.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search by name..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="CITIZEN">Citizen</SelectItem>
              <SelectItem value="COLLECTOR">Collector</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState 
          icon={Search}
          title="No users found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((u) => (
            <Card key={u.id} className="overflow-hidden hover:shadow-sm transition-shadow">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      {getRoleIcon(u.role)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{u.full_name || "Unknown User"}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs font-mono text-gray-500">
                        ID: {u.id.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100">{u.role}</span>
                      <StatusBadge status={u.status} />
                    </div>
                    <Button variant="outline" className="gap-1 w-full sm:w-auto" asChild>
                      <Link href={`/admin/users/${u.id}`}>
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
