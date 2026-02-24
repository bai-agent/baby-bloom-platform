"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Baby, Plus, Clock, MapPin, DollarSign } from "lucide-react";

export default function ParentBabysittingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Babysitting</h1>
          <p className="mt-1 text-slate-500">
            Request one-time babysitting help
          </p>
        </div>
        <Button className="bg-violet-500 hover:bg-violet-600" disabled>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Empty State */}
      <EmptyState
        icon={Baby}
        title="No babysitting requests"
        description="Need a nanny for a date night or special occasion? Create a babysitting request and we'll notify verified nannies in your area."
        actionLabel="Create Request"
        onAction={() => {}}
      />

      {/* How It Works */}
      <Card className="border-violet-200 bg-violet-50">
        <CardHeader>
          <CardTitle className="text-violet-900">How Babysitting Requests Work</CardTitle>
          <CardDescription className="text-violet-700">
            Quick one-time care for your children
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-200">
                <Clock className="h-5 w-5 text-violet-700" />
              </div>
              <h4 className="font-medium text-violet-900">1. Submit Request</h4>
              <p className="text-sm text-violet-700">
                Choose your preferred dates and time slots (up to 3 options)
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-200">
                <MapPin className="h-5 w-5 text-violet-700" />
              </div>
              <h4 className="font-medium text-violet-900">2. Nannies Notified</h4>
              <p className="text-sm text-violet-700">
                We notify the 20 closest verified nannies in your area
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-200">
                <DollarSign className="h-5 w-5 text-violet-700" />
              </div>
              <h4 className="font-medium text-violet-900">3. First Wins</h4>
              <p className="text-sm text-violet-700">
                First nanny to accept gets the job - fast and fair
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
