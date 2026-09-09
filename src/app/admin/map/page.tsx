import { AdminMapWrapper } from "@/components/map/AdminMapWrapper";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminMapPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "ADMIN") redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Operations Map</h1>
        <p className="text-muted-foreground">Geographic distribution and density of municipal operations.</p>
      </div>
      
      <AdminMapWrapper />
    </div>
  );
}
