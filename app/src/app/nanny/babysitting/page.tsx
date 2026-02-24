"use client";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { Briefcase } from "lucide-react";

export default function NannyBabysittingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Babysitting Jobs</h1>
        <p className="mt-1 text-slate-500">
          View and respond to one-time babysitting opportunities
        </p>
      </div>

      <EmptyState
        icon={Briefcase}
        title="No babysitting jobs available"
        description="One-time babysitting opportunities in your area will appear here. Complete Tier 3 verification to get notified about new jobs."
        actionLabel="Complete Verification"
        actionHref="/nanny/verification"
      />
    </div>
  );
}
