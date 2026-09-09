"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, CheckCircle2, Check, Clock, AlertTriangle, Package, Trash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setRole(profile?.role || "CITIZEN");

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      setNotifications(data || []);
      setLoading(false);
    }
    fetchNotifications();

    // Set up Realtime
    const channel = supabase.channel('realtime_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router, supabase]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  };

  const getLink = (notif: any) => {
    if (!notif.related_entity_id || !notif.related_entity_type) return null;
    
    if (role === 'ADMIN') {
      if (notif.related_entity_type === 'COMPLAINT') return `/admin/complaints/${notif.related_entity_id}`;
      if (notif.related_entity_type === 'PICKUP') return `/admin/pickups/${notif.related_entity_id}`;
      if (notif.related_entity_type === 'USER') return `/admin/users/${notif.related_entity_id}`;
    } else if (role === 'COLLECTOR') {
      if (notif.related_entity_type === 'COMPLAINT') return `/collector/tasks/complaint/${notif.related_entity_id}`;
      if (notif.related_entity_type === 'PICKUP') return `/collector/tasks/pickup/${notif.related_entity_id}`;
    } else {
      if (notif.related_entity_type === 'COMPLAINT') return `/history/${notif.related_entity_id}`;
      if (notif.related_entity_type === 'PICKUP') return `/history/pickup/${notif.related_entity_id}`;
    }
    return null;
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.read_at) await markAsRead(notif.id);
    const link = getLink(notif);
    if (link) router.push(link);
  };

  const getIcon = (type: string) => {
    if (type.includes('COMPLAINT')) return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    if (type.includes('PICKUP') || type.includes('COLLECTION')) return <Package className="h-5 w-5 text-blue-500" />;
    if (type.includes('COMPLETED') || type.includes('RESOLVED')) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    return <Bell className="h-5 w-5 text-gray-500" />;
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Stay updated on your tasks and reports.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
            <Check className="h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Bell className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold">No notifications yet</h3>
          <p className="text-sm text-muted-foreground mt-1">When you get updates, they&apos;ll show up here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => (
            <Card 
              key={notif.id} 
              className={`overflow-hidden transition-colors cursor-pointer hover:bg-gray-50 ${!notif.read_at ? 'bg-blue-50/50 border-blue-200' : ''}`}
              onClick={() => handleNotificationClick(notif)}
            >
              <CardContent className="p-4 flex gap-4">
                <div className="shrink-0 mt-1">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className={`text-sm font-semibold ${!notif.read_at ? 'text-blue-900' : 'text-gray-900'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-sm ${!notif.read_at ? 'text-blue-800' : 'text-gray-600'}`}>
                    {notif.message}
                  </p>
                </div>
                {!notif.read_at && (
                  <div className="shrink-0 flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
