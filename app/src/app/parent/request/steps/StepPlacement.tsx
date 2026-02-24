"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepProps } from "../ParentRequestFunnel";

const URGENCY_OPTIONS = ["Immediately", "At a later date"];
const PLACEMENT_LENGTH_OPTIONS = ["Ongoing", "Until a certain date"];

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

export function StepPlacement({ data, updateData, goNext, isFirstStep }: StepProps) {
  const { urgency, start_date, placement_length, end_date } = data;

  const today = new Date().toISOString().split("T")[0];

  const showEndDate = placement_length === "Until a certain date";

  const isComplete =
    urgency != null &&
    start_date != null &&
    start_date.trim().length > 0 &&
    placement_length != null &&
    (placement_length !== "Until a certain date" ||
      (end_date != null && end_date.trim().length > 0));

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-slate-800">
          Placement Details
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pb-8">

        {/* Urgency */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            When do you need the nanny to start? <span className="text-red-500">*</span>
          </Label>
          <SingleSelectTags
            options={URGENCY_OPTIONS}
            selected={urgency ?? null}
            onChange={(val) => updateData({ urgency: val })}
          />
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Start Date <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-slate-500">Select when you would like the placement to begin</p>
          <Input
            type="date"
            min={today}
            value={start_date ?? ""}
            onChange={(e) => updateData({ start_date: e.target.value || null })}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
          />
        </div>

        {/* Placement Length */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            How long do you need the placement? <span className="text-red-500">*</span>
          </Label>
          <SingleSelectTags
            options={PLACEMENT_LENGTH_OPTIONS}
            selected={placement_length ?? null}
            onChange={(val) => updateData({ placement_length: val })}
          />
        </div>

        {/* End Date — only shown if "Until a certain date" */}
        {showEndDate && (
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-slate-700">
              End Date <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-slate-500">Select when you would like the placement to end</p>
            <Input
              type="date"
              min={today}
              value={end_date ?? ""}
              onChange={(e) => updateData({ end_date: e.target.value || null })}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-2">
          {!isFirstStep ? (
            <Button
              variant="outline"
              onClick={() => {}}
              className="border-slate-300 text-slate-700 hover:border-violet-400"
            >
              Back
            </Button>
          ) : (
            <div />
          )}
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
