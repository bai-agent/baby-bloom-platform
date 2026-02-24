"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StepProps, ParentRequestData } from "../ParentRequestFunnel";

const SCHEDULE_TYPE_OPTIONS = ["Yes", "No", "I'm Flexible"];
const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const TIME_BLOCK_OPTIONS = [
  "Morning (6am-10am)",
  "Midday (10am-2pm)",
  "Afternoon (2pm-6pm)",
  "Evening (6pm-10pm)",
];

const DAY_ROSTER_FIELD: Record<string, keyof ParentRequestData> = {
  Monday: "monday_roster",
  Tuesday: "tuesday_roster",
  Wednesday: "wednesday_roster",
  Thursday: "thursday_roster",
  Friday: "friday_roster",
  Saturday: "saturday_roster",
  Sunday: "sunday_roster",
};

interface SingleSelectTagsProps {
  options: string[];
  selected: string | null;
  onChange: (val: string) => void;
}

function SingleSelectTags({ options, selected, onChange }: SingleSelectTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-full border text-sm font-medium cursor-pointer transition-colors ${
            selected === opt
              ? "bg-violet-600 text-white border-violet-600"
              : "bg-white text-slate-700 border-slate-300 hover:border-violet-400"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

interface MultiSelectTagsProps {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}

function MultiSelectTags({ options, selected, onChange }: MultiSelectTagsProps) {
  const toggle = (opt: string) => {
    onChange(
      selected.includes(opt)
        ? selected.filter((v) => v !== opt)
        : [...selected, opt]
    );
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-4 py-2 rounded-full border text-sm font-medium cursor-pointer transition-colors ${
            selected.includes(opt)
              ? "bg-violet-600 text-white border-violet-600"
              : "bg-white text-slate-700 border-slate-300 hover:border-violet-400"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function StepRoster({ data, updateData, goNext, goBack }: StepProps) {
  const {
    schedule_type,
    hours_per_week,
    weekly_roster = [],
    monday_roster = [],
    tuesday_roster = [],
    wednesday_roster = [],
    thursday_roster = [],
    friday_roster = [],
    saturday_roster = [],
    sunday_roster = [],
    roster_details,
  } = data;

  const dayRosterMap: Record<string, string[]> = {
    Monday: monday_roster,
    Tuesday: tuesday_roster,
    Wednesday: wednesday_roster,
    Thursday: thursday_roster,
    Friday: friday_roster,
    Saturday: saturday_roster,
    Sunday: sunday_roster,
  };

  const isComplete =
    schedule_type != null &&
    hours_per_week != null &&
    hours_per_week >= 1 &&
    hours_per_week <= 56;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-slate-800">
          Roster
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pb-8">

        {/* Schedule Y/N/Flexible */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Do you have a set schedule? <span className="text-red-500">*</span>
          </Label>
          <SingleSelectTags
            options={SCHEDULE_TYPE_OPTIONS}
            selected={schedule_type ?? null}
            onChange={(val) => updateData({ schedule_type: val })}
          />
        </div>

        {/* Hours Per Week */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Hours per week <span className="text-red-500">*</span>
          </Label>
          <input
            type="number"
            min={1}
            max={56}
            value={hours_per_week ?? ""}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              updateData({ hours_per_week: isNaN(val) ? null : val });
            }}
            placeholder="Enter hours (1–56)"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
          />
        </div>

        {/* Weekly Roster */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Which days do you need a nanny?
          </Label>
          <MultiSelectTags
            options={DAY_OPTIONS}
            selected={weekly_roster}
            onChange={(val) => updateData({ weekly_roster: val })}
          />
        </div>

        {/* Per-day time blocks */}
        {weekly_roster.length > 0 && (
          <div className="flex flex-col gap-5">
            <Label className="text-sm font-medium text-slate-700">
              What times do you need a nanny on these days?
            </Label>
            {weekly_roster.map((day) => {
              const fieldKey = DAY_ROSTER_FIELD[day];
              const currentTimes = (data[fieldKey] as string[] | undefined) ?? dayRosterMap[day] ?? [];
              return (
                <div key={day} className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-600">{day}</span>
                  <MultiSelectTags
                    options={TIME_BLOCK_OPTIONS}
                    selected={currentTimes}
                    onChange={(val) => updateData({ [fieldKey]: val })}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Roster Details */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Roster Details
          </Label>
          <textarea
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none min-h-[120px] resize-y"
            value={roster_details ?? ""}
            placeholder={`Monday: 6:45am - 11:45am\nTuesday: 8:30am - 12:30pm\nFriday: 3pm - 6pm`}
            onChange={(e) => updateData({ roster_details: e.target.value || null })}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-2">
          <Button
            variant="outline"
            onClick={goBack}
            className="border-slate-300 text-slate-700 hover:border-violet-400"
          >
            Back
          </Button>
          <Button
            onClick={goNext}
            disabled={!isComplete}
            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
