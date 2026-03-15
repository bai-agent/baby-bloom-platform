"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MapPin, ShieldCheck, Car, Stethoscope, Globe, Clock } from "lucide-react";
import type { NannyCardData } from "@/components/NannyCard";
import { ExpandableBadges, type TraitBadge } from "./ExpandableBadges";

interface NannyCardBKProps {
  nanny: NannyCardData;
  age?: number | null;
  linkBase?: string;
}

function buildBadges(nanny: NannyCardData): TraitBadge[] {
  const badges: TraitBadge[] = [];
  const exp = nanny.nanny_experience_years || nanny.total_experience_years;
  if (exp != null) {
    badges.push({ icon: Clock, label: `${exp} yr${exp !== 1 ? "s" : ""} experience`, variant: "violet" });
  }
  if (nanny.drivers_license) badges.push({ icon: Car, label: "License", variant: "slate" });
  if (nanny.vaccination_status) badges.push({ icon: Stethoscope, label: "Vaccinated", variant: "slate" });
  if (nanny.languages && nanny.languages.length > 1) {
    const extra = nanny.languages.filter(l => l !== "English");
    badges.push({ icon: Globe, label: `+${extra.length} language, ${extra.join(", ")}`, variant: "slate" });
  }
  return badges;
}

export function NannyCardBK({ nanny, age, linkBase = "/nannies" }: NannyCardBKProps) {
  const initials = `${nanny.first_name[0]}${nanny.last_name[0]}`;
  const isVerified =
    nanny.verification_tier === "tier2" || nanny.verification_tier === "tier3";

  return (
    <Link href={`${linkBase}/${nanny.id}`} className="block group">
      <Card className="overflow-hidden transition-all hover:shadow-lg hover:border-violet-200">
        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Profile picture */}
            <div className="relative shrink-0">
              {nanny.profile_picture_url ? (
                <img
                  src={nanny.profile_picture_url}
                  alt={`${nanny.first_name} ${nanny.last_name}`}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-violet-500">
                    {initials}
                  </span>
                </div>
              )}
              {isVerified && (
                <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-green-500 ring-2 ring-white">
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>

            {/* Name, location */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-semibold text-lg text-slate-900 truncate group-hover:text-violet-600 transition-colors">
                      {nanny.first_name} {nanny.last_name[0]}.
                    </h3>
                    {age && (
                      <span className="text-base text-slate-400 shrink-0">{age}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{nanny.suburb}</span>
                  </div>
                </div>
              </div>

              {/* AI headline */}
              {nanny.ai_headline && (
                <p className="mt-2 text-xs text-slate-500 italic line-clamp-2">
                  {nanny.ai_headline.replace(/<[^>]*>/g, "")}
                </p>
              )}
            </div>
          </div>

          <ExpandableBadges badges={buildBadges(nanny)} preventLinkNavigation />
        </div>
      </Card>
    </Link>
  );
}
