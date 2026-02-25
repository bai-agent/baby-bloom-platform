"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ConnectionRequestWithDetails,
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelConnectionRequest,
} from "@/lib/actions/connection";
import { InboxMessage, markAsRead, markAllAsRead } from "@/lib/actions/inbox";
import { formatSydneyDate, getNext7Days, TIME_BRACKETS, BRACKET_KEYS } from "@/lib/timezone";
import {
  Clock,
  Calendar,
  Briefcase,
  Baby,
  Phone,
  Loader2,
  Check,
  X,
  Bell,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  UserCheck,
  PhoneCall,
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

function ageMonthsToLabel(months: number): string {
  if (months === 0) return "Newborn";
  if (months < 12) return `${months}mo`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y}y ${m}mo` : `${y}y`;
}

// ── Connection Detail Modal ──

function ConnectionDetailModal({
  request,
  onClose,
}: {
  request: ConnectionRequestWithDetails;
  onClose: () => void;
}) {
  const router = useRouter();
  const [action, setAction] = useState<"none" | "availability" | "decline" | "cancelling">("none");
  const [declineReason, setDeclineReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  const position = request.position;
  const isPending = request.status === "pending";
  const isAccepted = request.status === "accepted";
  const isConfirmed = request.status === "confirmed";

  // Availability grid data
  const next7Days = getNext7Days();
  const allSlots = next7Days.flatMap(day =>
    BRACKET_KEYS.map(bracket => `${day.date}_${bracket}`)
  );

  const toggleSlot = (slot: string) => {
    setSelectedSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  const selectAll = () => setSelectedSlots([...allSlots]);
  const clearAll = () => setSelectedSlots([]);

  // Validation
  const selectedBrackets = new Set(selectedSlots.map(s => s.split("_")[1]));
  const selectedDays = new Set(selectedSlots.map(s => s.split("_")[0]));
  const hasEnoughSlots = selectedSlots.length >= 5;
  const hasAllBrackets = selectedBrackets.size >= 4;
  const hasEnoughDays = selectedDays.size >= 3;
  const isValid = hasEnoughSlots && hasAllBrackets && hasEnoughDays;

  const handleAccept = async () => {
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    const result = await acceptConnectionRequest(request.id, selectedSlots);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || "Failed to accept.");
    } else {
      onClose();
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
      onClose();
      router.refresh();
    }
  };

  const handleCancel = async () => {
    setSubmitting(true);
    setError(null);
    const result = await cancelConnectionRequest(request.id);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || "Failed to cancel.");
    } else {
      onClose();
      router.refresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
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
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ── Step 2: Availability grid (separate page) ── */}
          {isPending && action === "availability" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  When are you available for a 15-minute intro call?
                </p>
                <p className="text-xs text-slate-500">
                  Select at least 5 slots across all time brackets and 3+ days.
                </p>
              </div>

              {/* Anytime / Clear buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectedSlots.length === allSlots.length ? clearAll : selectAll}
                  className={selectedSlots.length === allSlots.length ? "bg-violet-100 border-violet-300 text-violet-700" : ""}
                >
                  {selectedSlots.length === allSlots.length ? "Clear All" : "Anytime"}
                </Button>
                {selectedSlots.length > 0 && selectedSlots.length < allSlots.length && (
                  <span className="text-xs text-slate-500 self-center">
                    {selectedSlots.length} selected
                  </span>
                )}
              </div>

              {/* Grid — dates as rows, brackets as columns */}
              <div className="overflow-x-auto -mx-4 px-4">
                <div className="min-w-[360px]">
                  {/* Bracket column headers */}
                  <div className="grid grid-cols-[90px_repeat(4,1fr)] gap-1 mb-1">
                    <div />
                    {BRACKET_KEYS.map(bracket => (
                      <div key={bracket} className="text-center">
                        <p className="text-xs font-semibold text-slate-600">{TIME_BRACKETS[bracket].label}</p>
                        <p className="text-[10px] text-slate-400">{TIME_BRACKETS[bracket].sublabel}</p>
                      </div>
                    ))}
                  </div>

                  {/* Date rows */}
                  {next7Days.map(day => (
                    <div key={day.date} className="grid grid-cols-[90px_repeat(4,1fr)] gap-1 mb-1">
                      <div className="flex items-center">
                        <div>
                          <p className="text-xs font-semibold text-slate-600">{day.dayLabel}</p>
                          <p className="text-[10px] text-slate-400">{day.dateLabel}</p>
                        </div>
                      </div>
                      {BRACKET_KEYS.map(bracket => {
                        const slot = `${day.date}_${bracket}`;
                        const isSelected = selectedSlots.includes(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => toggleSlot(slot)}
                            className={`h-10 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-violet-600 text-white border-violet-600"
                                : "bg-white text-slate-400 border-slate-200 hover:border-violet-400"
                            }`}
                          >
                            {isSelected ? "\u2713" : ""}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Validation hints */}
              <div className="space-y-1">
                <p className={`text-xs ${hasEnoughSlots ? "text-green-600" : "text-slate-400"}`}>
                  {hasEnoughSlots ? "\u2713" : "\u25CB"} At least 5 slots selected ({selectedSlots.length}/5)
                </p>
                <p className={`text-xs ${hasAllBrackets ? "text-green-600" : "text-slate-400"}`}>
                  {hasAllBrackets ? "\u2713" : "\u25CB"} All 4 time brackets covered ({selectedBrackets.size}/4)
                </p>
                <p className={`text-xs ${hasEnoughDays ? "text-green-600" : "text-slate-400"}`}>
                  {hasEnoughDays ? "\u2713" : "\u25CB"} At least 3 different days ({selectedDays.size}/3)
                </p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setAction("none");
                    setSelectedSlots([]);
                    setError(null);
                  }}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 bg-violet-500 hover:bg-violet-600"
                  disabled={!isValid || submitting}
                  onClick={handleAccept}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Confirm Availability
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
          /* ── Step 1: Request details + actions ── */
          <>
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {isPending && action !== "decline" && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                Pending — Awaiting your response
              </span>
            )}
            {isAccepted && (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                Accepted — Waiting for family to schedule intro
              </span>
            )}
            {isConfirmed && (
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                Intro Scheduled
              </span>
            )}
            {request.status === "declined" && (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">Declined</span>
            )}
            {request.status === "cancelled" && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Cancelled</span>
            )}
            {request.status === "expired" && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">Expired</span>
            )}
          </div>

          {/* Confirmed call details */}
          {isConfirmed && request.confirmed_time && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-800">
                  {formatSydneyDate(request.confirmed_time)} (AEST)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-700">
                  Your phone number has been shared with the family.
                </p>
              </div>
            </div>
          )}

          {/* Time remaining for pending */}
          {isPending && request.expires_at && action !== "decline" && (
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span className={`text-sm ${formatTimeLeft(request.expires_at).urgent ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                {formatTimeLeft(request.expires_at).text} to respond
              </span>
            </div>
          )}

          {/* Position Details */}
          {position && (
            <div className="rounded-lg bg-slate-50 p-4 space-y-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Briefcase className="h-3.5 w-3.5" />
                Position Details
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Actions for pending — Accept/Decline buttons */}
          {isPending && action === "none" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
                <Phone className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  Accepting will lead to your phone number being shared with this
                  family once they schedule an intro time.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAction("decline")}
                >
                  Decline
                </Button>
                <Button
                  className="flex-1 bg-violet-500 hover:bg-violet-600"
                  onClick={() => setAction("availability")}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Accept
                </Button>
              </div>
            </div>
          )}

          {/* Decline form */}
          {isPending && action === "decline" && (
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
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setAction("none");
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

          {/* Cancel for accepted/confirmed */}
          {(isAccepted || isConfirmed) && action !== "cancelling" && (
            <Button
              variant="outline"
              size="sm"
              className="text-slate-500"
              onClick={() => setAction("cancelling")}
            >
              Cancel Intro
            </Button>
          )}

          {(isAccepted || isConfirmed) && action === "cancelling" && (
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-600">Cancel this intro?</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAction("none")}
              >
                No
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={submitting}
                onClick={handleCancel}
              >
                {submitting ? (
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

          <p className="text-xs text-slate-400">
            Received {formatSydneyDate(request.created_at)}
          </p>
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Connection Tile (clickable card for any status) ──

function ConnectionTile({
  request,
  onClick,
}: {
  request: ConnectionRequestWithDetails;
  onClick: () => void;
}) {
  const { text: timeLeft, urgent } = formatTimeLeft(request.expires_at);
  const isPending = request.status === "pending";
  const isAccepted = request.status === "accepted";
  const isConfirmed = request.status === "confirmed";

  const borderColor = isPending
    ? "border-violet-200"
    : isAccepted
    ? "border-blue-200"
    : isConfirmed
    ? "border-green-200"
    : "border-slate-200";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border ${borderColor} bg-white p-4 hover:bg-slate-50 transition-colors cursor-pointer`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100">
            <span className="text-sm font-semibold text-violet-600">
              {request.parent?.first_name?.[0]}
              {request.parent?.last_name?.[0]}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {request.parent?.first_name} {request.parent?.last_name?.[0]}.
            </p>
            {isConfirmed && request.confirmed_time && (
              <p className="flex items-center gap-1 text-xs text-green-600">
                <Calendar className="h-3 w-3" />
                {formatSydneyDate(request.confirmed_time)}
              </p>
            )}
            {isPending && (
              <p className="text-xs text-slate-500">Review request</p>
            )}
            {isAccepted && (
              <p className="text-xs text-slate-500">Awaiting schedule</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPending && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              Review
            </span>
          )}
          {(isPending || isAccepted) && timeLeft && (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                urgent
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              <Clock className="h-3 w-3" />
              {timeLeft}
            </span>
          )}
          {isConfirmed && (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              <PhoneCall className="h-3 w-3" />
              Confirmed
            </span>
          )}
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </div>
      </div>
    </button>
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
      case "connection_accepted_nanny":
      case "connection_accepted":
        return <UserCheck className="h-4 w-4 text-blue-600" />;
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
          {formatSydneyDate(message.created_at)}
        </p>
      </div>
      {!message.is_read && (
        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-violet-500" />
      )}
    </div>
  );
}

// ── Past Connection Card ──

function PastConnectionCard({
  request,
  onClick,
}: {
  request: ConnectionRequestWithDetails;
  onClick: () => void;
}) {
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
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border border-slate-100 bg-white opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
    >
      <div className="flex items-center justify-between py-4 px-4">
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
              {formatSydneyDate(request.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.style}`}
          >
            {config.label}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-300" />
        </div>
      </div>
    </button>
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
  const [selectedRequest, setSelectedRequest] = useState<ConnectionRequestWithDetails | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Split connections by status
  const pending = pendingRequests.filter((r) => r.status === "pending");
  const accepted = pendingRequests.filter((r) => r.status === "accepted");
  const confirmed = pendingRequests.filter((r) => r.status === "confirmed");

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
      {/* Detail Modal */}
      {selectedRequest && (
        <ConnectionDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}

      {/* Action Required — Pending */}
      {pending.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
              {pending.length}
            </span>
            Intro Requests
          </h2>
          <div className="grid gap-3">
            {pending.map((req) => (
              <ConnectionTile
                key={req.id}
                request={req}
                onClick={() => setSelectedRequest(req)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Accepted — Waiting for parent to schedule */}
      {accepted.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-blue-700">
            <UserCheck className="h-5 w-5" />
            Accepted ({accepted.length})
          </h2>
          <div className="grid gap-3">
            {accepted.map((req) => (
              <ConnectionTile
                key={req.id}
                request={req}
                onClick={() => setSelectedRequest(req)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Confirmed — Intro scheduled */}
      {confirmed.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-green-700">
            <PhoneCall className="h-5 w-5" />
            Upcoming Intros ({confirmed.length})
          </h2>
          <div className="grid gap-3">
            {confirmed.map((req) => (
              <ConnectionTile
                key={req.id}
                request={req}
                onClick={() => setSelectedRequest(req)}
              />
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
            Past Intros
          </h2>
          <div className="grid gap-2">
            {pastConnections.map((req) => (
              <PastConnectionCard
                key={req.id}
                request={req}
                onClick={() => setSelectedRequest(req)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
