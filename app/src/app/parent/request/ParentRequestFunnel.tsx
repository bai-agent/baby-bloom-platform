"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FunnelProgress } from "@/components/ui/funnel-progress";
import { StepPlacement } from "./steps/StepPlacement";
import { StepRoster } from "./steps/StepRoster";
import { StepRequirements } from "./steps/StepRequirements";
import { StepChildren } from "./steps/StepChildren";
import { StepAboutRole } from "./steps/StepAboutRole";

const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";

// ── Data interface: matches Wix "Nanny Request" form exactly ──

export interface ParentRequestData {
  // Step 1 — Placement Details
  urgency: string | null; // "Immediately" | "At a later date"
  start_date: string | null; // ISO date
  placement_length: string | null; // "Ongoing" | "Until a certain date"
  end_date: string | null; // ISO date

  // Step 2 — Roster
  schedule_type: string | null; // "Yes" | "No" | "I'm Flexible"
  hours_per_week: number | null; // 1–56
  weekly_roster: string[]; // multi-select day tags
  monday_roster: string[];
  tuesday_roster: string[];
  wednesday_roster: string[];
  thursday_roster: string[];
  friday_roster: string[];
  saturday_roster: string[];
  sunday_roster: string[];
  roster_details: string | null; // free-text

  // Step 3 — Nanny Requirements (all optional)
  language_preference: string | null; // "English" | "Foreign language" | "Multiple"
  language_preference_details: string | null;
  minimum_age: string | null; // "18" | "21" | "25" | "28" | "35"
  years_of_experience: string | null; // "1" | "2" | "3" | "5+"
  qualification_requirement: string | null; // dropdown
  certificate_requirements: string[]; // multi-select tags
  assurance_requirements: string[]; // multi-select tags
  residency_status_requirement: string | null; // "Permanent Resident" | "Any Status"
  vaccination_required: string | null; // "Yes" | "No"
  drivers_license_required: string | null; // "Yes" | "No"
  car_required: string | null; // "Yes" | "No"
  pets_required: string | null; // "Yes" | "No"
  non_smoker_required: string | null; // "Yes" | "No"
  other_requirements_yn: string | null; // "Yes" | "No"
  other_requirements_details: string | null;
  hourly_rate: string | null; // "$35" | "$40" | "$45" | "$50" | "$60" | "$75"
  pay_frequency: string | null; // "Daily" | "Weekly" | "Fortnightly" | "Monthly"

  // Step 4 — Children Details
  num_children: number | null; // 1 | 2 | 3
  child_a_age: string | null; // dropdown age band
  child_a_gender: string | null;
  child_b_age: string | null;
  child_b_gender: string | null;
  child_c_age: string | null;
  child_c_gender: string | null;
  child_needs_yn: string | null; // "Yes" | "No" | "Rather Not Say"
  child_needs_details: string | null;

  // Step 5 — About Role
  suburb: string | null;
  postcode: number | null;
  reason_for_nanny: string[]; // multi-select tags
  level_of_support: string[]; // multi-select tags
  role_responsibilities: string | null;
  about_family_yn: string | null; // "Yes" | "No"
  about_family_details: string | null;
}

export interface StepProps {
  data: Partial<ParentRequestData>;
  updateData: (data: Partial<ParentRequestData>) => void;
  goNext: () => void;
  goBack: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
}

// ── Dev mock data ──

const DEV_MOCK_DATA: Partial<ParentRequestData> = {
  urgency: "At a later date",
  start_date: "2026-03-15",
  placement_length: "Ongoing",
  end_date: null,
  schedule_type: "Yes",
  hours_per_week: 25,
  weekly_roster: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  monday_roster: ["Morning (6am-10am)", "Midday (10am-2pm)"],
  tuesday_roster: ["Morning (6am-10am)", "Midday (10am-2pm)"],
  wednesday_roster: ["Morning (6am-10am)", "Midday (10am-2pm)"],
  thursday_roster: ["Morning (6am-10am)", "Midday (10am-2pm)"],
  friday_roster: ["Morning (6am-10am)", "Midday (10am-2pm)"],
  saturday_roster: [],
  sunday_roster: [],
  roster_details: "Monday: 6:45am - 11:45am\nTuesday: 8:30am - 12:30pm\nFriday: 3pm - 6pm",
  language_preference: "English",
  minimum_age: "25",
  years_of_experience: "3",
  qualification_requirement: "Cert III ECEC",
  certificate_requirements: ["CPR", "First Aid"],
  assurance_requirements: ["Working with Children Check"],
  residency_status_requirement: "Permanent Resident",
  vaccination_required: "Yes",
  drivers_license_required: "Yes",
  car_required: "No",
  pets_required: "Yes",
  non_smoker_required: "Yes",
  other_requirements_yn: "No",
  hourly_rate: "$40",
  pay_frequency: "Weekly",
  num_children: 2,
  child_a_age: "1–2 years",
  child_a_gender: "Female",
  child_b_age: "3–4 years",
  child_b_gender: "Male",
  child_needs_yn: "No",
  suburb: "Bondi",
  postcode: 2026,
  reason_for_nanny: ["Returning to work", "Child Development"],
  level_of_support: ["Engagement and Play", "Educational Support"],
  role_responsibilities: "Looking after kids during work hours, preparing lunch, taking to park",
  about_family_yn: "Yes",
  about_family_details: "We are a friendly family with a small dog. Both parents work from home some days.",
};

// ── Step definitions (matches Wix form pages) ──

const STEPS = [
  { id: "placement", label: "Placement" },
  { id: "roster", label: "Roster" },
  { id: "requirements", label: "Requirements" },
  { id: "children", label: "Children" },
  { id: "about-role", label: "About Role" },
];

export function ParentRequestFunnel() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const defaultData: Partial<ParentRequestData> = isDevMode
    ? { ...DEV_MOCK_DATA }
    : {
        weekly_roster: [],
        monday_roster: [],
        tuesday_roster: [],
        wednesday_roster: [],
        thursday_roster: [],
        friday_roster: [],
        saturday_roster: [],
        sunday_roster: [],
        certificate_requirements: [],
        assurance_requirements: [],
        reason_for_nanny: [],
        level_of_support: [],
      };

  const [formData, setFormData] = useState<Partial<ParentRequestData>>(defaultData);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const updateData = (stepData: Partial<ParentRequestData>) => {
    setFormData((prev) => ({ ...prev, ...stepData }));
  };

  const handleSubmit = async () => {
    if (isDevMode) {
      setSubmitted(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // TODO: wire to server action
    try {
      setSubmitted(true);
    } catch {
      setError("Failed to submit request");
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Thanks, we received your submission.</h2>
        <p className="text-slate-500 mb-6">We&apos;ll match you with suitable nannies shortly.</p>
        <button
          onClick={() => router.push("/parent/dashboard")}
          className="px-6 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const stepProps: StepProps = {
    data: formData,
    updateData,
    goNext,
    goBack,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === STEPS.length - 1,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <FunnelProgress currentStep={currentStep} steps={STEPS} />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
      )}

      {currentStep === 0 && <StepPlacement {...stepProps} />}
      {currentStep === 1 && <StepRoster {...stepProps} />}
      {currentStep === 2 && <StepRequirements {...stepProps} />}
      {currentStep === 3 && <StepChildren {...stepProps} />}
      {currentStep === 4 && (
        <StepAboutRole
          {...stepProps}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
