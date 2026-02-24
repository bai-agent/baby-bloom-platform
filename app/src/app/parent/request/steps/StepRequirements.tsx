"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StepProps } from "../ParentRequestFunnel";

const LANGUAGE_OPTIONS = ["English", "Foreign language", "Multiple"];
const MIN_AGE_OPTIONS = ["18", "21", "25", "28", "35"];
const EXPERIENCE_OPTIONS = ["1", "2", "3", "5+"];
const QUALIFICATION_OPTIONS = [
  "Cert III ECEC",
  "Cert IV Education Support",
  "Diploma ECEC",
  "Bachelor ECE (or equivalent)",
  "No Qualifications Necessary",
];
const CERTIFICATE_OPTIONS = [
  "CPR",
  "First Aid",
  "Anaphylaxis and Asthma Management",
  "Child Protection",
  "None",
];
const ASSURANCE_OPTIONS = [
  "Working with Children Check",
  "National Police Check",
  "Professional References",
  "None",
];
const RESIDENCY_OPTIONS = ["Permanent Resident", "Any Status"];
const HOURLY_RATE_OPTIONS = ["$35", "$40", "$45", "$50", "$60", "$75"];
const PAY_FREQUENCY_OPTIONS = ["Daily", "Weekly", "Fortnightly", "Monthly"];
const YES_NO_OPTIONS = ["Yes", "No"];

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

export function StepRequirements({ data, updateData, goNext, goBack }: StepProps) {
  const {
    language_preference,
    language_preference_details,
    minimum_age,
    years_of_experience,
    qualification_requirement,
    certificate_requirements = [],
    assurance_requirements = [],
    residency_status_requirement,
    vaccination_required,
    drivers_license_required,
    car_required,
    pets_required,
    non_smoker_required,
    other_requirements_yn,
    other_requirements_details,
    hourly_rate,
    pay_frequency,
  } = data;

  const showLanguageDetails =
    language_preference === "Foreign language" || language_preference === "Multiple";

  const showOtherDetails = other_requirements_yn === "Yes";

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-slate-800">
          Nanny Requirements
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">All fields are optional</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pb-8">

        {/* Language Preference */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Language Preference
          </Label>
          <SingleSelectTags
            options={LANGUAGE_OPTIONS}
            selected={language_preference ?? null}
            onChange={(val) => updateData({ language_preference: val })}
          />
        </div>

        {/* Language Preference Details */}
        {showLanguageDetails && (
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-slate-700">
              Language Preference(s)
            </Label>
            <input
              type="text"
              value={language_preference_details ?? ""}
              placeholder="e.g. Mandarin, Spanish"
              onChange={(e) =>
                updateData({ language_preference_details: e.target.value || null })
              }
              className={selectClass}
            />
          </div>
        )}

        {/* Minimum Age */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Minimum Age Requirement
          </Label>
          <SingleSelectTags
            options={MIN_AGE_OPTIONS}
            selected={minimum_age ?? null}
            onChange={(val) => updateData({ minimum_age: val })}
          />
        </div>

        {/* Years of Experience */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Years of Experience
          </Label>
          <SingleSelectTags
            options={EXPERIENCE_OPTIONS}
            selected={years_of_experience ?? null}
            onChange={(val) => updateData({ years_of_experience: val })}
          />
        </div>

        {/* Qualification Requirement */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Qualification Requirement
          </Label>
          <select
            className={selectClass}
            value={qualification_requirement ?? ""}
            onChange={(e) =>
              updateData({ qualification_requirement: e.target.value || null })
            }
          >
            <option value="">Select qualification</option>
            {QUALIFICATION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Certificate Requirements */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Certificate Requirements
          </Label>
          <MultiSelectTags
            options={CERTIFICATE_OPTIONS}
            selected={certificate_requirements}
            onChange={(val) => updateData({ certificate_requirements: val })}
          />
        </div>

        {/* Assurance Requirements */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Assurances
          </Label>
          <MultiSelectTags
            options={ASSURANCE_OPTIONS}
            selected={assurance_requirements}
            onChange={(val) => updateData({ assurance_requirements: val })}
          />
        </div>

        {/* Residency Status */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Residency Status
          </Label>
          <SingleSelectTags
            options={RESIDENCY_OPTIONS}
            selected={residency_status_requirement ?? null}
            onChange={(val) => updateData({ residency_status_requirement: val })}
          />
        </div>

        {/* Full-Vaccination Status */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Full-Vaccination Status Required
          </Label>
          <SingleSelectTags
            options={YES_NO_OPTIONS}
            selected={vaccination_required ?? null}
            onChange={(val) => updateData({ vaccination_required: val })}
          />
        </div>

        {/* Driver's License */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Driver&apos;s License Required
          </Label>
          <SingleSelectTags
            options={YES_NO_OPTIONS}
            selected={drivers_license_required ?? null}
            onChange={(val) => updateData({ drivers_license_required: val })}
          />
        </div>

        {/* Car */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Car Required
          </Label>
          <SingleSelectTags
            options={YES_NO_OPTIONS}
            selected={car_required ?? null}
            onChange={(val) => updateData({ car_required: val })}
          />
        </div>

        {/* Pets */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Comfortable with Pets
          </Label>
          <SingleSelectTags
            options={YES_NO_OPTIONS}
            selected={pets_required ?? null}
            onChange={(val) => updateData({ pets_required: val })}
          />
        </div>

        {/* Non-Smoker Status */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Non-Smoker Status Required
          </Label>
          <SingleSelectTags
            options={YES_NO_OPTIONS}
            selected={non_smoker_required ?? null}
            onChange={(val) => updateData({ non_smoker_required: val })}
          />
        </div>

        {/* Other Requirements Y/N */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Any Other Nanny Requirements?
          </Label>
          <SingleSelectTags
            options={YES_NO_OPTIONS}
            selected={other_requirements_yn ?? null}
            onChange={(val) => updateData({ other_requirements_yn: val })}
          />
        </div>

        {/* Other Requirements Details */}
        {showOtherDetails && (
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-slate-700">
              Other Nanny Requirement Details
            </Label>
            <textarea
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none min-h-[100px] resize-y"
              value={other_requirements_details ?? ""}
              placeholder="Please describe your other requirements"
              onChange={(e) =>
                updateData({ other_requirements_details: e.target.value || null })
              }
            />
          </div>
        )}

        {/* Hourly Rate */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Hourly Rate
          </Label>
          <SingleSelectTags
            options={HOURLY_RATE_OPTIONS}
            selected={hourly_rate ?? null}
            onChange={(val) => updateData({ hourly_rate: val })}
          />
        </div>

        {/* Pay Frequency */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-slate-700">
            Pay Frequency
          </Label>
          <SingleSelectTags
            options={PAY_FREQUENCY_OPTIONS}
            selected={pay_frequency ?? null}
            onChange={(val) => updateData({ pay_frequency: val })}
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
            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 font-medium rounded-lg"
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
