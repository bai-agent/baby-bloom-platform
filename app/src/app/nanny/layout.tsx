'use client';

import { DashboardNav } from '@/components/layout/DashboardNav';

// Hub Migration: Sidebar hidden — navigation via hub tiles
// import { Sidebar } from '@/components/layout/Sidebar';
// import { DashboardHeader } from '@/components/layout/DashboardHeader';
// import { MobileNav } from '@/components/layout/MobileNav';

export default function NannyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <DashboardNav role="nanny" />
      <main className="flex-1 p-4 lg:p-6">{children}</main>
    </div>
  );
}
