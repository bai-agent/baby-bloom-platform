import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Award, AlertCircle } from "lucide-react";
import { getNannyPlacements, getNannyUpcomingIntros } from "@/lib/actions/position-funnel";
import { NannyPositionsClient } from "./NannyPositionsClient";

export default async function NannyPositionsPage() {
  const [{ data: placements, error }, { data: upcomingIntros }] = await Promise.all([
    getNannyPlacements(),
    getNannyUpcomingIntros(),
  ]);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Positions</h1>
          <p className="mt-1 text-slate-500">Your nanny placements through Baby Bloom</p>
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

  const hasContent = placements.length > 0 || upcomingIntros.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Positions</h1>
        <p className="mt-1 text-slate-500">Your nanny placements through Baby Bloom</p>
      </div>

      {!hasContent ? (
        <EmptyState
          icon={Award}
          title="No positions yet"
          description="When you're hired through Baby Bloom, your positions will appear here."
        />
      ) : (
        <NannyPositionsClient
          placements={placements}
          upcomingIntros={upcomingIntros}
        />
      )}
    </div>
  );
}
