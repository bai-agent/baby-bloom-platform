import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { NannyCard, NannyCardData, EmptyNannyState } from "@/components/NannyCard";

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

export default async function BrowseNanniesPage({
  searchParams,
}: {
  searchParams: { sort?: string };
}) {
  const sortBy = (SORT_OPTIONS.some((o) => o.key === searchParams.sort)
    ? searchParams.sort
    : "newest") as SortKey;
  const nannies = await getNannies(sortBy);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 md:px-6 py-10 md:py-14">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
              Browse Sydney Nannies
            </h1>
            <p className="mt-3 text-lg text-slate-600">
              Every nanny here has been verified. Browse profiles, check availability, and find the right match for your family.
            </p>
          </div>

          {/* Sort options */}
          <div className="mt-6 flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => {
              const isActive = option.key === sortBy;
              return (
                <Link
                  key={option.key}
                  href={option.key === "newest" ? "/nannies" : `?sort=${option.key}`}
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
        </div>
      </div>

      {/* Nanny Grid */}
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {nannies.length > 0 ? (
            nannies.map((nanny) => (
              <NannyCard key={nanny.id} nanny={nanny} />
            ))
          ) : (
            <EmptyNannyState />
          )}
        </div>

        {/* Load More / Pagination placeholder */}
        {nannies.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-sm text-slate-500 mb-4">
              Showing {nannies.length} nann{nannies.length === 1 ? "y" : "ies"}
            </p>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-white border-t border-slate-200">
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Can&apos;t find what you&apos;re looking for?
              </h2>
              <p className="mt-2 text-slate-600">
                Create an account and we&apos;ll match you with the perfect nanny based on your needs.
              </p>
            </div>
            <Button size="lg" asChild className="bg-violet-500 hover:bg-violet-600 whitespace-nowrap">
              <Link href="/signup">
                Get Matched
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
