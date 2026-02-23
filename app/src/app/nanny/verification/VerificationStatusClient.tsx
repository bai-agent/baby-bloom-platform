"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Clock,
  XCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface VerificationStatusClientProps {
  initialStatus: number | null;
  identityRejectionReason: string | null;
  wwccRejectionReason: string | null;
  wwccExpiryDate: string | null;
  wwccNumber: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Progress Step Component ──

type StepState = "pending" | "active" | "complete" | "failed" | "warning";

function ProgressStep({
  state,
  title,
  subtitle,
  action,
  isLast,
}: {
  state: StepState;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  isLast?: boolean;
}) {
  const iconMap: Record<StepState, React.ReactNode> = {
    pending: (
      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-200 bg-white">
        <div className="h-2 w-2 rounded-full bg-slate-300" />
      </div>
    ),
    active: (
      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-50">
        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      </div>
    ),
    complete: (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
        <CheckCircle2 className="h-5 w-5 text-white" />
      </div>
    ),
    failed: (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500">
        <XCircle className="h-5 w-5 text-white" />
      </div>
    ),
    warning: (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400">
        <Clock className="h-5 w-5 text-white" />
      </div>
    ),
  };

  const titleColor: Record<StepState, string> = {
    pending: "text-slate-400",
    active: "text-blue-700",
    complete: "text-green-700",
    failed: "text-red-700",
    warning: "text-yellow-700",
  };

  const subtitleColor: Record<StepState, string> = {
    pending: "text-slate-400",
    active: "text-blue-500",
    complete: "text-green-600",
    failed: "text-red-500",
    warning: "text-yellow-600",
  };

  return (
    <div className="flex gap-3">
      {/* Timeline line + icon */}
      <div className="flex flex-col items-center">
        {iconMap[state]}
        {!isLast && (
          <div className={`w-0.5 flex-1 my-1 ${state === "complete" ? "bg-green-300" : "bg-slate-200"}`} />
        )}
      </div>

      {/* Content */}
      <div className={`pb-6 ${isLast ? "" : ""}`}>
        <p className={`font-semibold text-sm ${titleColor[state]}`}>{title}</p>
        {subtitle && (
          <p className={`text-xs mt-0.5 ${subtitleColor[state]}`}>{subtitle}</p>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

// ── Derive step states from verification status ──

function getSteps(
  status: number | null,
  identityRejectionReason: string | null,
  wwccRejectionReason: string | null,
) {
  const s = status ?? 0;

  // Step 1: Identity / Passport
  let idState: StepState = "pending";
  let idTitle = "Verify your identity";
  let idSubtitle: string | undefined;
  let idAction: React.ReactNode = undefined;

  if (s === 10) {
    idState = "active";
    idTitle = "Verifying your passport...";
    idSubtitle = "Checking your identity documents";
  } else if (s === 11) {
    idState = "warning";
    idTitle = "Passport under manual review";
    idSubtitle = "Our team is reviewing your documents — usually within 24 hours";
  } else if (s === 12) {
    idState = "failed";
    idTitle = "Passport verification failed";
    idSubtitle = identityRejectionReason ?? "Please resubmit your documents";
    idAction = (
      <Link href="/nanny/verify">
        <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
          Resubmit Passport
        </Button>
      </Link>
    );
  } else if (s >= 20) {
    idState = "complete";
    idTitle = "Passport successfully verified";
  }

  // Step 2: WWCC
  let wwccState: StepState = "pending";
  let wwccTitle = "Verify your WWCC";
  let wwccSubtitle: string | undefined;
  let wwccAction: React.ReactNode = undefined;

  if (s === 20 || s === 25) {
    wwccState = "active";
    wwccTitle = "Verifying your Working With Children Check...";
    wwccSubtitle = "Reviewing your WWCC document";
  } else if (s === 21) {
    wwccState = "warning";
    wwccTitle = "WWCC under manual review";
    wwccSubtitle = "Your WWCC details are being verified on the government portal — usually within 1-3 business days";
  } else if (s === 22) {
    wwccState = "failed";
    wwccTitle = "WWCC verification failed";
    wwccSubtitle = wwccRejectionReason ?? "Please resubmit your WWCC details";
    wwccAction = (
      <Link href="/nanny/verify">
        <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
          Resubmit WWCC
        </Button>
      </Link>
    );
  } else if (s === 23) {
    wwccState = "failed";
    wwccTitle = "WWCC has expired";
    wwccSubtitle = "Please renew your WWCC and resubmit";
    wwccAction = (
      <Link href="/nanny/verify">
        <Button size="sm" variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50">
          Resubmit WWCC
        </Button>
      </Link>
    );
  } else if (s === 24) {
    wwccState = "failed";
    wwccTitle = "We couldn't verify your WWCC document";
    wwccSubtitle = "You can resubmit a clearer document or enter your details manually";
    wwccAction = (
      <Link href="/nanny/verify">
        <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
          Resubmit or Enter Manually
        </Button>
      </Link>
    );
  } else if (s >= 30) {
    wwccState = "complete";
    wwccTitle = "WWCC successfully verified";
  }

  // Step 3: Verification complete
  let completeState: StepState = "pending";
  let completeTitle = "Verification complete";
  let completeSubtitle: string | undefined;

  if (s === 30) {
    completeState = "complete";
    completeTitle = "Provisionally verified";
    completeSubtitle = "You can now receive interview requests";
  } else if (s === 40) {
    completeState = "complete";
    completeTitle = "Fully verified";
    completeSubtitle = "You can receive interview requests and babysitting jobs";
  }

  return { idState, idTitle, idSubtitle, idAction, wwccState, wwccTitle, wwccSubtitle, wwccAction, completeState, completeTitle, completeSubtitle };
}

// ── Main Component ──

export function VerificationStatusClient({
  initialStatus,
  identityRejectionReason,
  wwccRejectionReason,
  wwccExpiryDate,
  wwccNumber,
}: VerificationStatusClientProps) {
  const [status, setStatus] = useState(initialStatus);

  // Poll for status updates while checks are in progress (status 10 or 20)
  const isProcessing = status === 10 || status === 20 || status === 25;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/verification-status");
      if (res.ok) {
        const data = await res.json();
        if (data.status !== null && data.status !== undefined) {
          setStatus(data.status);
        }
      }
    } catch {
      // Silently fail — will retry on next interval
    }
  }, []);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [isProcessing, fetchStatus]);

  const steps = getSteps(status, identityRejectionReason, wwccRejectionReason);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Verification</h1>
        <p className="mt-1 text-slate-500">
          Your verification status and progress
        </p>
      </div>

      {/* Not started */}
      {(status === null || status === 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <ShieldCheck className="h-5 w-5 text-violet-500" />
              Get Verified
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Complete your verification to unlock interview requests and babysitting jobs.
              You&apos;ll need your passport, a selfie, and your WWCC details.
            </p>
            <Link href="/nanny/verify">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                Start Verification
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Progress chain — shown for all active statuses */}
      {status !== null && status > 0 && (
        <Card>
          <CardContent className="p-6">
            <ProgressStep
              state={steps.idState}
              title={steps.idTitle}
              subtitle={steps.idSubtitle}
              action={steps.idAction}
            />
            <ProgressStep
              state={steps.wwccState}
              title={steps.wwccTitle}
              subtitle={steps.wwccSubtitle}
              action={steps.wwccAction}
            />
            <ProgressStep
              state={steps.completeState}
              title={steps.completeTitle}
              subtitle={steps.completeSubtitle}
              isLast
            />
          </CardContent>
        </Card>
      )}

      {/* Success details — shown for verified statuses */}
      {(status === 30 || status === 40) && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-200 flex-shrink-0">
                <ShieldCheck className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-green-800">
                  {status === 40 ? "Fully Verified" : "Provisionally Verified"}
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  {status === 40
                    ? "Congratulations! You can receive interview requests and babysitting job notifications."
                    : "You can now receive interview requests. Full verification will complete once confirmed on the government portal."}
                </p>
                {wwccNumber && (
                  <p className="mt-2 text-sm text-green-600">
                    WWCC: {wwccNumber}
                    {wwccExpiryDate && <> — Expires {formatDate(wwccExpiryDate)}</>}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Benefits Card — shown for early statuses */}
      {(status === null || status === 0 || status === 10 || status === 11 || status === 12) && (
        <Card className="border-violet-200 bg-violet-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-900">
              <ShieldCheck className="h-5 w-5" />
              Verification Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-violet-800">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-violet-600" />
                <span><strong>Level 2:</strong> Identity verified — visible in matchmaking</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-violet-600" />
                <span><strong>Level 3:</strong> Provisionally verified — receive interview requests</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-violet-600" />
                <span><strong>Level 4:</strong> Fully verified — babysitting job notifications</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
