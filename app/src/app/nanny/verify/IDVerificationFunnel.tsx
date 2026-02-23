"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FunnelProgress } from "@/components/ui/funnel-progress";
import { StepVerifyIntro } from "./steps/StepVerifyIntro";
import { StepIdentification } from "./steps/StepIdentification";
import { StepWWCC } from "./steps/StepWWCC";
import { StepContactDetails } from "./steps/StepContactDetails";

const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";

// ── Data interface: matches Wix "Nanny – ID VER" form exactly ──

export interface IDVerificationData {
  // Step 2 — Identification Details
  surname: string | null;
  given_names: string | null;
  date_of_birth: string | null; // ISO date, max today
  passport_country: string | null; // dropdown
  passport_file: string | null; // file name/URL placeholder
  identification_photo: string | null; // file name/URL placeholder
  passport_confirmed: boolean; // checkbox

  // Step 3 — WWCC Details
  wwcc_method: string | null; // "grant_email" | "service_nsw_app" | "manual_entry"
  wwcc_grant_email_file: string | null; // file name/URL placeholder
  wwcc_service_nsw_file: string | null; // file name/URL placeholder
  wwcc_number: string | null; // format: WWC + 7 digits + 1 capital letter
  wwcc_expiry_date: string | null; // ISO date, manual entry only
  wwcc_confirmed: boolean; // checkbox

  // Step 4 — Contact Details
  phone_number: string | null; // AU phone
  address_line: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
}

export interface StepProps {
  data: Partial<IDVerificationData>;
  updateData: (data: Partial<IDVerificationData>) => void;
  updateFile?: (fieldName: string, file: File) => void;
  getFile?: (fieldName: string) => File | undefined;
  goNext: () => void;
  goBack: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
}

// ── Dev mock data ──

const DEV_MOCK_DATA: Partial<IDVerificationData> = {
  surname: "Wilson",
  given_names: "Emma Jane",
  date_of_birth: "1998-03-15",
  passport_country: "Australia",
  passport_file: "passport-emma.jpg",
  identification_photo: "headshot-emma.jpg",
  passport_confirmed: true,
  wwcc_method: "Manual Entry",
  wwcc_number: "WWC1234567A",
  wwcc_confirmed: true,
  phone_number: "0412 345 678",
  address_line: "42 Bondi Road",
  city: "Bondi",
  state: "NSW",
  postcode: "2026",
  country: "Australia",
};

// ── Step definitions (matches Wix form pages) ──

const STEPS = [
  { id: "intro", label: "Start" },
  { id: "identification", label: "Identity" },
  { id: "wwcc", label: "WWCC" },
  { id: "contact", label: "Contact" },
];

export function IDVerificationFunnel() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const defaultData: Partial<IDVerificationData> = isDevMode
    ? { ...DEV_MOCK_DATA }
    : {
        passport_confirmed: false,
        wwcc_confirmed: false,
      };

  const [formData, setFormData] = useState<Partial<IDVerificationData>>(defaultData);
  const [files, setFiles] = useState<Record<string, File>>({});

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const updateData = (stepData: Partial<IDVerificationData>) => {
    setFormData((prev) => ({ ...prev, ...stepData }));
  };

  const updateFile = useCallback((fieldName: string, file: File) => {
    setFiles((prev) => ({ ...prev, [fieldName]: file }));
  }, []);

  const getFile = useCallback((fieldName: string): File | undefined => {
    return files[fieldName];
  }, [files]);

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Thanks, we received your submission.</h2>
        <p className="text-slate-500 mb-6">Your verification documents are being reviewed.</p>
        <button
          onClick={() => router.push("/nanny/verification")}
          className="px-6 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium"
        >
          Back to Verification
        </button>
      </div>
    );
  }

  const stepProps: StepProps = {
    data: formData,
    updateData,
    updateFile,
    getFile,
    goNext,
    goBack,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === STEPS.length - 1,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <FunnelProgress currentStep={currentStep} steps={STEPS} />

      {currentStep === 0 && <StepVerifyIntro {...stepProps} />}
      {currentStep === 1 && <StepIdentification {...stepProps} />}
      {currentStep === 2 && <StepWWCC {...stepProps} />}
      {currentStep === 3 && (
        <StepContactDetails
          {...stepProps}
          onSuccess={() => setSubmitted(true)}
        />
      )}
    </div>
  );
}
