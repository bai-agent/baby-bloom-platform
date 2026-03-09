"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Calendar, X, Plus, Clock, ChevronRight } from "lucide-react";
import { saveDfyTimeSlots } from "@/lib/actions/matching";
import {
  getNext7Days,
  getBracketTimeOptions,
  sydneyToUTC,
  TIME_BRACKETS,
  BRACKET_KEYS,
} from "@/lib/timezone";
import type { BracketKey } from "@/lib/timezone";

interface ExactTimeSlot {
  id: string;
  date: string;
  bracket: BracketKey;
  hour: number;
  minute: number;
  isoUtc: string;
  displayLabel: string;
}

interface DfyModalProps {
  open: boolean;
  onClose: () => void;
}

export function DfyModal({ open, onClose }: DfyModalProps) {
  const [slots, setSlots] = useState<ExactTimeSlot[]>([]);
  const [pickerOpen, setPickerOpen] = useState(true);
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [pickerBracket, setPickerBracket] = useState<BracketKey | null>(null);
  const [pickerTime, setPickerTime] = useState<{
    hour: number;
    minute: number;
    label: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = getNext7Days();

  const resetPicker = useCallback(() => {
    setPickerDate(null);
    setPickerBracket(null);
    setPickerTime(null);
  }, []);

  const addSlot = useCallback(() => {
    if (!pickerDate || !pickerBracket || !pickerTime) return;

    const isoUtc = sydneyToUTC(pickerDate, pickerTime.hour, pickerTime.minute);

    // Check for duplicate
    if (slots.some((s) => s.isoUtc === isoUtc)) {
      setError("You've already selected this time.");
      return;
    }

    // Build display label
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

    const result = await saveDfyTimeSlots(slots.map((s) => s.isoUtc));

    if (result.success) {
      // Hard redirect — router.push doesn't work reliably with Dialog open
      window.location.href = '/parent/matches/share';
    } else {
      setError(result.error || "Something went wrong.");
      setLoading(false);
    }
  };

  const timeOptions = pickerBracket
    ? getBracketTimeOptions(pickerBracket)
    : [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-violet-600" />
            Select your intro call times
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500 -mt-2">
          Pick at least 3 times when you&apos;re free for a 15-minute intro
          call. Nannies will choose the time that works best for them.
        </p>

        {/* ── Existing slots (review cards) ── */}
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

        {/* ── Picker (accordion) ── */}
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
        ) : (
          /* ── "+ Add another" button ── */
          <button
            onClick={openNewPicker}
            className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium py-2"
          >
            <Plus className="h-4 w-4" />
            Add another intro time
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

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Find me a nanny"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
