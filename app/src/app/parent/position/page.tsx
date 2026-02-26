import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { getPosition, PositionWithChildren } from "@/lib/actions/parent";
import { PositionPageClient } from "./PositionPageClient";

const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

const STEPS = [
  {
    step: "1",
    title: "Your Children",
    description: "Tell us about your little ones so we can find the right match",
  },
  {
    step: "2",
    title: "Your Ideal Nanny",
    description: "Set preferences that matter most to your family",
  },
  {
    step: "3",
    title: "Logistics & Location",
    description: "Help us find experienced nannies near you",
  },
  {
    step: "4",
    title: "Weekly Schedule",
    description: "Build your perfect weekly roster in seconds",
  },
  {
    step: "5",
    title: "The Role",
    description: "Define the type of care your family needs",
  },
];

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
          <h1 className="text-2xl font-bold text-slate-900">My Childcare</h1>
          <p className="mt-1 text-slate-500">Create and manage your childcare position</p>
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Childcare</h1>
        <p className="mt-1 text-slate-500">
          {position ? "View and manage your childcare position" : "Create a childcare position to start matching"}
        </p>
      </div>

      <PositionPageClient position={position} />

      {/* How to create — only when no position */}
      {!position && (
        <Card className="border-violet-200 bg-violet-50">
          <CardHeader>
            <CardTitle className="text-violet-900">How to create a childcare position</CardTitle>
            <CardDescription className="text-violet-700">
              It takes about 2 minutes and helps us match you with the right nannies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {STEPS.map((s) => (
                <div key={s.step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-200 text-xs font-bold text-violet-700">
                    {s.step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-violet-900">{s.title}</p>
                    <p className="text-sm text-violet-700">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-violet-600">
              You can only have one active position at a time. You can edit or close it anytime.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
