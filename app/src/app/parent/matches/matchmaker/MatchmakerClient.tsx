"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Calendar,
  X,
  Plus,
  Clock,
  ChevronRight,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { saveDfyTimeSlots } from "@/lib/actions/matching";
import {
  getNext7Days,
  getBracketTimeOptions,
  getBracketForHour,
  sydneyToUTC,
  TIME_BRACKETS,
  BRACKET_KEYS,
} from "@/lib/timezone";
import type { BracketKey } from "@/lib/timezone";
import Link from "next/link";

interface ExactTimeSlot {
  id: string;
  date: string;
  bracket: BracketKey;
  hour: number;
  minute: number;
  isoUtc: string;
  displayLabel: string;
}

function utcToSydneyParts(isoUtc: string): { date: string; hour: number; minute: number } {
  const d = new Date(isoUtc);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";
  const h = parseInt(get("hour") === "24" ? "0" : get("hour"), 10);
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: h,
    minute: parseInt(get("minute"), 10),
  };
}

function hydrateSlots(isoUtcArr: string[], days: ReturnType<typeof getNext7Days>): ExactTimeSlot[] {
  return isoUtcArr
    .map((isoUtc) => {
      const { date, hour, minute } = utcToSydneyParts(isoUtc);
      const bracket = getBracketForHour(hour);
      if (!bracket) return null;
      const dayInfo = days.find((d) => d.date === date);
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const displayMin = minute.toString().padStart(2, "0");
      const timeLabel = `${displayHour}:${displayMin} ${period}`;
      const displayLabel = `${dayInfo?.dayLabel ?? ""} ${dayInfo?.dateLabel ?? date} — ${timeLabel}`;
      return {
        id: `init-${isoUtc}`,
        date,
        bracket,
        hour,
        minute,
        isoUtc,
        displayLabel,
      } as ExactTimeSlot;
    })
    .filter((s): s is ExactTimeSlot => s !== null);
}

export function MatchmakerClient({ initialSlots = [] }: { initialSlots?: string[] }) {
  const days = getNext7Days();
  const hydrated = useMemo(() => hydrateSlots(initialSlots, days), []);
  const [slots, setSlots] = useState<ExactTimeSlot[]>(hydrated);
  const [pickerOpen, setPickerOpen] = useState(hydrated.length === 0);
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [pickerBracket, setPickerBracket] = useState<BracketKey | null>(null);
  const [pickerTime, setPickerTime] = useState<{
    hour: number;
    minute: number;
    label: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPicker = useCallback(() => {
    setPickerDate(null);
    setPickerBracket(null);
    setPickerTime(null);
  }, []);

  const addSlot = useCallback(() => {
    if (!pickerDate || !pickerBracket || !pickerTime) return;

    const isoUtc = sydneyToUTC(pickerDate, pickerTime.hour, pickerTime.minute);

    if (slots.some((s) => s.isoUtc === isoUtc)) {
      setError("You've already selected this time.");
      return;
    }

    const dayInfo = days.find((d) => d.date === pickerDate);
    const displayLabel = `${dayInfo?.dayLabel ?? ""} ${dayInfo?.dateLabel ?? pickerDate} — ${pickerTime.label}`;

    const newSlot: ExactTimeSlot = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: pickerDate,
      bracket: pickerBracket,
      hour: pickerTime.hour,
      minute: pickerTime.minute,
      isoUtc,
      displayLabel,
    };

    setSlots((prev) => [...prev, newSlot]);
    setPickerOpen(false);
    resetPicker();
    setError(null);
  }, [pickerDate, pickerBracket, pickerTime, slots, days, resetPicker]);

  const removeSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const openNewPicker = () => {
    resetPicker();
    setPickerOpen(true);
    setError(null);
  };

  const canSubmit = slots.length >= 3;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const result = await saveDfyTimeSlots(slots.map((s) => s.isoUtc));

      if (result.success) {
        window.location.href = "/parent/matches/checkout";
      } else {
        setError(result.error || "Something went wrong.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const timeOptions = pickerBracket
    ? getBracketTimeOptions(pickerBracket)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 to-white">
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
        {/* Back link */}
        <Link
          href="/parent/matches"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to matches
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-100 mb-4">
            <Sparkles className="w-6 h-6 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Let us find your nanny
          </h1>
          <p className="text-slate-600 mt-2 max-w-md mx-auto">
            We&apos;ll do all the heavy lifting by arranging 3&ndash;5
            introduction calls with your top-matched nannies.
          </p>
        </div>

        {/* How it works */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            How it works
          </h2>
          <div className="space-y-2.5 text-sm text-slate-600">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <span>Let us know when you would like your introductory calls</span>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <span>We arrange everything with your best-matched nannies</span>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <span>You approve your favourites!</span>
            </div>
          </div>
        </div>

        {/* Time slot picker card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-violet-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Select your intro call times
            </h2>
          </div>

          <p className="text-sm text-slate-500">
            Pick at least 3 times when you&apos;re free for a 15-minute intro
            call. Nannies will choose the time that works best for them.
          </p>

          {/* Existing slots */}
          {slots.length > 0 && (
            <div className="space-y-2">
              {slots.map((slot, i) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-sm font-medium text-violet-800">
                      Slot {i + 1}: {slot.displayLabel}
                    </span>
                  </div>
                  <button
                    onClick={() => removeSlot(slot.id)}
                    className="text-violet-400 hover:text-red-500 transition-colors p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Picker */}
          {pickerOpen ? (
            <div className="border border-slate-200 rounded-lg p-3 space-y-3">
              {/* Step 1: Date */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">
                  1. Pick a date
                </p>
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day) => (
                    <button
                      key={day.date}
                      onClick={() => {
                        setPickerDate(day.date);
                        setPickerBracket(null);
                        setPickerTime(null);
                        setError(null);
                      }}
                      className={`flex flex-col items-center px-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        pickerDate === day.date
                          ? "bg-violet-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700"
                      }`}
                    >
                      <span>{day.dayLabel}</span>
                      <span className="text-[11px] mt-0.5 opacity-80">
                        {day.dateLabel}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Bracket */}
              {pickerDate && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" /> 2. Pick a time bracket
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {BRACKET_KEYS.map((key) => {
                      const bracket = TIME_BRACKETS[key];
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setPickerBracket(key);
                            setPickerTime(null);
                            setError(null);
                          }}
                          className={`flex flex-col items-center px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                            pickerBracket === key
                              ? "bg-violet-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700"
                          }`}
                        >
                          <span>{bracket.label}</span>
                          <span className="text-[10px] mt-0.5 opacity-70 font-normal">
                            {bracket.sublabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Exact time */}
              {pickerBracket && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" /> 3. Pick an exact time
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {timeOptions.map((opt) => {
                      const isSelected =
                        pickerTime?.hour === opt.hour &&
                        pickerTime?.minute === opt.minute;
                      return (
                        <button
                          key={`${opt.hour}:${opt.minute}`}
                          onClick={() => {
                            setPickerTime(opt);
                            setError(null);
                          }}
                          className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-violet-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add button */}
              {pickerTime && (
                <Button
                  onClick={addSlot}
                  size="sm"
                  className="w-full bg-violet-600 hover:bg-violet-700 text-sm"
                >
                  Add this time
                </Button>
              )}
            </div>
          ) : slots.length < 5 ? (
            <button
              onClick={openNewPicker}
              className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium py-2"
            >
              <Plus className="h-4 w-4" />
              Add another intro time
            </button>
          ) : (
            <button
              disabled
              className="flex items-center gap-2 text-sm text-slate-300 font-medium py-2 cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Maximum 5 time slots
            </button>
          )}

          {/* Selection summary */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">
              {slots.length} slot{slots.length !== 1 ? "s" : ""} selected
            </span>
            {slots.length > 0 && slots.length < 3 && (
              <span className="text-amber-600 text-xs">
                Select at least {3 - slots.length} more
              </span>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="w-full bg-violet-600 hover:bg-violet-700"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1.5" />
                Continue
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
