import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Calendar, Clock, DollarSign, Users } from "lucide-react";
import { getPosition, PositionWithChildren } from "@/lib/actions/parent";
import { PositionPageClient } from "./PositionPageClient";

const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

function PositionSummary({ position }: { position: PositionWithChildren }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Active Position</CardTitle>
            <CardDescription>Created {new Date(position.created_at).toLocaleDateString()}</CardDescription>
          </div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            Active
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Start Date</span>
            </div>
            <p className="mt-1 font-medium">
              {position.urgency === "Immediately" ? "ASAP" : position.start_date ? new Date(position.start_date).toLocaleDateString() : "Flexible"}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Hours/Week</span>
            </div>
            <p className="mt-1 font-medium">
              {position.hours_per_week ? `${position.hours_per_week} hours` : "Flexible"}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Hourly Rate</span>
            </div>
            <p className="mt-1 font-medium">
              {position.hourly_rate ? `$${position.hourly_rate}/hr` : "Not specified"}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Users className="h-4 w-4" />
              <span className="text-sm">Children</span>
            </div>
            <p className="mt-1 font-medium">
              {position.children.length} child{position.children.length !== 1 ? "ren" : ""}
            </p>
          </div>
        </div>

        {position.days_required && position.days_required.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-slate-500 mb-2">Days Required</p>
            <div className="flex flex-wrap gap-2">
              {position.days_required.map((day) => (
                <span key={day} className="rounded-full bg-violet-100 px-3 py-1 text-sm text-violet-700">
                  {day}
                </span>
              ))}
            </div>
          </div>
        )}

        {position.children.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-slate-500 mb-2">Children Ages</p>
            <div className="flex flex-wrap gap-2">
              {position.children.map((child, index) => (
                <span key={index} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                  {child.age_months >= 12
                    ? `${Math.floor(child.age_months / 12)}y ${child.age_months % 12}m`
                    : `${child.age_months}m`}
                  {child.gender && ` (${child.gender})`}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ParentPositionPage() {
  let position: PositionWithChildren | null = null;
  let error: string | null = null;

  if (!isDevMode) {
    const result = await getPosition();
    position = result.data ?? null;
    error = result.error ?? null;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Position</h1>
          <p className="mt-1 text-slate-500">Create and manage your nanny position</p>
        </div>
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Position</h1>
          <p className="mt-1 text-slate-500">
            {position ? "View and edit your nanny position" : "Create a nanny position to start matching"}
          </p>
        </div>
      </div>

      {position ? (
        <>
          <PositionSummary position={position} />
          <PositionPageClient position={position} />
        </>
      ) : (
        <>
          <PositionPageClient position={null} />

          {/* What's Included Card */}
          <Card className="border-violet-200 bg-violet-50">
            <CardHeader>
              <CardTitle className="text-violet-900">What goes in a position?</CardTitle>
              <CardDescription className="text-violet-700">
                Your position helps us match you with the right nannies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-medium text-violet-900">About Your Family</h4>
                  <ul className="space-y-2 text-sm text-violet-800">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-500" />
                      Number of children and their ages
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-500" />
                      Your location in Sydney
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-500" />
                      Any special requirements
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-violet-900">Position Details</h4>
                  <ul className="space-y-2 text-sm text-violet-800">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-500" />
                      Days and hours needed
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-500" />
                      Start date and duration
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-500" />
                      Hourly rate range
                    </li>
                  </ul>
                </div>
              </div>
              <p className="mt-4 text-xs text-violet-600">
                Note: You can only have one active position at a time. If you need a new nanny, close your current position first.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
