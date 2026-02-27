"use client";

import { useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import type { MatchResult } from "@/lib/matching/types";
import { Users, MapPin, Briefcase } from "lucide-react";

type SortKey = "score" | "distance" | "experience";

const SORT_OPTIONS: { key: SortKey; label: string; icon: typeof Users }[] = [
  { key: "score", label: "Best Match", icon: Users },
  { key: "distance", label: "Closest", icon: MapPin },
  { key: "experience", label: "Most Experienced", icon: Briefcase },
];

interface MatchResultsClientProps {
  matches: MatchResult[];
  stats: { totalEligible: number; returned: number };
}

function sortMatches(matches: MatchResult[], sortBy: SortKey): MatchResult[] {
  const sorted = [...matches];
  switch (sortBy) {
    case "score":
      return sorted.sort((a, b) => b.finalScore - a.finalScore);
    case "distance":
      return sorted.sort((a, b) => {
        const da = a.distanceKm ?? 999;
        const db = b.distanceKm ?? 999;
        return da - db;
      });
    case "experience":
      return sorted.sort((a, b) => {
        const ea =
          b.nanny.nanny_experience_years ??
          b.nanny.total_experience_years ??
          0;
        const eb =
          a.nanny.nanny_experience_years ??
          a.nanny.total_experience_years ??
          0;
        return ea - eb;
      });
    default:
      return sorted;
  }
}

export function MatchResultsClient({
  matches,
  stats,
}: MatchResultsClientProps) {
  const [sortBy, setSortBy] = useState<SortKey>("score");

  const sorted = sortMatches(matches, sortBy);

  return (
    <>
      {/* Sort + stats bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-500">
          {stats.returned} match{stats.returned !== 1 ? "es" : ""} found
          {stats.totalEligible > stats.returned &&
            ` out of ${stats.totalEligible} verified nannies`}
        </p>
        <div className="flex gap-2">
          {SORT_OPTIONS.map((option) => {
            const isActive = option.key === sortBy;
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                onClick={() => setSortBy(option.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-violet-100 border-violet-300 text-violet-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Match grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sorted.map((match) => (
          <MatchCard
            key={match.nannyId}
            match={match}
          />
        ))}
      </div>
    </>
  );
}
