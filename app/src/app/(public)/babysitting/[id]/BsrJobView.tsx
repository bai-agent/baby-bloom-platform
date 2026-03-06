"use client";

import { useState, useEffect } from "react";
import { type PublicBsrProfile, applyToBsrPublic, type BsrPublicApplyResult } from "@/lib/actions/babysitting";
import { useAuth } from "@/contexts/AuthContext";
import {
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Baby,
  FileText,
  ArrowRight,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Link from "next/link";

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function ageDisplay(months: number): string {
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}y ${rem}mo` : `${years}y`;
}

interface Props {
  bsr: PublicBsrProfile;
}

export function BsrJobView({ bsr }: Props) {
  const { user, role } = useAuth();

  const [showParentDialog, setShowParentDialog] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<BsrPublicApplyResult | null>(null);

  // Clear stale apply intent after login redirect back
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      sessionStorage.removeItem(`bsr-apply-${bsr.id}`);
    }
  }, [user, bsr.id]);

  async function handleApply() {
    setApplying(true);
    setApplyResult(null);
    const result = await applyToBsrPublic(bsr.id);
    setApplyResult(result);
    setApplying(false);

    if (result.status === 'applied') {
      window.location.href = '/nanny/babysitting';
    } else if (result.status === 'not_nanny' || result.status === 'not_eligible') {
      window.location.href = '/nanny/apply';
    }
  }

  function handleCtaClick() {
    if (!user) {
      // Store apply intent, redirect to login with return URL
      sessionStorage.setItem(`bsr-apply-${bsr.id}`, '1');
      window.location.href = `/login?redirect=/babysitting/${bsr.id}`;
    } else if (role === 'parent') {
      setShowParentDialog(true);
    } else {
      handleApply();
    }
  }

  // "Get a babysitter" link destination
  const getBabysitterHref = !user
    ? '/login'
    : role === 'parent'
      ? '/parent/babysitting'
      : '/nanny/babysitting';

  // Always show CTA — the server action handles routing:
  // ineligible nanny → /nanny/apply, eligible + closed → bsr_closed message
  const showCta = true;

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
          {bsr.parent_profile_pic ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bsr.parent_profile_pic}
              alt={bsr.parent_first_name}
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
            The {bsr.parent_last_name ?? bsr.parent_first_name} family need a babysitter
          </h1>
          <p className="text-xs text-slate-500">
            Posted by {bsr.parent_first_name}
          </p>
        </div>
      </div>

      {/* OG Preview Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/og/babysitting/${bsr.id}`}
        alt="Babysitter Needed"
        className="w-full max-w-[23rem] mx-auto rounded-xl border border-slate-200 shadow-sm"
      />

      {/* Details Card */}
      <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100 max-w-[23rem] mx-auto">
        {/* Location */}
        <div className="flex items-center gap-2.5 px-4 py-2.5">
          <MapPin className="h-4 w-4 text-violet-500 flex-shrink-0" />
          <p className="text-sm font-medium text-slate-800">{bsr.suburb}</p>
        </div>

        {/* Time Slots */}
        {bsr.time_slots.length > 0 && (
          <div className="px-4 py-2.5">
            <div className="flex items-start gap-2.5">
              <Calendar className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                {bsr.time_slots.map((slot, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">
                      {formatDate(slot.slot_date)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <Clock className="h-3 w-3" />
                      {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rate */}
        {bsr.hourly_rate && (
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <DollarSign className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-800">${bsr.hourly_rate}/hr</p>
              {bsr.estimated_hours && (
                <p className="text-[11px] text-slate-400">
                  ~{bsr.estimated_hours}hrs (${Math.round(bsr.hourly_rate * bsr.estimated_hours)} total)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Children */}
        {bsr.children.length > 0 && (
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <Baby className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-800">
                {bsr.children.length} {bsr.children.length === 1 ? "child" : "children"}
              </p>
              <p className="text-[11px] text-slate-400">
                {bsr.children.map((c) => {
                  const g = c.gender?.toLowerCase();
                  const label = g === 'male' || g === 'boy' ? 'Boy' : g === 'female' || g === 'girl' ? 'Girl' : 'Child';
                  return `${label} (${ageDisplay(c.ageMonths)})`;
                }).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Special Requirements */}
        {bsr.special_requirements && (
          <div className="flex items-start gap-2.5 px-4 py-2.5">
            <FileText className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-slate-400 mb-0.5">Special requirements</p>
              <p className="text-sm text-slate-700">{bsr.special_requirements}</p>
            </div>
          </div>
        )}
      </div>

      {/* Apply Result Messages */}
      {applyResult && applyResult.status === 'already_applied' && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 max-w-[23rem] mx-auto flex items-center gap-2">
          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
          You&apos;ve already applied for this job.
        </div>
      )}

      {applyResult && applyResult.status === 'bsr_closed' && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 max-w-[23rem] mx-auto">
          This position is no longer available.
        </div>
      )}

      {applyResult && (applyResult.status === 'clash' || applyResult.status === 'error') && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 max-w-[23rem] mx-auto">
          {applyResult.error}
        </div>
      )}

      {/* CTA */}
      {showCta && (
        <div className="w-full space-y-2 max-w-[23rem] mx-auto">
          <Button
            onClick={handleCtaClick}
            disabled={applying}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white h-10 text-sm"
          >
            {applying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                Babysit for the {bsr.parent_last_name ?? bsr.parent_first_name} family <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <Link
            href={getBabysitterHref}
            className="text-xs text-violet-600 hover:underline text-center block"
          >
            Get a babysitter
          </Link>
        </div>
      )}

      {/* Parent Dialog */}
      <Dialog open={showParentDialog} onOpenChange={setShowParentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Parent account detected</DialogTitle>
            <DialogDescription>
              You are currently signed in with a parent account. Would you like to sign up for a professional childcare account?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowParentDialog(false)}
            >
              No thanks
            </Button>
            <Button
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => {
                window.location.href = '/signup/nanny';
              }}
            >
              Yes, sign up
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Childcare Professional Ad Tile — only for guests */}
      {!user && (
        <Link
          href="/nanny/apply"
          className="flex items-center justify-center w-full max-w-[23rem] mx-auto rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
          style={{ background: 'linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 35%, #C4B5FD 65%, #A78BFA 100%)' }}
        >
          <div className="text-center px-6 py-5">
            <p className="text-lg font-bold text-violet-900 leading-snug">Join our family!</p>
            <p className="text-sm text-violet-700 mt-1">Earn $40–$65/hr+<br />babysitting and/or nannying in Sydney</p>
            <div className="mt-4 inline-flex items-center gap-1.5 bg-white text-violet-700 text-sm font-bold px-6 py-2.5 rounded-lg shadow-md">
              Apply now <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </Link>
      )}

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
