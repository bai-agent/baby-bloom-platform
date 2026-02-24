"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { IdentitySection } from "./sections/IdentitySection";
import { WWCCSection } from "./sections/WWCCSection";
import { ContactSection } from "./sections/ContactSection";
import { SectionStatusBadge } from "./sections/SectionStatusBadge";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { VerificationData } from "@/lib/actions/verification";
import type { UserGuidance } from "@/lib/verification";

interface VerificationPageClientProps {
  initialData: VerificationData | null;
}

type PollResponse = {
  identity_status: string;
  identity_verified: boolean;
  identity_rejection_reason: string | null;
  identity_user_guidance: UserGuidance | null;
  surname: string | null;
  given_names: string | null;
  date_of_birth: string | null;
  extracted_passport_number: string | null;
  extracted_nationality: string | null;
  wwcc_status: string;
  wwcc_number: string | null;
  wwcc_expiry_date: string | null;
  wwcc_doc_verified: boolean;
  wwcc_verified: boolean;
  wwcc_rejection_reason: string | null;
  wwcc_user_guidance: UserGuidance | null;
  contact_status: string;
  cross_check_status: string;
  cross_check_reasoning: string | null;
  status: number;
};

export function VerificationPageClient({ initialData }: VerificationPageClientProps) {
  const [verification, setVerification] = useState<VerificationData | null>(initialData);

  // Determine which sections are unlocked
  const identityStatus = verification?.identity_status ?? "not_started";
  const wwccStatus = verification?.wwcc_status ?? "not_started";
  const contactStatus = verification?.contact_status ?? "not_started";
  const crossCheckStatus = verification?.cross_check_status ?? "not_started";

  const identityInReview = identityStatus === "review";
  const wwccLocked = identityStatus === "not_started" || identityInReview;
  const contactLocked = wwccStatus === "not_started";

  // Determine which sections to open by default
  const getDefaultOpen = useCallback((): string[] => {
    if (identityStatus === "not_started") return ["identity"];
    if (identityInReview) return ["identity"];
    if (wwccStatus === "not_started" && !wwccLocked) return ["wwcc"];
    if (contactStatus === "not_started" && !contactLocked) return ["contact"];
    if (identityStatus === "processing") return ["wwcc"];
    if (["failed", "rejected"].includes(identityStatus)) return ["identity"];
    if (["failed", "review", "rejected", "ocg_not_found", "closed", "application_pending", "barred", "expired"].includes(wwccStatus)) return ["wwcc"];
    return ["identity"];
  }, [identityStatus, wwccStatus, contactStatus, wwccLocked, contactLocked, identityInReview]);

  const [openSections, setOpenSections] = useState<string[]>(getDefaultOpen());

  // Poll for status updates when sections are processing or pending
  const isProcessing =
    identityStatus === "processing" || identityStatus === "pending" ||
    wwccStatus === "processing" || wwccStatus === "pending";

  useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/verification-status");
        if (!res.ok) return;
        const data: PollResponse = await res.json();

        setVerification((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            identity_status: data.identity_status,
            identity_verified: data.identity_verified,
            identity_rejection_reason: data.identity_rejection_reason,
            identity_user_guidance: data.identity_user_guidance,
            surname: data.surname ?? prev.surname,
            given_names: data.given_names ?? prev.given_names,
            date_of_birth: data.date_of_birth ?? prev.date_of_birth,
            extracted_passport_number: data.extracted_passport_number ?? prev.extracted_passport_number,
            extracted_nationality: data.extracted_nationality ?? prev.extracted_nationality,
            wwcc_status: data.wwcc_status,
            wwcc_number: data.wwcc_number ?? prev.wwcc_number,
            wwcc_expiry_date: data.wwcc_expiry_date ?? prev.wwcc_expiry_date,
            wwcc_doc_verified: data.wwcc_doc_verified,
            wwcc_verified: data.wwcc_verified,
            wwcc_rejection_reason: data.wwcc_rejection_reason,
            wwcc_user_guidance: data.wwcc_user_guidance,
            contact_status: data.contact_status,
            cross_check_status: data.cross_check_status,
            cross_check_reasoning: data.cross_check_reasoning,
            verification_status: data.status ?? prev.verification_status,
          };
        });
      } catch {
        // Ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleIdentitySaved = (verificationId: string, data: { surname: string; givenNames: string; dob: string }) => {
    setVerification((prev) => {
      if (prev) {
        return { ...prev, identity_status: "processing", identity_user_guidance: null, surname: data.surname, given_names: data.givenNames, date_of_birth: data.dob };
      }
      // First save — create minimal verification data
      return {
        id: verificationId,
        identity_status: "processing",
        wwcc_status: "not_started",
        contact_status: "not_started",
        cross_check_status: "not_started",
        verification_status: 10,
        identity_verified: false,
        identity_rejection_reason: null,
        identity_user_guidance: null,
        extracted_passport_number: null,
        extracted_nationality: null,
        wwcc_verification_method: null,
        wwcc_number: null,
        wwcc_expiry_date: null,
        wwcc_grant_email_url: null,
        wwcc_service_nsw_screenshot_url: null,
        wwcc_doc_verified: false,
        wwcc_verified: false,
        wwcc_rejection_reason: null,
        wwcc_user_guidance: null,
        phone_number: null,
        address_line: null,
        city: null,
        state: null,
        postcode: null,
        country: null,
        cross_check_reasoning: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        surname: data.surname,
        given_names: data.givenNames,
        date_of_birth: data.dob,
        passport_country: null,
        passport_upload_url: null,
        identification_photo_url: null,
      } as VerificationData;
    });
    setOpenSections(["wwcc"]);
  };

  const handleManualReview = () => {
    setVerification((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        identity_status: "review",
        identity_user_guidance: null,
        // Wipe WWCC data client-side to match server
        wwcc_status: "not_started",
        wwcc_verification_method: null,
        wwcc_number: null,
        wwcc_expiry_date: null,
        wwcc_grant_email_url: null,
        wwcc_service_nsw_screenshot_url: null,
        wwcc_doc_verified: false,
        wwcc_verified: false,
        wwcc_rejection_reason: null,
        wwcc_user_guidance: null,
        cross_check_status: "not_started",
        cross_check_reasoning: null,
      };
    });
    setOpenSections(["identity"]);
  };

  const handleWWCCSaved = () => {
    setVerification((prev) => {
      if (!prev) return prev;
      return { ...prev, wwcc_status: "pending", wwcc_user_guidance: null };
    });
    setOpenSections(["contact"]);
  };

  const handleContactSaved = () => {
    setVerification((prev) => {
      if (!prev) return prev;
      return { ...prev, contact_status: "saved" };
    });
    setOpenSections([]);
  };

  const getBadgeStatus = (sectionStatus: string) => {
    switch (sectionStatus) {
      case "not_started": return null;
      case "pending": return "processing" as const;
      case "processing": return "processing" as const;
      case "verified": case "doc_verified": case "passed": return "verified" as const;
      case "saved": return "verified" as const;
      case "review": case "application_pending": return "review" as const;
      case "rejected": case "barred": return "rejected" as const;
      case "failed": case "ocg_not_found": case "closed": return "failed" as const;
      case "expired": return "expired" as const;
      default: return null;
    }
  };

  const allVerified =
    crossCheckStatus === "passed" &&
    contactStatus === "saved" &&
    identityStatus === "verified" &&
    (wwccStatus === "doc_verified" || wwccStatus === "verified");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {allVerified ? (
        <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-6 w-6 text-green-600" />
            <h2 className="text-lg font-bold text-green-800">Your account is fully verified!</h2>
          </div>
          <p className="text-sm text-green-700">
            You can now start being paired with families and accepting babysitting jobs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild className="bg-violet-600 hover:bg-violet-700 text-white">
              <Link href="/nanny/dashboard">Pair with families</Link>
            </Button>
            <Button asChild variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50">
              <Link href="/nanny/dashboard">Get babysitting jobs</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Verification</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete each section below to verify your account and start being paired with families.
          </p>
        </div>
      )}

      <Accordion type="multiple" value={openSections} onValueChange={setOpenSections}>
        {/* ID Section */}
        <AccordionItem value="identity" className="border rounded-lg px-4 mb-3">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold text-slate-800">ID</span>
              {getBadgeStatus(identityStatus) && (
                <SectionStatusBadge
                  status={getBadgeStatus(identityStatus)!}
                  customLabel={identityInReview ? "Pending review" : undefined}
                />
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent forceMount>
            <IdentitySection
              verification={verification}
              onSaved={handleIdentitySaved}
              onManualReview={handleManualReview}
            />
          </AccordionContent>
        </AccordionItem>

        {/* WWCC Section */}
        <AccordionItem value="wwcc" className="border rounded-lg px-4 mb-3" disabled={wwccLocked}>
          <AccordionTrigger className="hover:no-underline" disabled={wwccLocked}>
            <div className="flex items-center gap-3">
              <span className={`text-base font-semibold ${wwccLocked ? "text-slate-400" : "text-slate-800"}`}>
                WWCC
              </span>
              {wwccLocked && !identityInReview && <span className="text-xs text-slate-400">Locked</span>}
              {identityInReview && <span className="text-xs text-amber-600">Waiting for ID review</span>}
              {!wwccLocked && getBadgeStatus(wwccStatus) && (
                <SectionStatusBadge status={getBadgeStatus(wwccStatus)!} />
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent forceMount>
            <WWCCSection
              verification={verification}
              locked={wwccLocked}
              identityInReview={identityInReview}
              onSaved={handleWWCCSaved}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Contact Section */}
        <AccordionItem value="contact" className="border rounded-lg px-4 mb-3" disabled={contactLocked}>
          <AccordionTrigger className="hover:no-underline" disabled={contactLocked}>
            <div className="flex items-center gap-3">
              <span className={`text-base font-semibold ${contactLocked ? "text-slate-400" : "text-slate-800"}`}>
                Contact Information
              </span>
              {contactLocked && <span className="text-xs text-slate-400">Locked</span>}
              {!contactLocked && getBadgeStatus(contactStatus) && (
                <SectionStatusBadge status={getBadgeStatus(contactStatus)!} />
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent forceMount>
            <ContactSection
              verification={verification}
              locked={contactLocked}
              onSaved={handleContactSaved}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Cross-check review */}
      {crossCheckStatus === "review" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-medium">Cross-check under review</p>
          <p className="mt-1">
            {verification?.cross_check_reasoning ?? "Our team is reviewing a discrepancy between your passport and WWCC details."}
          </p>
        </div>
      )}
    </div>
  );
}
