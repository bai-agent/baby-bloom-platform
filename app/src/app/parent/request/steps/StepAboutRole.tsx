"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { StepProps } from "../ParentRequestFunnel";

const REASON_FOR_NANNY_OPTIONS = [
  "Mothers Help",
  "Returning to work",
  "Pick Up & Drop Off",
  "Child Development",
  "Home Management",
];

const LEVEL_OF_SUPPORT_OPTIONS = [
  "Supervision",
  "Engagement and Play",
  "Educational Support",
  "Developmental Assistance",
];

const ABOUT_FAMILY_OPTIONS = ["Yes", "No"];

interface AboutRoleProps extends StepProps {
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

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

export function StepAboutRole({
  data,
  updateData,
  goBack,
  onSubmit,
  isSubmitting,
}: AboutRoleProps) {
  const {
    suburb,
    postcode,
    reason_for_nanny = [],
    level_of_support = [],
    role_responsibilities,
    about_family_yn,
    about_family_details,
  } = data;

  const showAboutFamilyDetails = about_family_yn === "Yes";

  const isComplete =
    suburb != null &&
    suburb.trim().length > 0 &&
    reason_for_nanny.length > 0 &&
    about_family_yn != null;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-slate-800">
          About the Role
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pb-8">

        {/* Suburb */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Suburb <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-slate-500">Please enter a suburb in Sydney, NSW</p>
          <Input
            type="text"
            value={suburb ?? ""}
            placeholder="e.g. Bondi, Surry Hills"
            onChange={(e) => updateData({ suburb: e.target.value || null })}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
          />
        </div>

        {/* Postcode */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Postcode
          </Label>
          <input
            type="number"
            value={postcode ?? ""}
            placeholder="e.g. 2026"
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              updateData({ postcode: isNaN(val) ? null : val });
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
          />
        </div>

        {/* Reason for Nanny */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Reason for Nanny <span className="text-red-500">*</span>
          </Label>
          <MultiSelectTags
            options={REASON_FOR_NANNY_OPTIONS}
            selected={reason_for_nanny}
            onChange={(val) => updateData({ reason_for_nanny: val })}
          />
        </div>

        {/* Level of Support */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Level of Support
          </Label>
          <MultiSelectTags
            options={LEVEL_OF_SUPPORT_OPTIONS}
            selected={level_of_support}
            onChange={(val) => updateData({ level_of_support: val })}
          />
        </div>

        {/* Role & Responsibilities */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Role &amp; Responsibilities
          </Label>
          <p className="text-xs text-slate-500">
            The more detail you can express the more likely you are to find the perfect support
          </p>
          <textarea
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none min-h-[120px] resize-y"
            value={role_responsibilities ?? ""}
            placeholder="Here you can write anything that you would need your nanny to do"
            onChange={(e) =>
              updateData({ role_responsibilities: e.target.value || null })
            }
          />
        </div>

        {/* About Family Y/N */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Would you like to share anything about your family? <span className="text-red-500">*</span>
          </Label>
          <SingleSelectTags
            options={ABOUT_FAMILY_OPTIONS}
            selected={about_family_yn ?? null}
            onChange={(val) => updateData({ about_family_yn: val })}
          />
        </div>

        {/* About Family Details */}
        {showAboutFamilyDetails && (
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-slate-700">
              About Your Family
            </Label>
            <textarea
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none min-h-[120px] resize-y"
              value={about_family_details ?? ""}
              placeholder="Here you can share any information that you would like your nanny to know about your family"
              onChange={(e) =>
                updateData({ about_family_details: e.target.value || null })
              }
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-2">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={isSubmitting}
            className="border-slate-300 text-slate-700 hover:border-violet-400"
          >
            Back
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!isComplete || isSubmitting}
            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
