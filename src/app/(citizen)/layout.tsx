"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { LayoutDashboard, AlertTriangle, Truck, History, BookOpen, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const citizenLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/report", label: "Report Issue", icon: AlertTriangle },
  { href: "/pickup", label: "Request Pickup", icon: Truck },
  { href: "/history", label: "My History", icon: History },
  { href: "/education", label: "Recycling & Education", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 border-r bg-white md:block">
          <Sidebar links={citizenLinks} />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}
        
        {/* Mobile Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white transition-transform md:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-16 items-center border-b px-4 font-bold text-lg text-primary">
            Menu
            <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setMobileMenuOpen(false)}>
              ×
            </Button>
          </div>
          <Sidebar links={citizenLinks} />
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
