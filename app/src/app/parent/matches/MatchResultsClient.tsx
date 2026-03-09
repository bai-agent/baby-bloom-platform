"use client";

import { useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import type { MatchResult } from "@/lib/matching/types";
import { Users, MapPin, Briefcase, Sparkles, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type SortKey = "score" | "distance" | "experience";

const SORT_OPTIONS: { key: SortKey; label: string; icon: typeof Users }[] = [
  { key: "score", label: "Best Match", icon: Users },
  { key: "distance", label: "Closest", icon: MapPin },
  { key: "experience", label: "Most Experienced", icon: Briefcase },
];

interface DfyStatusData {
  activated: boolean;
  activatedAt: string | null;
  expiresAt: string | null;
  expired: boolean;
  notifiedCount: number;
  interestedCount: number;
  approvedCount: number;
  hasPendingShare: boolean;
  tier: 'standard' | 'priority' | null;
  maxRespondents: number;
}

interface MatchResultsClientProps {
  matches: MatchResult[];
  stats: { totalEligible: number; returned: number };
  dfyStatus?: DfyStatusData;
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
  dfyStatus,
}: MatchResultsClientProps) {
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const dfyTriggered = dfyStatus?.activated ?? false;

  const sorted = sortMatches(matches, sortBy);

  // Determine DFY banner state
  const hasPendingShare = dfyStatus?.hasPendingShare ?? false;
  const isExpired = dfyTriggered && (dfyStatus?.expired ?? false);
  const isActive = dfyTriggered && !isExpired;

  const expiryDisplay = dfyStatus?.expiresAt
    ? new Date(dfyStatus.expiresAt).toLocaleDateString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Australia/Sydney",
      })
    : null;

  return (
    <>
      {/* DFY banner — 4 states */}
      {hasPendingShare && !dfyTriggered ? (
        /* State 0: Time slots saved, confirmation pending */
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-violet-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-600" />
              Complete your matchmaker request
            </h3>
            <p className="text-sm text-violet-700 mt-1">
              Your intro call times are saved. Confirm to activate your matchmaker.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/parent/matches/matchmaker">
              <Button variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50">
                Edit times
              </Button>
            </Link>
            <Link href="/parent/matches/checkout">
              <Button className="bg-violet-600 hover:bg-violet-700">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Continue
              </Button>
            </Link>
          </div>
        </div>
      ) : !dfyTriggered ? (
        /* State 1: Not triggered — link to matchmaker page */
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-violet-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-600" />
              Let us find your nanny
            </h3>
            <p className="text-sm text-violet-700 mt-1">
              We&apos;ll contact your top matches and let interested nannies come to you.
            </p>
          </div>
          <Link href="/parent/matches/matchmaker">
            <Button className="bg-violet-600 hover:bg-violet-700 shrink-0">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Find me a nanny
            </Button>
          </Link>
        </div>
      ) : isActive ? (
        /* State 2: Active */
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-5 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">
              {dfyStatus?.tier === 'priority'
                ? "Your position is live \u2014 we're reaching out to your best matched nannies in 3 waves!"
                : "We've contacted your top 20 matched nannies!"}
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              {expiryDisplay && <>Active until {expiryDisplay}</>}
              {dfyStatus?.interestedCount
                ? <> &mdash; {dfyStatus.interestedCount}/{dfyStatus.maxRespondents} nann{dfyStatus.interestedCount !== 1 ? "ies" : "y"} interested</>
                : <> &mdash; Waiting for responses</>}
              {dfyStatus?.interestedCount ? (
                <> &mdash; <a href="/parent/position" className="underline font-medium">review applicants</a></>
              ) : null}
            </p>
          </div>
        </div>
      ) : (
        /* State 3: Expired — link to matchmaker page */
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Your search has completed
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {dfyStatus?.interestedCount
                ? <>{dfyStatus.interestedCount} nann{dfyStatus.interestedCount !== 1 ? "ies" : "y"} still interested &mdash; <a href="/parent/position" className="underline font-medium">review applicants</a></>
                : <>All matched nannies have been notified. Boost again to reach more nannies.</>}
            </p>
          </div>
          <Link href="/parent/matches/matchmaker">
            <Button className="bg-violet-600 hover:bg-violet-700 shrink-0">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Boost again
            </Button>
          </Link>
        </div>
      )}

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
