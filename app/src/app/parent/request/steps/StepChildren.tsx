"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StepProps } from "../ParentRequestFunnel";

const NUM_CHILDREN_OPTIONS = ["1", "2", "3"];
const GENDER_OPTIONS = ["Female", "Male", "Rather Not Say"];
const CHILD_NEEDS_OPTIONS = ["Yes", "No", "Rather Not Say"];

const AGE_OPTIONS = [
  "0–3 months",
  "3–6 months",
  "6–12 months",
  "1–2 years",
  "2–3 years",
  "3–4 years",
  "4–5 years",
  "5–10 years",
  "10–13 years",
  "13–16 years",
  "16+ years",
];

const selectClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none";

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

interface AgeDropdownProps {
  label: string;
  value: string | null;
  onChange: (val: string | null) => void;
  required?: boolean;
}

function AgeDropdown({ label, value, onChange, required }: AgeDropdownProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <select
        className={selectClass}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Select age range</option>
        {AGE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function StepChildren({ data, updateData, goNext, goBack }: StepProps) {
  const {
    num_children,
    child_a_age,
    child_a_gender,
    child_b_age,
    child_b_gender,
    child_c_age,
    child_c_gender,
    child_needs_yn,
    child_needs_details,
  } = data;

  const numChildrenStr = num_children != null ? String(num_children) : null;
  const showChildB = num_children != null && num_children >= 2;
  const showChildC = num_children != null && num_children >= 3;
  const showChildNeeds = child_needs_yn === "Yes";

  const isComplete =
    num_children != null &&
    child_a_age != null &&
    child_a_gender != null &&
    child_needs_yn != null &&
    (showChildB ? child_b_age != null && child_b_gender != null : true) &&
    (showChildC ? child_c_age != null && child_c_gender != null : true);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-slate-800">
          Children Details
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pb-8">

        {/* Number of Children */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            How many children do you have? <span className="text-red-500">*</span>
          </Label>
          <SingleSelectTags
            options={NUM_CHILDREN_OPTIONS}
            selected={numChildrenStr}
            onChange={(val) => updateData({ num_children: parseInt(val, 10) })}
          />
        </div>

        {/* Child A */}
        {num_children != null && (
          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Child A</p>
            <AgeDropdown
              label="Age"
              value={child_a_age ?? null}
              onChange={(val) => updateData({ child_a_age: val })}
              required
            />
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-slate-700">
                Gender <span className="text-red-500">*</span>
              </Label>
              <SingleSelectTags
                options={GENDER_OPTIONS}
                selected={child_a_gender ?? null}
                onChange={(val) => updateData({ child_a_gender: val })}
              />
            </div>
          </div>
        )}

        {/* Child B */}
        {showChildB && (
          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Child B</p>
            <AgeDropdown
              label="Age"
              value={child_b_age ?? null}
              onChange={(val) => updateData({ child_b_age: val })}
            />
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-slate-700">Gender</Label>
              <SingleSelectTags
                options={GENDER_OPTIONS}
                selected={child_b_gender ?? null}
                onChange={(val) => updateData({ child_b_gender: val })}
              />
            </div>
          </div>
        )}

        {/* Child C */}
        {showChildC && (
          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Child C</p>
            <AgeDropdown
              label="Age"
              value={child_c_age ?? null}
              onChange={(val) => updateData({ child_c_age: val })}
            />
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-slate-700">Gender</Label>
              <SingleSelectTags
                options={GENDER_OPTIONS}
                selected={child_c_gender ?? null}
                onChange={(val) => updateData({ child_c_gender: val })}
              />
            </div>
          </div>
        )}

        {/* Child Needs Y/N */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Do your children have any specific needs? <span className="text-red-500">*</span>
          </Label>
          <SingleSelectTags
            options={CHILD_NEEDS_OPTIONS}
            selected={child_needs_yn ?? null}
            onChange={(val) => updateData({ child_needs_yn: val })}
          />
        </div>

        {/* Child Needs Details */}
        {showChildNeeds && (
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-slate-700">
              Child Needs Details
            </Label>
            <textarea
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none min-h-[100px] resize-y"
              value={child_needs_details ?? ""}
              placeholder="You can write any specific needs or details here"
              onChange={(e) =>
                updateData({ child_needs_details: e.target.value || null })
              }
            />
          </div>
        )}

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
