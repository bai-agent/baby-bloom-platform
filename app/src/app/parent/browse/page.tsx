import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { NannyCardData } from "@/components/NannyCard";
import { ParentBrowseClient } from "./ParentBrowseClient";

const SORT_OPTIONS = [
  { key: "newest", label: "Newest", column: "created_at", ascending: false },
  { key: "experience", label: "Most Experience", column: "total_experience_years", ascending: false },
  { key: "rate_low", label: "Lowest Rate", column: "hourly_rate_min", ascending: true },
  { key: "rate_high", label: "Highest Rate", column: "hourly_rate_min", ascending: false },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

async function getNannies(sortBy: SortKey = "newest"): Promise<NannyCardData[]> {
  const supabase = createAdminClient();

  const sort = SORT_OPTIONS.find((o) => o.key === sortBy) || SORT_OPTIONS[0];

  const { data: nannies, error } = await supabase
    .from("nannies")
    .select("id, user_id, hourly_rate_min, nanny_experience_years, total_experience_years, verification_tier, drivers_license, vaccination_status, languages, role_types_preferred, ai_content")
    .eq("profile_visible", true)
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .limit(20);

  if (error || !nannies?.length) {
    if (error) console.error("Error fetching nannies:", error);
    return [];
  }

  const userIds = nannies.map((n) => n.user_id);
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("user_id, first_name, last_name, suburb, profile_picture_url")
    .in("user_id", userIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.user_id, p])
  );

  return nannies
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
}

export default async function ParentBrowsePage({
  searchParams,
}: {
  searchParams: { sort?: string };
}) {
  const sortBy = (SORT_OPTIONS.some((o) => o.key === searchParams.sort)
    ? searchParams.sort
    : "newest") as SortKey;
  const nannies = await getNannies(sortBy);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Browse Nannies</h1>
        <p className="mt-1 text-slate-500">
          Find the perfect nanny for your family
        </p>
      </div>

      {/* Sort options */}
      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((option) => {
          const isActive = option.key === sortBy;
          return (
            <Link
              key={option.key}
              href={option.key === "newest" ? "/parent/browse" : `?sort=${option.key}`}
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-violet-100 border-violet-300 text-violet-700"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      {/* Nanny Grid with Client Component for Interview Requests */}
      <ParentBrowseClient nannies={nannies} />
    </div>
  );
}
