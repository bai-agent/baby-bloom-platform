"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ConnectionRequestWithDetails,
  confirmConnectionRequest,
  declineConnectionRequest,
} from "@/lib/actions/connection";
import { InboxMessage, markAsRead, markAllAsRead } from "@/lib/actions/inbox";
import {
  MapPin,
  Clock,
  Calendar,
  Briefcase,
  Baby,
  Phone,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Bell,
  MessageSquare,
  AlertTriangle,
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

function ageMonthsToLabel(months: number): string {
  if (months === 0) return "Newborn";
  if (months < 12) return `${months}mo`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y}y ${m}mo` : `${y}y`;
}

// ── Pending Request Card ──

function PendingRequestCard({ request }: { request: ConnectionRequestWithDetails }) {
  const router = useRouter();
  const [step, setStep] = useState<"initial" | "accept" | "decline">("initial");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [declineReason, setDeclineReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const { text: timeLeft, urgent } = formatTimeLeft(request.expires_at);
  const proposedTimes = request.proposed_times as string[];
  const position = request.position;

  const handleConfirm = async () => {
    if (!selectedTime) {
      setError("Please select a time.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await confirmConnectionRequest(request.id, selectedTime);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || "Failed to confirm.");
    } else {
      router.refresh();
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    setError(null);
    const result = await declineConnectionRequest(request.id, declineReason || undefined);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || "Failed to decline.");
    } else {
      router.refresh();
    }
  };

  return (
    <Card className="border-violet-200 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
              <span className="text-sm font-semibold text-violet-600">
                {request.parent?.first_name?.[0]}
                {request.parent?.last_name?.[0]}
              </span>
            </div>
            <div>
              <CardTitle className="text-base">
                {request.parent?.first_name} {request.parent?.last_name?.[0]}.
              </CardTitle>
              <p className="flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-3 w-3" />
                {request.parent?.suburb}
              </p>
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
      <CardContent className="space-y-4">
        {/* Position Summary */}
        {position && (
          <div className="rounded-lg bg-slate-50 p-3 space-y-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-center justify-between text-sm font-medium text-slate-700"
            >
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                Position Details
              </span>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {expanded && (
              <div className="grid grid-cols-2 gap-2 pt-1 text-sm">
                {position.schedule_type && (
                  <div>
                    <span className="text-slate-500">Type</span>
                    <p className="font-medium capitalize">{position.schedule_type.replace(/_/g, " ")}</p>
                  </div>
                )}
                {position.hours_per_week && (
                  <div>
                    <span className="text-slate-500">Hours</span>
                    <p className="font-medium">{position.hours_per_week}h/week</p>
                  </div>
                )}
                {position.days_required && position.days_required.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-slate-500">Days</span>
                    <p className="font-medium">{position.days_required.join(", ")}</p>
                  </div>
                )}
                {position.hourly_rate && (
                  <div>
                    <span className="text-slate-500">Rate</span>
                    <p className="font-medium">${position.hourly_rate}/hr</p>
                  </div>
                )}
                {position.level_of_support && position.level_of_support.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-slate-500">Support</span>
                    <p className="font-medium">{position.level_of_support.join(", ")}</p>
                  </div>
                )}
                {position.children && position.children.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Baby className="h-3 w-3" /> Children
                    </span>
                    <p className="font-medium">
                      {position.children
                        .map((c) => ageMonthsToLabel(c.age_months))
                        .join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Parent's Message */}
        {request.message && (
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <MessageSquare className="h-3 w-3" /> Message
            </p>
            <p className="text-sm text-slate-700">{request.message}</p>
          </div>
        )}

        {/* Step: Initial — Accept / Decline */}
        {step === "initial" && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep("decline")}
            >
              Decline
            </Button>
            <Button
              className="flex-1 bg-violet-500 hover:bg-violet-600"
              onClick={() => setStep("accept")}
            >
              Accept
            </Button>
          </div>
        )}

        {/* Step: Accept — Phone notice + time selection */}
        {step === "accept" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
              <Phone className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Accepting will share your phone number with this family so they
                can call you at the confirmed time.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Select a time
              </p>
              {proposedTimes.map((time) => (
                <label
                  key={time}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    selectedTime === time
                      ? "border-violet-400 bg-violet-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`time-${request.id}`}
                    value={time}
                    checked={selectedTime === time}
                    onChange={() => setSelectedTime(time)}
                    className="accent-violet-600"
                  />
                  <span className="text-sm">{formatDate(time)}</span>
                </label>
              ))}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setStep("initial");
                  setSelectedTime("");
                  setError(null);
                }}
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!selectedTime || submitting}
                onClick={handleConfirm}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Confirm
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Decline — Optional reason */}
        {step === "decline" && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Reason (optional)
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={2}
                placeholder="Let us know why (this is private and won't be shared with the family)..."
                className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setStep("initial");
                  setDeclineReason("");
                  setError(null);
                }}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={submitting}
                onClick={handleDecline}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Declining...
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Decline
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400">
          Received {formatDate(request.created_at)}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Notification Item ──

function NotificationItem({
  message,
  onMarkRead,
}: {
  message: InboxMessage;
  onMarkRead: (id: string) => void;
}) {
  const getIcon = () => {
    switch (message.type) {
      case "connection_confirmed_nanny":
      case "connection_confirmed":
        return <Check className="h-4 w-4 text-green-600" />;
      case "connection_expired":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "connection_cancelled":
        return <X className="h-4 w-4 text-slate-500" />;
      default:
        return <Bell className="h-4 w-4 text-violet-500" />;
    }
  };

  return (
    <div
      onClick={() => !message.is_read && onMarkRead(message.id)}
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
        message.is_read
          ? "border-slate-100 bg-white"
          : "border-violet-200 bg-violet-50"
      }`}
    >
      <div className="mt-0.5 flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            message.is_read ? "text-slate-600" : "font-medium text-slate-900"
          }`}
        >
          {message.title}
        </p>
        {message.body && (
          <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">
            {message.body}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          {formatDate(message.created_at)}
        </p>
      </div>
      {!message.is_read && (
        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-violet-500" />
      )}
    </div>
  );
}

// ── Past Connection Card ──

function PastConnectionCard({ request }: { request: ConnectionRequestWithDetails }) {
  const statusConfig: Record<string, { label: string; style: string }> = {
    confirmed: { label: "Confirmed", style: "bg-green-100 text-green-800" },
    declined: { label: "Declined", style: "bg-red-100 text-red-800" },
    cancelled: { label: "Cancelled", style: "bg-slate-100 text-slate-600" },
    expired: { label: "Expired", style: "bg-amber-100 text-amber-800" },
  };
  const config = statusConfig[request.status] || {
    label: request.status,
    style: "bg-slate-100 text-slate-600",
  };

  return (
    <Card className="opacity-75">
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
            <span className="text-xs font-medium text-slate-500">
              {request.parent?.first_name?.[0]}
              {request.parent?.last_name?.[0]}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">
              {request.parent?.first_name} {request.parent?.last_name?.[0]}.
            </p>
            <p className="text-xs text-slate-400">
              {formatDate(request.created_at)}
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

// ── Main Client Component ──

interface NannyInboxClientProps {
  pendingRequests: ConnectionRequestWithDetails[];
  notifications: InboxMessage[];
  pastConnections: ConnectionRequestWithDetails[];
}

export function NannyInboxClient({
  pendingRequests,
  notifications,
  pastConnections,
}: NannyInboxClientProps) {
  const router = useRouter();
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    router.refresh();
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    await markAllAsRead();
    setMarkingAllRead(false);
    router.refresh();
  };

  return (
    <div className="space-y-8">
      {/* Action Required */}
      {pendingRequests.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
              {pendingRequests.length}
            </span>
            Action Required
          </h2>
          <div className="grid gap-4">
            {pendingRequests.map((req) => (
              <PendingRequestCard key={req.id} request={req} />
            ))}
          </div>
        </section>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
              >
                {markingAllRead ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : null}
                Mark all read
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {notifications.map((msg) => (
              <NotificationItem
                key={msg.id}
                message={msg}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        </section>
      )}

      {/* Past Connections */}
      {pastConnections.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-700">
            Past Connections
          </h2>
          <div className="grid gap-2">
            {pastConnections.map((req) => (
              <PastConnectionCard key={req.id} request={req} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
