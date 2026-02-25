"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, isLoading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(localStorage.getItem("bb-sidebar-collapsed") === "true");
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("bb-sidebar-collapsed", String(next));
      return next;
    });
  }

  const sidebarRole = (user && role) ? role : "guest";

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <div className={`fixed inset-y-0 left-0 z-50 transition-all duration-200 ${sidebarCollapsed ? "w-16" : "w-64"}`}>
          <Sidebar role={sidebarRole} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        role={sidebarRole}
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
      />

      {/* Main Content Area */}
      <div className={`flex flex-1 flex-col transition-all duration-200 ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"}`}>
        {user && !isLoading ? (
          <DashboardHeader onMenuClick={() => setMobileNavOpen(true)} />
        ) : (
          <PublicHeader onMenuClick={() => setMobileNavOpen(true)} />
        )}
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
