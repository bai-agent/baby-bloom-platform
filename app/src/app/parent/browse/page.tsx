import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { type NannyCardData, EmptyNannyState } from "@/components/NannyCard";
import { NannyCardBK } from "@/app/brandkit1/NannyCardBK";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { key: "newest", label: "Newest", column: "created_at", ascending: false },
  { key: "experience", label: "Most Experience", column: "total_experience_years", ascending: false },
  { key: "rate_low", label: "Lowest Rate", column: "hourly_rate_min", ascending: true },
  { key: "rate_high", label: "Highest Rate", column: "hourly_rate_min", ascending: false },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

async function getNannies(sortBy: SortKey = "newest", page: number = 1): Promise<{ nannies: NannyCardData[]; total: number }> {
  const supabase = createAdminClient();

  const sort = SORT_OPTIONS.find((o) => o.key === sortBy) || SORT_OPTIONS[0];
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: nannies, error, count } = await supabase
    .from("nannies")
    .select("id, user_id, hourly_rate_min, nanny_experience_years, total_experience_years, verification_tier, drivers_license, vaccination_status, languages, role_types_preferred, ai_content", { count: "exact" })
    .eq("profile_visible", true)
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .range(from, to);

  if (error || !nannies?.length) {
    if (error) console.error("Error fetching nannies:", error);
    return { nannies: [], total: 0 };
  }

  const userIds = nannies.map((n) => n.user_id);
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, first_name, last_name, suburb, profile_picture_url")
    .in("user_id", userIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.user_id, p])
  );

  const mapped = nannies
    .map((nanny) => {
      const profile = profileMap.get(nanny.user_id);
      if (!profile) return null;
      const ai = nanny.ai_content as Record<string, unknown> | null;
      return {
        id: nanny.id,
        user_id: nanny.user_id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        suburb: profile.suburb,
        profile_picture_url: profile.profile_picture_url,
        hourly_rate_min: nanny.hourly_rate_min,
        nanny_experience_years: nanny.nanny_experience_years,
        total_experience_years: nanny.total_experience_years,
        verification_tier: nanny.verification_tier,
        drivers_license: nanny.drivers_license,
        vaccination_status: nanny.vaccination_status,
        languages: nanny.languages,
        role_types_preferred: nanny.role_types_preferred,
        ai_headline: (ai?.headline as string) || null,
      } as NannyCardData;
    })
    .filter((n): n is NannyCardData => n !== null);

  return { nannies: mapped, total: count || 0 };
}

function buildHref(sort: string, page: number) {
  const params = new URLSearchParams();
  if (sort !== "newest") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/parent/browse${qs ? `?${qs}` : ""}`;
}

export default async function ParentBrowsePage({
  searchParams,
}: {
  searchParams: { sort?: string; page?: string };
}) {
  const sortBy = (SORT_OPTIONS.some((o) => o.key === searchParams.sort)
    ? searchParams.sort
    : "newest") as SortKey;
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const { nannies, total } = await getNannies(sortBy, page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back link */}
      <Link
        href="/parent"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors mb-4"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to profile
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Browse Nannies</h1>
        <p className="mt-1 text-sm text-slate-500">
          Verified nannies in Sydney ready to join your family
        </p>
      </div>

      {/* Sort pills */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 mb-5">
        {SORT_OPTIONS.map((option) => {
          const isActive = option.key === sortBy;
          return (
            <Link
              key={option.key}
              href={buildHref(option.key, 1)}
              className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-medium transition-all ${
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      {/* Nanny List */}
      {nannies.length > 0 ? (
        <div className="space-y-3">
          {nannies.map((nanny) => (
            <NannyCardBK key={nanny.id} nanny={nanny} linkBase="/parent/browse" />
          ))}
        </div>
      ) : (
        <EmptyNannyState />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 ? (
            <Link
              href={buildHref(sortBy, page - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <div className="h-8 w-8" />
          )}

          <span className="text-sm text-slate-500 px-2">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={buildHref(sortBy, page + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="h-8 w-8" />
          )}
        </div>
      )}

      {/* Count */}
      {nannies.length > 0 && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} nann{total === 1 ? "y" : "ies"}
        </p>
      )}

      {/* CTA */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-center space-y-3">
        <h2 className="text-base font-semibold text-slate-900">
          Can&apos;t find the right match?
        </h2>
        <p className="text-sm text-slate-500">
          Let our matchmaker find the perfect nanny for you.
        </p>
        <Button asChild className="bg-violet-600 hover:bg-violet-700">
          <Link href="/parent/matchmaking">
            Get Matched
            <ArrowRight className="ml-1.5 w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
