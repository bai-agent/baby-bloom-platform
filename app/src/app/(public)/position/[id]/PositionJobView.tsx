"use client";

import { useEffect } from "react";
import {
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Baby,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PositionProfile {
  id: string;
  suburb: string | null;
  hourlyRate: number | null;
  hoursPerWeek: number | null;
  daysRequired: string[] | null;
  scheduleType: string | null;
  children: Array<{ ageMonths: number; gender: string | null }>;
  parentFirstName: string;
  parentLastName: string | null;
  parentProfilePic: string | null;
}

function ageDisplay(months: number): string {
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}y ${rem}mo` : `${years}y`;
}

interface Props {
  position: PositionProfile;
}

export function PositionJobView({ position }: Props) {
  // Hide global footer on this page
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'none';
    return () => { if (footer) footer.style.display = ''; };
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 space-y-3 flex flex-col min-h-[calc(100dvh-56px)]">
      {/* Header */}
      <div className="relative max-w-[23rem] mx-auto">
        <div className="absolute -left-14 top-1/2 -translate-y-1/2">
          {position.parentProfilePic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={position.parentProfilePic}
              alt={position.parentFirstName}
              className="h-10 w-10 rounded-full object-cover border-2 border-violet-200"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center border-2 border-violet-200">
              <Baby className="h-5 w-5 text-violet-600" />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-800 leading-tight">
            The {position.parentLastName ?? position.parentFirstName} family is looking for a nanny
          </h1>
          <p className="text-xs text-slate-500">
            Posted by {position.parentFirstName}
          </p>
        </div>
      </div>

      {/* OG Preview Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/og/position/${position.id}`}
        alt="Nanny Needed"
        className="w-full max-w-[23rem] mx-auto rounded-xl border border-slate-200 shadow-sm"
      />

      {/* Details Card */}
      <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100 max-w-[23rem] mx-auto">
        {/* Location */}
        {position.suburb && (
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <MapPin className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <p className="text-sm font-medium text-slate-800">{position.suburb}</p>
          </div>
        )}

        {/* Days Required */}
        {position.daysRequired && position.daysRequired.length > 0 && (
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <Calendar className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <p className="text-sm font-medium text-slate-800">
              {position.daysRequired.join(", ")}
            </p>
          </div>
        )}

        {/* Hours per week */}
        {position.hoursPerWeek && (
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <Clock className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <p className="text-sm font-medium text-slate-800">
              ~{position.hoursPerWeek} hrs/week
              {position.scheduleType && (
                <span className="text-slate-500 font-normal"> ({position.scheduleType})</span>
              )}
            </p>
          </div>
        )}

        {/* Rate */}
        {position.hourlyRate && (
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <DollarSign className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <p className="text-sm font-medium text-slate-800">${position.hourlyRate}/hr</p>
          </div>
        )}

        {/* Children */}
        {position.children.length > 0 && (
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <Baby className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-800">
                {position.children.length} {position.children.length === 1 ? "child" : "children"}
              </p>
              <p className="text-[11px] text-slate-400">
                {position.children.map((c) => {
                  const g = c.gender?.toLowerCase();
                  const label = g === 'male' || g === 'boy' ? 'Boy' : g === 'female' || g === 'girl' ? 'Girl' : 'Child';
                  return `${label} (${ageDisplay(c.ageMonths)})`;
                }).join(", ")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="w-full space-y-2 max-w-[23rem] mx-auto">
        <Link href="/nanny/apply">
          <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white h-10 text-sm">
            Apply on Baby Bloom <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Footer */}
      <div className="text-center pt-1 pb-1 space-y-0.5">
        <p className="text-[10px] text-slate-400">
          Powered by{" "}
          <Link href="/" className="text-violet-600 hover:underline font-medium">
            Baby Bloom Sydney
          </Link>
        </p>
        <div className="flex justify-center gap-3 text-[10px] text-slate-400">
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
        </div>
      </div>
    </div>
  );
}
