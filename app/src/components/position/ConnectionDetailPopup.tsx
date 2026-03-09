"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  CheckCircle,
  XCircle,
  HelpCircle,
  ClipboardCheck,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Phone,
  Heart,
  MoreVertical,
} from "lucide-react";
import { CONNECTION_STAGE } from "@/lib/position/constants";
import { ConnectionProgress } from "./ConnectionProgress";
import { PositionAccordion } from "./PositionAccordion";
import type { UpcomingIntro } from "@/lib/actions/position-funnel";
import {
  TIME_BRACKETS,
  BRACKET_KEYS,
  getNext7Days,
  getBracketTimeOptions,
  sydneyToUTC,
} from "@/lib/timezone";
import { acceptConnectionRequest, declineConnectionRequest } from "@/lib/actions/connection";

// ── Start week options ──
function formatStartWeek(d: Date): string {
  return `Week of ${d.toLocaleDateString("en-AU", { day: "numeric", month: "long" })}`;
}

function getWeekMonday(weeksAhead: number): Date {
  const now = new Date();
  const day = now.getDay();
  const d = new Date(now);
  const diff = (day === 0 ? -6 : 1 - day) + weeksAhead * 7;
  d.setDate(now.getDate() + diff);
  return d;
}

function getStartWeekOptions(includeTbc = true): { label: string; value: string; display: string }[] {
  const thisMon = getWeekMonday(0);
  const nextMon = getWeekMonday(1);
  const in2Mon = getWeekMonday(2);

  const options = [
    { label: "This week", value: thisMon.toISOString().split("T")[0], display: formatStartWeek(thisMon) },
    { label: "Next week", value: nextMon.toISOString().split("T")[0], display: formatStartWeek(nextMon) },
    { label: "In 2 weeks", value: in2Mon.toISOString().split("T")[0], display: formatStartWeek(in2Mon) },
    { label: "Different date", value: "custom", display: "" },
  ];

  if (includeTbc) {
    options.push({ label: "To be confirmed", value: "tbc", display: "" });
  }

  return options;
}

/** Format a stored start_date for display on tiles */
function formatStartWeekDisplay(dateStr: string): string {
  if (dateStr === "tbc") return "Start week to be confirmed";
  const d = new Date(dateStr + "T00:00:00");
  const label = d.toLocaleDateString("en-AU", { day: "numeric", month: "long" });
  const isPast = d.getTime() < Date.now();
  return isPast ? `Started week of ${label}` : `Starting week of ${label}`;
}

// ── Start week picker ──
function StartWeekPicker({
  selected,
  customDate,
  onSelect,
  onCustomDateChange,
  includeTbc = true,
  label,
}: {
  selected: string | null;
  customDate: string;
  onSelect: (value: string) => void;
  onCustomDateChange: (value: string) => void;
  includeTbc?: boolean;
  label?: string;
}) {
  const options = getStartWeekOptions(includeTbc);

  return (
    <div className="space-y-2">
      {label !== "" && <p className="text-xs font-medium text-slate-500">{label ?? "When would you like them to start?"}</p>}
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`px-3 py-2 text-xs rounded-lg border transition-colors text-left ${
              selected === opt.value
                ? "border-green-500 bg-green-50 text-green-700 font-medium"
                : "border-slate-200 text-slate-600 hover:border-green-300"
            }`}
          >
            <span className="block">{opt.label}</span>
            {opt.display && <span className="block text-[10px] opacity-70">{opt.display}</span>}
          </button>
        ))}
      </div>
      {selected === "custom" && (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="date"
            value={customDate}
            onChange={(e) => onCustomDateChange(e.target.value)}
            className="flex-1 text-sm border rounded-lg px-3 py-1.5 text-slate-700"
          />
        </div>
      )}
    </div>
  );
}

// ── Proposed times grid ──
function ProposedTimesGrid({ proposedTimes }: { proposedTimes: string[] }) {
  const dateSet = new Map<string, Set<string>>();
  for (const slot of proposedTimes) {
    const [date, bracket] = slot.split("_");
    if (!dateSet.has(date)) dateSet.set(date, new Set());
    dateSet.get(date)!.add(bracket);
  }
  const dates = Array.from(dateSet.keys()).sort();

  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
      <p className="text-xs font-medium text-amber-800 flex items-center gap-1">
        <Calendar className="h-3 w-3" /> Proposed Times
      </p>
      <div className="grid grid-cols-5 gap-1 text-xs">
        <div />
        {BRACKET_KEYS.map((b) => (
          <div key={b} className="text-center text-amber-600 font-medium truncate">
            {TIME_BRACKETS[b].label.slice(0, 4)}
          </div>
        ))}
        {dates.map((date) => {
          const d = new Date(date + "T00:00:00");
          const label = d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
          return (
            <div key={date} className="contents">
              <div className="text-amber-700 font-medium truncate pr-1">{label}</div>
              {BRACKET_KEYS.map((b) => (
                <div key={b} className="flex items-center justify-center">
                  {dateSet.get(date)?.has(b) ? (
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                  ) : (
                    <div className="h-3 w-3 rounded-full bg-amber-100" />
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Availability Grid (for nanny accepting) ──
function AvailabilityGrid({
  onConfirm,
  onBack,
  submitting,
}: {
  onConfirm: (slots: string[]) => void;
  onBack: () => void;
  submitting: boolean;
}) {
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const next7Days = getNext7Days();
  const allSlots = next7Days.flatMap((day) =>
    BRACKET_KEYS.map((bracket) => `${day.date}_${bracket}`)
  );

  const toggleSlot = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const selectAll = () => setSelectedSlots([...allSlots]);
  const clearAll = () => setSelectedSlots([]);

  const selectedBrackets = new Set(selectedSlots.map((s) => s.split("_")[1]));
  const selectedDays = new Set(selectedSlots.map((s) => s.split("_")[0]));
  const hasEnoughSlots = selectedSlots.length >= 5;
  const hasAllBrackets = selectedBrackets.size >= 4;
  const hasEnoughDays = selectedDays.size >= 3;
  const isValid = hasEnoughSlots && hasAllBrackets && hasEnoughDays;

  return (
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
            {BRACKET_KEYS.map((bracket) => (
              <div key={bracket} className="text-center">
                <p className="text-xs font-semibold text-slate-600">{TIME_BRACKETS[bracket].label}</p>
                <p className="text-[10px] text-slate-400">{TIME_BRACKETS[bracket].sublabel}</p>
              </div>
            ))}
          </div>

          {/* Date rows */}
          {next7Days.map((day) => (
            <div key={day.date} className="grid grid-cols-[90px_repeat(4,1fr)] gap-1 mb-1">
              <div className="flex items-center">
                <div>
                  <p className="text-xs font-semibold text-slate-600">{day.dayLabel}</p>
                  <p className="text-[10px] text-slate-400">{day.dateLabel}</p>
                </div>
              </div>
              {BRACKET_KEYS.map((bracket) => {
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

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </Button>
        <Button
          className="flex-1 bg-violet-500 hover:bg-violet-600"
          disabled={!isValid || submitting}
          onClick={() => onConfirm(selectedSlots)}
        >
          {submitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirming...</>
          ) : (
            "Confirm Availability"
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Time Scheduling Grid (for parent picking time) ──
function ScheduleTimeGrid({
  proposedTimes,
  otherPartyName,
  onConfirm,
  onBack,
  submitting,
}: {
  proposedTimes: string[];
  otherPartyName?: string;
  onConfirm: (isoTime: string) => void;
  onBack: () => void;
  submitting: boolean;
}) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);

  // Parse proposed times into available slots set and unique dates
  const availableSlots = new Set(proposedTimes);
  const uniqueDates = Array.from(new Set(proposedTimes.map((s) => s.split("_")[0]))).sort();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return {
      weekday: d.toLocaleDateString("en-AU", { weekday: "short" }),
      day: d.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    };
  };

  // Time picker
  const selectedBracketKey = selectedSlot ? selectedSlot.split("_")[1] as keyof typeof TIME_BRACKETS : null;
  const timeGrid = selectedBracketKey
    ? [getBracketTimeOptions(selectedBracketKey).slice(0, 4),
       getBracketTimeOptions(selectedBracketKey).slice(4, 8),
       getBracketTimeOptions(selectedBracketKey).slice(8, 12)]
    : [];
  const hasSelectedTime = selectedSlot && selectedHour !== null && selectedMinute !== null;

  const getConfirmationLabel = () => {
    if (!selectedSlot || selectedHour === null || selectedMinute === null) return "";
    const [date] = selectedSlot.split("_");
    const d = new Date(date + "T00:00:00");
    const dayStr = d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
    const h = selectedHour > 12 ? selectedHour - 12 : selectedHour;
    const ampm = selectedHour >= 12 ? "pm" : "am";
    const m = selectedMinute.toString().padStart(2, "0");
    return `${dayStr} at ${h}:${m}${ampm}`;
  };

  const handleConfirm = () => {
    if (!selectedSlot || selectedHour === null || selectedMinute === null) return;
    const [date] = selectedSlot.split("_");
    const iso = sydneyToUTC(date, selectedHour, selectedMinute);
    onConfirm(iso);
  };

  const firstName = otherPartyName?.split(" ")[0] || "the nanny";

  return (
    <div className="space-y-4">
      {/* Availability grid — dates as rows, brackets as columns */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {firstName}&apos;s availability
        </p>

        <div className="overflow-x-auto -mx-4 px-4">
          <div className="min-w-[340px]">
            {/* Bracket column headers */}
            <div className="grid grid-cols-[90px_repeat(4,1fr)] gap-1 mb-1">
              <div />
              {BRACKET_KEYS.map((bracket) => (
                <div key={bracket} className="text-center">
                  <p className="text-xs font-semibold text-slate-600">{TIME_BRACKETS[bracket].label}</p>
                  <p className="text-[10px] text-slate-400">{TIME_BRACKETS[bracket].sublabel}</p>
                </div>
              ))}
            </div>

            {/* Date rows */}
            {uniqueDates.map((date) => {
              const { weekday, day } = formatDate(date);
              return (
                <div key={date} className="grid grid-cols-[90px_repeat(4,1fr)] gap-1 mb-1">
                  <div className="flex items-center">
                    <div>
                      <p className="text-xs font-semibold text-slate-600">{weekday}</p>
                      <p className="text-[10px] text-slate-400">{day}</p>
                    </div>
                  </div>
                  {BRACKET_KEYS.map((bracket) => {
                    const slot = `${date}_${bracket}`;
                    const isAvailable = availableSlots.has(slot);
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => {
                          if (!isAvailable) return;
                          setSelectedSlot(isSelected ? null : slot);
                          setSelectedHour(null);
                          setSelectedMinute(null);
                        }}
                        className={`h-10 rounded-md border text-xs font-medium transition-colors ${
                          isSelected
                            ? "bg-violet-600 text-white border-violet-600 cursor-pointer"
                            : isAvailable
                            ? "bg-violet-50 text-violet-600 border-violet-200 hover:border-violet-400 cursor-pointer"
                            : "bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed"
                        }`}
                      >
                        {isAvailable ? (isSelected ? "\u2713" : "") : ""}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4×3 time picker */}
      {selectedSlot && selectedBracketKey && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Select a time
          </p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="grid grid-cols-4 gap-1.5">
              {timeGrid.flat().map((opt) => {
                const isSelected = selectedHour === opt.hour && selectedMinute === opt.minute;
                return (
                  <button
                    key={`${opt.hour}-${opt.minute}`}
                    type="button"
                    onClick={() => {
                      setSelectedHour(opt.hour);
                      setSelectedMinute(opt.minute);
                    }}
                    className={`py-2.5 rounded-md border text-sm font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white text-slate-700 border-slate-200 hover:border-violet-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation */}
      {hasSelectedTime && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-800">
            {getConfirmationLabel()}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </Button>
        <Button
          className="flex-1 bg-violet-500 hover:bg-violet-600"
          disabled={!hasSelectedTime || submitting}
          onClick={handleConfirm}
        >
          {submitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirming...</>
          ) : (
            "Confirm Time"
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ──

interface ConnectionDetailPopupProps {
  intro: UpcomingIntro | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: "parent" | "nanny";
  onIntroOutcome?: (connectionId: string, outcome: "hired" | "not_hired" | "awaiting" | "trial" | "incomplete", dateValue?: string) => Promise<{ success: boolean; error: string | null }>;
  onTrialOutcome?: (connectionId: string, outcome: "hired" | "not_hired" | "awaiting", startDate?: string) => Promise<{ success: boolean; error: string | null }>;
  onConfirmPosition?: (connectionId: string) => Promise<{ success: boolean; error: string | null }>;
  onConfirmPlacement?: (connectionId: string, startWeek?: string) => Promise<{ success: boolean; error: string | null }>;
  onParentOutcome?: (connectionId: string, outcome: "hired" | "not_hired" | "awaiting" | "trial", dateValue?: string) => Promise<{ success: boolean; error: string | null }>;
  onRejectHiredClaim?: (connectionId: string) => Promise<{ success: boolean; error: string | null }>;
  onRevertToAwaiting?: (connectionId: string) => Promise<{ success: boolean; error: string | null }>;
  onScheduleTime?: (connectionId: string, isoTime: string) => Promise<{ success: boolean; error: string | null }>;
  onDismissConnection?: (connectionId: string) => Promise<{ success: boolean; error: string | null }>;
  onUpdateStartWeek?: (connectionId: string, startDate: string) => Promise<{ success: boolean; error: string | null }>;
  onRemoveConnection?: (connectionId: string) => Promise<{ success: boolean; error: string | null }>;
  onConfirmTrial?: (connectionId: string, trialDate?: string) => Promise<{ success: boolean; error: string | null }>;
  onDeclineTrial?: (connectionId: string) => Promise<{ success: boolean; error: string | null }>;
}

export function ConnectionDetailPopup({
  intro,
  open,
  onOpenChange,
  role,
  onIntroOutcome,
  onTrialOutcome,
  onConfirmPosition,
  onConfirmPlacement,
  onParentOutcome,
  onRejectHiredClaim,
  onRevertToAwaiting,
  onScheduleTime,
  onDismissConnection,
  onUpdateStartWeek,
  onRemoveConnection,
  onConfirmTrial,
  onDeclineTrial,
}: ConnectionDetailPopupProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateValue, setDateValue] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [view, setView] = useState<"details" | "availability" | "decline" | "schedule">("details");
  const [declineReason, setDeclineReason] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);
  const [selectedStartWeek, setSelectedStartWeek] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!intro) return null;

  const handleAction = async (action: () => Promise<{ success: boolean; error: string | null }>, successMsg: string) => {
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    const result = await action();
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || "Something went wrong.");
    } else {
      setSuccessMessage(successMsg);
      setTimeout(() => {
        onOpenChange(false);
        setSuccessMessage(null);
        setDateValue("");
        setSelectedOutcome(null);
        setView("details");
        setConfirmReject(false);
        setSelectedStartWeek(null);
        setCustomStartDate("");
      }, 1200);
    }
  };

  const stage = intro.connectionStage;
  const name = intro.otherPartyName.split(" ")[0]; // First name only for friendly text

  // Stage conditions
  const isRequest = stage === CONNECTION_STAGE.REQUEST_SENT;
  const isAccepted = stage === CONNECTION_STAGE.ACCEPTED;
  const isScheduled = stage === CONNECTION_STAGE.INTRO_SCHEDULED;
  const isPostIntro = stage === CONNECTION_STAGE.INTRO_COMPLETE || stage === CONNECTION_STAGE.AWAITING_RESPONSE;
  const isTrial = stage === CONNECTION_STAGE.TRIAL_ARRANGED || stage === CONNECTION_STAGE.TRIAL_COMPLETE;
  const isTrialPending = stage === CONNECTION_STAGE.TRIAL_ARRANGED && intro.fillInitiatedBy === 'nanny';
  const isTrialConfirmed = isTrial && !isTrialPending;
  const isOffered = stage === CONNECTION_STAGE.OFFERED;
  const isNotHired = stage === CONNECTION_STAGE.NOT_HIRED;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setView("details"); setSelectedOutcome(null); setConfirmReject(false); setSelectedStartWeek(null); setCustomStartDate(""); setShowMenu(false); setConfirmRemove(false); } onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {intro.otherPartyPhoto ? (
              <img src={intro.otherPartyPhoto} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                <span className="text-lg font-semibold text-violet-600">{intro.otherPartyName.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <DialogTitle>{intro.otherPartyName}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                {intro.otherPartySuburb && (<span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{intro.otherPartySuburb}</span>)}
                {role === "parent" && intro.nannyPhoneShared && stage >= CONNECTION_STAGE.INTRO_SCHEDULED && (
                  <span className="flex items-center gap-1 text-green-600 font-medium"><Phone className="h-3 w-3" />{intro.nannyPhoneShared}</span>
                )}
              </DialogDescription>
            </div>
            {onRemoveConnection && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-50">
                    <button
                      onClick={() => { setShowMenu(false); setConfirmRemove(true); }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Remove connection
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Remove connection confirmation */}
        {confirmRemove && onRemoveConnection && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
            <p className="text-sm text-red-700">
              Are you sure you want to remove your connection with {name}?
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)} disabled={submitting}>Cancel</Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                disabled={submitting}
                onClick={() => handleAction(() => onRemoveConnection(intro.connectionId), "Connection removed.")}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Yes, remove
              </Button>
            </div>
          </div>
        )}

        {/* ── Nanny: Accept/Decline Flow ── */}
        {role === "nanny" && isRequest && view === "availability" && (
          <AvailabilityGrid
            submitting={submitting}
            onBack={() => setView("details")}
            onConfirm={async (slots) => {
              setSubmitting(true);
              setError(null);
              const result = await acceptConnectionRequest(intro.connectionId, slots);
              setSubmitting(false);
              if (!result.success) {
                setError(result.error || "Failed to accept.");
              } else {
                setSuccessMessage("Accepted! The family will schedule an intro time.");
                setTimeout(() => { onOpenChange(false); setSuccessMessage(null); setView("details"); }, 1200);
              }
            }}
          />
        )}

        {role === "nanny" && isRequest && view === "decline" && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Decline this request?</p>
            <textarea
              className="w-full text-sm border rounded-lg px-3 py-2 text-slate-700 placeholder:text-slate-400 resize-none"
              rows={3}
              placeholder="Optional: reason for declining (private, not shared)"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setView("details")} disabled={submitting}>Back</Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  const result = await declineConnectionRequest(intro.connectionId, declineReason || undefined);
                  setSubmitting(false);
                  if (!result.success) { setError(result.error || "Failed to decline."); }
                  else {
                    setSuccessMessage("Declined.");
                    setTimeout(() => { onOpenChange(false); setSuccessMessage(null); setView("details"); }, 1200);
                  }
                }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Decline
              </Button>
            </div>
          </div>
        )}

        {/* ── Parent: Schedule Time Flow ── */}
        {role === "parent" && isAccepted && view === "schedule" && intro.proposedTimes && (
          <ScheduleTimeGrid
            proposedTimes={intro.proposedTimes}
            otherPartyName={intro.otherPartyName}
            submitting={submitting}
            onBack={() => setView("details")}
            onConfirm={async (isoTime) => {
              if (onScheduleTime) {
                await handleAction(() => onScheduleTime(intro.connectionId, isoTime), "Intro time confirmed!");
              }
            }}
          />
        )}

        {/* ── Main Details View ── */}
        {view === "details" && (
          <>
            {/* Position details (nanny only — shown above stepper for context) */}
            {role === "nanny" && intro.position && (
              <PositionAccordion position={intro.position} />
            )}

            {/* Progress Stepper */}
            <div className="mt-2">
              <ConnectionProgress
                currentStage={stage}
                role={role}
                fillInitiatedBy={intro.fillInitiatedBy}
                trialDate={intro.trialDate}
                confirmedTime={intro.confirmedTime}
              />
            </div>

            {/* Start week display / update for TBC */}
            {intro.startDate && stage >= CONNECTION_STAGE.OFFERED && (
              intro.startDate === "tbc" ? (
                role === "parent" && onUpdateStartWeek ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-xs font-medium text-amber-700">Start week to be confirmed</p>
                    <StartWeekPicker
                      selected={selectedStartWeek}
                      customDate={customStartDate}
                      onSelect={(v) => { setSelectedStartWeek(v); if (v !== "custom") setCustomStartDate(""); }}
                      onCustomDateChange={setCustomStartDate}
                      includeTbc={false}
                    />
                    <Button
                      size="sm"
                      className="w-full bg-amber-600 hover:bg-amber-700"
                      disabled={submitting || !selectedStartWeek || (selectedStartWeek === "custom" && !customStartDate)}
                      onClick={() => {
                        const startVal = selectedStartWeek === "custom" ? customStartDate : selectedStartWeek!;
                        handleAction(() => onUpdateStartWeek(intro.connectionId, startVal), "Start week updated!");
                      }}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Confirm Start Week
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="font-medium">Start week to be confirmed</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="font-medium">{formatStartWeekDisplay(intro.startDate)}</span>
                </div>
              )
            )}

            {/* CONFIRMED — informational message */}
            {stage === CONNECTION_STAGE.CONFIRMED && (
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                Placement confirmed — your position is being set up.
              </div>
            )}

            {/* ACTIVE — informational message */}
            {stage === CONNECTION_STAGE.ACTIVE && (
              <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Your placement is active.
              </div>
            )}

            {/* Proposed times grid (nanny, request stage) */}
            {role === "nanny" && (isRequest || isAccepted) && intro.proposedTimes && intro.proposedTimes.length > 0 && (
              <ProposedTimesGrid proposedTimes={intro.proposedTimes} />
            )}

            {/* Parent message */}
            {role === "nanny" && intro.message && (isRequest || isAccepted) && (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-400 mb-0.5">Message from family</p>
                <p className="text-xs text-slate-700">{intro.message}</p>
              </div>
            )}

            {/* Expiry timer (nanny, pending request) */}
            {role === "nanny" && isRequest && intro.expiresAt && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <ExpiryTimer expiresAt={intro.expiresAt} />
              </div>
            )}

            {/* Error / Success messages */}
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            {successMessage && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{successMessage}</p>}

            {/* ── ACTION AREAS ── */}

            {/* Nanny: Pending Request — Accept/Decline */}
            {role === "nanny" && isRequest && (
              <div className="space-y-3 border-t pt-4">
                <div className="rounded-lg bg-blue-50 px-3 py-2">
                  <p className="text-xs text-blue-700">Accepting will lead to your phone number being shared with this family once they schedule an intro time.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" disabled={submitting} onClick={() => setView("decline")}>
                    Decline
                  </Button>
                  <Button size="sm" className="flex-1 bg-violet-600 hover:bg-violet-700" disabled={submitting} onClick={() => setView("availability")}>
                    Accept
                  </Button>
                </div>
              </div>
            )}

            {/* Nanny: Accepted — Waiting for family */}
            {role === "nanny" && isAccepted && (
              <div className="border-t pt-4">
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  Accepted! Waiting for {name} to pick an intro time.
                </div>
              </div>
            )}

            {/* Parent: Accepted — Pick a time */}
            {role === "parent" && isAccepted && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-slate-700">
                  {name} accepted! Pick a time for your 15-minute intro call.
                </p>
                <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-700" onClick={() => setView("schedule")}>
                  <Calendar className="h-4 w-4 mr-1" /> Pick a Time
                </Button>
              </div>
            )}

            {/* Parent: Scheduled — Show time + phone */}
            {role === "parent" && isScheduled && intro.confirmedTime && (
              <div className="border-t pt-4">
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-800 font-medium">
                    <Calendar className="h-4 w-4" />
                    {new Date(intro.confirmedTime).toLocaleDateString("en-AU", {
                      weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit",
                    })}
                  </div>
                  <p className="text-xs text-green-700">Please call {name} at the scheduled time.</p>
                </div>
              </div>
            )}

            {/* Nanny: Scheduled — Info */}
            {role === "nanny" && isScheduled && (
              <div className="border-t pt-4">
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
                  Your intro is booked! {name} will call you at the scheduled time.
                </div>
              </div>
            )}

            {/* ── NANNY POST-INTRO OUTCOMES ── */}
            {role === "nanny" && (isPostIntro || isScheduled) && onIntroOutcome && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium text-slate-700">
                  {isScheduled
                    ? `Had your intro with ${name}? How did it go?`
                    : stage === CONNECTION_STAGE.INTRO_COMPLETE
                      ? "How did your intro go?"
                      : "Any update?"}
                </p>
                <div className="space-y-1.5">
                  {/* Trial arranged */}
                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal"
                    disabled={submitting}
                    onClick={() => setSelectedOutcome(selectedOutcome === "trial" ? null : "trial")}
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2 text-cyan-600 shrink-0" />
                    <span>We have arranged a trial shift</span>
                  </Button>
                  {selectedOutcome === "trial" && (
                    <div className="space-y-2 pl-6">
                      <p className="text-xs text-slate-500">Congratulations! When is your trial shift?</p>
                      <div className="flex items-center gap-2">
                        <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} className="text-sm border rounded px-2 py-1 text-slate-700 flex-1" />
                        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" disabled={!dateValue || submitting}
                          onClick={() => handleAction(() => onIntroOutcome(intro.connectionId, "trial", dateValue), "Trial arranged!")}>
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Hired / start date */}
                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal"
                    disabled={submitting}
                    onClick={() => setSelectedOutcome(selectedOutcome === "hired" ? null : "hired")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600 shrink-0" />
                    <span>They&apos;ve offered me the position!</span>
                  </Button>
                  {selectedOutcome === "hired" && (
                    <div className="space-y-2 pl-6">
                      <p className="text-xs text-slate-500">Amazing! When are you starting?</p>
                      <StartWeekPicker
                        selected={selectedStartWeek}
                        customDate={customStartDate}
                        onSelect={(v) => { setSelectedStartWeek(v); if (v !== "custom") setCustomStartDate(""); }}
                        onCustomDateChange={setCustomStartDate}
                        includeTbc
                        label=""
                      />
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700"
                        disabled={submitting || !selectedStartWeek || (selectedStartWeek === "custom" && !customStartDate)}
                        onClick={() => {
                          const startVal = selectedStartWeek === "custom" ? customStartDate : (selectedStartWeek ?? undefined);
                          handleAction(() => onIntroOutcome(intro.connectionId, "hired", startVal), "Congratulations!");
                        }}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Confirm
                      </Button>
                    </div>
                  )}

                  {/* Awaiting */}
                  {(stage === CONNECTION_STAGE.INTRO_COMPLETE || stage === CONNECTION_STAGE.INTRO_SCHEDULED) && (
                    <Button
                      size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal"
                      disabled={submitting}
                      onClick={() => handleAction(() => onIntroOutcome(intro.connectionId, "awaiting"), "Updated.")}
                    >
                      <HelpCircle className="h-4 w-4 mr-2 text-amber-500 shrink-0" />
                      <span>I am waiting to hear back from the family</span>
                    </Button>
                  )}

                  {/* Not hired */}
                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal text-slate-500"
                    disabled={submitting}
                    onClick={() => handleAction(() => onIntroOutcome(intro.connectionId, "not_hired"), "Updated.")}
                  >
                    <XCircle className="h-4 w-4 mr-2 shrink-0" />
                    <span>The family have let me know they won&apos;t be needing my services</span>
                  </Button>

                  {/* Incomplete */}
                  {(stage === CONNECTION_STAGE.INTRO_COMPLETE || stage === CONNECTION_STAGE.INTRO_SCHEDULED) && (
                    <Button
                      size="sm" variant="ghost" className="w-full justify-start text-left whitespace-normal text-slate-400"
                      disabled={submitting}
                      onClick={() => handleAction(() => onIntroOutcome(intro.connectionId, "incomplete"), "Noted.")}
                    >
                      <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                      <span>The intro didn&apos;t take place</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ── NANNY: TRIAL PENDING (waiting for parent) ── */}
            {role === "nanny" && isTrialPending && (
              <div className="border-t pt-4">
                <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Waiting for {name} to confirm the trial arrangement.
                </div>
              </div>
            )}

            {/* ── NANNY POST-TRIAL OUTCOMES (only when trial is confirmed) ── */}
            {role === "nanny" && isTrialConfirmed && onTrialOutcome && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium text-slate-700">How did the trial go?</p>
                <div className="space-y-1.5">
                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal"
                    disabled={submitting}
                    onClick={() => setSelectedOutcome(selectedOutcome === "trial-hired" ? null : "trial-hired")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600 shrink-0" />
                    <span>They&apos;ve offered me the position!</span>
                  </Button>
                  {selectedOutcome === "trial-hired" && (
                    <div className="space-y-2 pl-6">
                      <p className="text-xs text-slate-500">Amazing! When are you starting?</p>
                      <StartWeekPicker
                        selected={selectedStartWeek}
                        customDate={customStartDate}
                        onSelect={(v) => { setSelectedStartWeek(v); if (v !== "custom") setCustomStartDate(""); }}
                        onCustomDateChange={setCustomStartDate}
                        includeTbc
                        label=""
                      />
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700"
                        disabled={submitting || !selectedStartWeek || (selectedStartWeek === "custom" && !customStartDate)}
                        onClick={() => {
                          const startVal = selectedStartWeek === "custom" ? customStartDate : (selectedStartWeek ?? undefined);
                          handleAction(() => onTrialOutcome(intro.connectionId, "hired", startVal), "Congratulations!");
                        }}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Confirm
                      </Button>
                    </div>
                  )}

                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal"
                    disabled={submitting}
                    onClick={() => handleAction(() => onTrialOutcome(intro.connectionId, "awaiting"), "Updated.")}
                  >
                    <HelpCircle className="h-4 w-4 mr-2 text-amber-500 shrink-0" />
                    <span>I am waiting to hear back from the family</span>
                  </Button>

                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal text-slate-500"
                    disabled={submitting}
                    onClick={() => handleAction(() => onTrialOutcome(intro.connectionId, "not_hired"), "Updated.")}
                  >
                    <XCircle className="h-4 w-4 mr-2 shrink-0" />
                    <span>The family have let me know they won&apos;t be needing my services</span>
                  </Button>
                </div>
              </div>
            )}

            {/* ── PARENT POST-INTRO OUTCOMES ── */}
            {role === "parent" && (isPostIntro || isScheduled) && onParentOutcome && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium text-slate-700">
                  {isScheduled ? `Had your intro with ${name}? How did it go?` : "How did the intro go?"}
                </p>
                <div className="space-y-1.5">
                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal"
                    disabled={submitting}
                    onClick={() => setSelectedOutcome(selectedOutcome === "p-trial" ? null : "p-trial")}
                  >
                    <ClipboardCheck className="h-4 w-4 mr-2 text-cyan-600 shrink-0" />
                    <span>We have arranged a trial shift with {name}</span>
                  </Button>
                  {selectedOutcome === "p-trial" && (
                    <div className="space-y-2 pl-6">
                      <p className="text-xs text-slate-500">When is the trial shift?</p>
                      <div className="flex items-center gap-2">
                        <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} className="text-sm border rounded px-2 py-1 text-slate-700 flex-1" />
                        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" disabled={!dateValue || submitting}
                          onClick={() => handleAction(() => onParentOutcome(intro.connectionId, "trial", dateValue), "Trial arranged!")}>
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal"
                    disabled={submitting}
                    onClick={() => setSelectedOutcome(selectedOutcome === "p-hired" ? null : "p-hired")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600 shrink-0" />
                    <span>We would like to hire {name}!</span>
                  </Button>
                  {selectedOutcome === "p-hired" && (
                    <div className="space-y-2 pl-6">
                      <p className="text-xs text-slate-500">When would you like {name} to start?</p>
                      <StartWeekPicker
                        selected={selectedStartWeek}
                        customDate={customStartDate}
                        onSelect={(v) => { setSelectedStartWeek(v); if (v !== "custom") setCustomStartDate(""); }}
                        onCustomDateChange={setCustomStartDate}
                        includeTbc
                        label=""
                      />
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700"
                        disabled={submitting || !selectedStartWeek || (selectedStartWeek === "custom" && !customStartDate)}
                        onClick={() => {
                          const startVal = selectedStartWeek === "custom" ? customStartDate : (selectedStartWeek ?? undefined);
                          handleAction(() => onParentOutcome(intro.connectionId, "hired", startVal), "Wonderful!");
                        }}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Confirm
                      </Button>
                    </div>
                  )}

                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal"
                    disabled={submitting}
                    onClick={() => handleAction(() => onParentOutcome(intro.connectionId, "awaiting"), "Updated.")}
                  >
                    <HelpCircle className="h-4 w-4 mr-2 text-amber-500 shrink-0" />
                    <span>We are still deciding</span>
                  </Button>

                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal text-slate-500"
                    disabled={submitting}
                    onClick={() => handleAction(() => onParentOutcome(intro.connectionId, "not_hired"), "Updated.")}
                  >
                    <XCircle className="h-4 w-4 mr-2 shrink-0" />
                    <span>We will not be moving forward with {name}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* ── PARENT: CONFIRM NANNY-PROPOSED TRIAL ── */}
            {role === "parent" && isTrialPending && onConfirmTrial && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-slate-700">
                  {name} says a trial shift has been arranged
                </p>
                {intro.trialDate && (
                  <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 text-sm text-violet-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0" />
                    {new Date(intro.trialDate + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
                  </div>
                )}

                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" disabled={submitting}
                  onClick={() => handleAction(() => onConfirmTrial(intro.connectionId, intro.trialDate ?? undefined), "Trial confirmed!")}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Confirm Trial
                </Button>

                <Button
                  size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal"
                  disabled={submitting}
                  onClick={() => setSelectedOutcome(selectedOutcome === "change-trial-date" ? null : "change-trial-date")}
                >
                  <Calendar className="h-4 w-4 mr-2 text-violet-500 shrink-0" />
                  <span>Confirm with a different date</span>
                </Button>
                {selectedOutcome === "change-trial-date" && (
                  <div className="space-y-2 pl-6">
                    <p className="text-xs text-slate-500">When should the trial be?</p>
                    <div className="flex items-center gap-2">
                      <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} className="text-sm border rounded px-2 py-1 text-slate-700 flex-1" />
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={!dateValue || submitting}
                        onClick={() => handleAction(() => onConfirmTrial(intro.connectionId, dateValue), "Trial confirmed!")}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
                      </Button>
                    </div>
                  </div>
                )}

                {onDeclineTrial && (
                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal"
                    disabled={submitting}
                    onClick={() => handleAction(() => onDeclineTrial(intro.connectionId), "Updated.")}
                  >
                    <HelpCircle className="h-4 w-4 mr-2 text-amber-500 shrink-0" />
                    <span>We are still deciding</span>
                  </Button>
                )}

                {onParentOutcome && (
                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal text-slate-500"
                    disabled={submitting}
                    onClick={() => handleAction(() => onParentOutcome(intro.connectionId, "not_hired"), "Updated.")}
                  >
                    <XCircle className="h-4 w-4 mr-2 shrink-0" />
                    <span>We will not be moving forward with {name}</span>
                  </Button>
                )}
              </div>
            )}

            {/* ── PARENT POST-TRIAL OUTCOMES (only when trial is confirmed) ── */}
            {role === "parent" && isTrialConfirmed && onParentOutcome && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium text-slate-700">How did the trial go?</p>
                <div className="space-y-1.5">
                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal"
                    disabled={submitting}
                    onClick={() => setSelectedOutcome(selectedOutcome === "pt-hired" ? null : "pt-hired")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600 shrink-0" />
                    <span>We would like to hire {name}!</span>
                  </Button>
                  {selectedOutcome === "pt-hired" && (
                    <div className="space-y-2 pl-6">
                      <p className="text-xs text-slate-500">When would you like {name} to start?</p>
                      <StartWeekPicker
                        selected={selectedStartWeek}
                        customDate={customStartDate}
                        onSelect={(v) => { setSelectedStartWeek(v); if (v !== "custom") setCustomStartDate(""); }}
                        onCustomDateChange={setCustomStartDate}
                        includeTbc
                        label=""
                      />
                      <Button size="sm" className="w-full bg-green-600 hover:bg-green-700"
                        disabled={submitting || !selectedStartWeek || (selectedStartWeek === "custom" && !customStartDate)}
                        onClick={() => {
                          const startVal = selectedStartWeek === "custom" ? customStartDate : (selectedStartWeek ?? undefined);
                          handleAction(() => onParentOutcome(intro.connectionId, "hired", startVal), "Wonderful!");
                        }}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Confirm
                      </Button>
                    </div>
                  )}

                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal"
                    disabled={submitting}
                    onClick={() => handleAction(() => onParentOutcome(intro.connectionId, "awaiting"), "Updated.")}
                  >
                    <Clock className="h-4 w-4 mr-2 text-amber-500 shrink-0" />
                    <span>Still deciding</span>
                  </Button>

                  <Button
                    size="sm" variant="outline" className="w-full justify-start text-left whitespace-normal text-slate-500"
                    disabled={submitting}
                    onClick={() => handleAction(() => onParentOutcome(intro.connectionId, "not_hired"), "Updated.")}
                  >
                    <XCircle className="h-4 w-4 mr-2 shrink-0" />
                    <span>We will not be moving forward with {name}</span>
                  </Button>
                </div>
              </div>
            )}

            {/* ── Nanny: OFFERED (parent-initiated) — Confirm ── */}
            {role === "nanny" && isOffered && intro.fillInitiatedBy === "parent" && onConfirmPosition && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-slate-700">
                  {name} has selected you! Confirm to get started.
                </p>
                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" disabled={submitting}
                  onClick={() => handleAction(() => onConfirmPosition(intro.connectionId), "Position confirmed!")}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                  Confirm Position
                </Button>
              </div>
            )}

            {/* Nanny: OFFERED (nanny-initiated) — Waiting */}
            {role === "nanny" && isOffered && intro.fillInitiatedBy === "nanny" && (
              <div className="border-t pt-4">
                <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Waiting for {name} to confirm the placement.
                </div>
              </div>
            )}

            {/* ── Parent: OFFERED (nanny-initiated) — Confirm / Not decided / Reject ── */}
            {role === "parent" && isOffered && intro.fillInitiatedBy === "nanny" && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-slate-700">
                  {name} has indicated they&apos;ve been selected. Confirm to finalise the placement.
                </p>

                {/* Start week selection */}
                {onConfirmPlacement && (
                  <>
                    <StartWeekPicker
                      selected={selectedStartWeek}
                      customDate={customStartDate}
                      onSelect={(v) => { setSelectedStartWeek(v); if (v !== "custom") setCustomStartDate(""); }}
                      onCustomDateChange={setCustomStartDate}
                      includeTbc
                    />
                    <Button size="sm" className="w-full bg-green-600 hover:bg-green-700"
                      disabled={submitting || !selectedStartWeek || (selectedStartWeek === "custom" && !customStartDate)}
                      onClick={() => {
                        const startVal = selectedStartWeek === "custom" ? customStartDate : (selectedStartWeek ?? undefined);
                        handleAction(() => onConfirmPlacement(intro.connectionId, startVal), "Placement confirmed!");
                      }}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Confirm Placement
                    </Button>
                  </>
                )}

                {/* Haven't decided yet */}
                {onRevertToAwaiting && !confirmReject && (
                  <Button size="sm" variant="outline" className="w-full" disabled={submitting}
                    onClick={() => handleAction(() => onRevertToAwaiting(intro.connectionId), "Updated — we'll let them know.")}>
                    <HelpCircle className="h-4 w-4 mr-1 text-amber-500" />
                    We haven&apos;t made our decision yet
                  </Button>
                )}

                {/* Not moving forward — disconnect */}
                {onRejectHiredClaim && !confirmReject && (
                  <Button size="sm" variant="outline" className="w-full text-slate-500" disabled={submitting}
                    onClick={() => setConfirmReject(true)}>
                    <XCircle className="h-4 w-4 mr-1" />
                    We will not be moving forward with {name}
                  </Button>
                )}
                {onRejectHiredClaim && confirmReject && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                    <p className="text-xs text-red-700">
                      Are you sure? This will end your connection with {name} and you will no longer be able to communicate through Baby Bloom.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setConfirmReject(false)} disabled={submitting}>Cancel</Button>
                      <Button size="sm" variant="destructive" className="flex-1" disabled={submitting}
                        onClick={() => handleAction(() => onRejectHiredClaim(intro.connectionId), "Connection ended.")}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Yes, disconnect
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Parent: OFFERED (parent-initiated) — Waiting */}
            {role === "parent" && isOffered && intro.fillInitiatedBy === "parent" && (
              <div className="border-t pt-4">
                <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Waiting for {name} to confirm the position.
                </div>
              </div>
            )}

            {/* OFFERED with null fillInitiatedBy — fallback safety net */}
            {isOffered && !intro.fillInitiatedBy && (
              <div className="border-t pt-4">
                <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  This position is pending confirmation. Please contact Baby Bloom if you need help.
                </div>
              </div>
            )}

            {/* ── Nanny: NOT_HIRED — Encouraging message + dismiss ── */}
            {role === "nanny" && isNotHired && (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm text-slate-600">
                  The {name} family has decided to go in a different direction. This is completely normal and happens often — the right family is out there for you!
                </p>

                <div className="rounded-lg bg-violet-50 border border-violet-100 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-violet-500 shrink-0" />
                    <p className="text-sm text-violet-700 font-medium">
                      Get help connecting with more families
                    </p>
                  </div>
                  <p className="text-xs text-violet-500 mt-1 ml-6">
                    We&apos;re here to help you find the perfect match. More features coming soon.
                  </p>
                </div>

                {onDismissConnection && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-slate-500"
                    disabled={submitting}
                    onClick={() => handleAction(() => onDismissConnection(intro.connectionId), "Removed.")}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Remove from My Positions
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Expiry Timer ──
function ExpiryTimer({ expiresAt }: { expiresAt: string }) {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return <span className="text-red-600 font-medium">Expired</span>;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const isUrgent = hours < 6;

  return (
    <span className={isUrgent ? "text-red-600 font-medium" : "text-slate-500"}>
      {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`} to respond
    </span>
  );
}
