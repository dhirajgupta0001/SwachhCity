"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { LayoutDashboard, AlertTriangle, Truck, Users, BarChart3, FileText, ShieldAlert, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/complaints", label: "Complaints", icon: AlertTriangle },
  { href: "/admin/pickups", label: "Pickups", icon: Truck },
  { href: "/admin/map", label: "Operations Map", icon: MapPin },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/feedback", label: "Feedback", icon: Star },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/audit", label: "Audit Logs", icon: ShieldAlert },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
      
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 border-r bg-white md:block">
          <Sidebar links={adminLinks} />
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}
        
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white transition-transform md:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-16 items-center border-b px-4 font-bold text-lg text-primary">
            Admin Menu
            <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setMobileMenuOpen(false)}>
              ×
            </Button>
          </div>
          <Sidebar links={adminLinks} />
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
