"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ConnectionRequestWithDetails,
  cancelConnectionRequest,
} from "@/lib/actions/connection";
import {
  MapPin,
  Clock,
  Phone,
  Loader2,
  Check,
  X,
  Calendar,
  DollarSign,
} from "lucide-react";

function formatTimeLeft(expiresAt: string | null): { text: string; urgent: boolean } {
  if (!expiresAt) return { text: "", urgent: false };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { text: "Expired", urgent: true };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours < 6) return { text: `${hours}h ${minutes}m left`, urgent: true };
  if (hours < 24) return { text: `${hours}h left`, urgent: false };
  const days = Math.floor(hours / 24);
  return { text: `${days}d ${hours % 24}h left`, urgent: false };
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface ParentConnectionsClientProps {
  requests: ConnectionRequestWithDetails[];
}

export function ParentConnectionsClient({ requests }: ParentConnectionsClientProps) {
  const router = useRouter();

  const confirmed = requests.filter((r) => r.status === "confirmed");
  const pending = requests.filter((r) => r.status === "pending");
  const past = requests.filter((r) =>
    ["declined", "cancelled", "expired"].includes(r.status)
  );

  return (
    <div className="space-y-8">
      {/* Confirmed */}
      {confirmed.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-green-700">
            <Check className="h-5 w-5" />
            Confirmed ({confirmed.length})
          </h2>
          <div className="grid gap-4">
            {confirmed.map((req) => (
              <ConfirmedCard key={req.id} request={req} />
            ))}
          </div>
        </section>
      )}

      {/* Awaiting Response */}
      {pending.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-700">
            <Clock className="h-5 w-5" />
            Awaiting Response ({pending.length})
          </h2>
          <div className="grid gap-4">
            {pending.map((req) => (
              <PendingCard
                key={req.id}
                request={req}
                onCancelled={() => router.refresh()}
              />
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-500">
            Past ({past.length})
          </h2>
          <div className="grid gap-2">
            {past.map((req) => (
              <PastCard key={req.id} request={req} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Confirmed Card ──

function ConfirmedCard({ request }: { request: ConnectionRequestWithDetails }) {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <span className="text-sm font-semibold text-green-700">
                {request.nanny?.first_name?.[0]}
                {request.nanny?.last_name?.[0]}
              </span>
            </div>
            <div>
              <CardTitle className="text-base">
                {request.nanny?.first_name} {request.nanny?.last_name?.[0]}.
              </CardTitle>
              <CardDescription className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {request.nanny?.suburb}
                </span>
                {request.nanny?.hourly_rate_min && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${request.nanny.hourly_rate_min}/hr
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Confirmed
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-green-200 bg-white p-4 space-y-3">
          {request.confirmed_time && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-800">
                {formatDate(request.confirmed_time)}
              </p>
            </div>
          )}
          {request.nanny_phone_shared && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-green-600" />
              <p className="text-lg font-bold text-green-800">
                {request.nanny_phone_shared}
              </p>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Please call {request.nanny?.first_name} at the confirmed time.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Pending Card ──

function PendingCard({
  request,
  onCancelled,
}: {
  request: ConnectionRequestWithDetails;
  onCancelled: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { text: timeLeft, urgent } = formatTimeLeft(request.expires_at);
  const proposedTimes = request.proposed_times as string[];

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    const result = await cancelConnectionRequest(request.id);
    setCancelling(false);
    if (!result.success) {
      setError(result.error || "Failed to cancel.");
    } else {
      onCancelled();
    }
  };

  return (
    <Card className="border-amber-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <span className="text-sm font-semibold text-amber-700">
                {request.nanny?.first_name?.[0]}
                {request.nanny?.last_name?.[0]}
              </span>
            </div>
            <div>
              <CardTitle className="text-base">
                <Link
                  href={`/nannies/${request.nanny_id}`}
                  className="hover:text-violet-600 transition-colors"
                >
                  {request.nanny?.first_name} {request.nanny?.last_name?.[0]}.
                </Link>
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {request.nanny?.suburb}
              </CardDescription>
            </div>
          </div>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              urgent
                ? "bg-red-100 text-red-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <Clock className="h-3 w-3" />
            {timeLeft}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Proposed Times */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase">Proposed Times</p>
          {proposedTimes.map((time, i) => (
            <p key={i} className="text-sm text-slate-700">
              #{i + 1}: {formatDate(time)}
            </p>
          ))}
        </div>

        {request.message && (
          <p className="text-sm text-slate-500 italic">"{request.message}"</p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Cancel */}
        {!showConfirmCancel ? (
          <Button
            variant="outline"
            size="sm"
            className="text-slate-500"
            onClick={() => setShowConfirmCancel(true)}
          >
            Cancel Request
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm text-slate-600">Cancel this request?</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirmCancel(false)}
            >
              No
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={cancelling}
              onClick={handleCancel}
            >
              {cancelling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <X className="mr-1 h-3 w-3" />
                  Yes, Cancel
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Past Card ──

function PastCard({ request }: { request: ConnectionRequestWithDetails }) {
  const statusConfig: Record<string, { label: string; style: string }> = {
    declined: { label: "Declined", style: "bg-red-100 text-red-800" },
    cancelled: { label: "Cancelled", style: "bg-slate-100 text-slate-600" },
    expired: { label: "Expired", style: "bg-amber-100 text-amber-800" },
  };
  const config = statusConfig[request.status] || {
    label: request.status,
    style: "bg-slate-100 text-slate-600",
  };

  return (
    <Card className="opacity-60">
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
            <span className="text-xs font-medium text-slate-500">
              {request.nanny?.first_name?.[0]}
              {request.nanny?.last_name?.[0]}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              {request.nanny?.first_name} {request.nanny?.last_name?.[0]}.
            </p>
            <p className="text-xs text-slate-400">
              {new Date(request.created_at).toLocaleDateString("en-AU")}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.style}`}
        >
          {config.label}
        </span>
      </CardContent>
    </Card>
  );
}
