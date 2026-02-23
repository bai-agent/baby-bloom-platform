"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/supabase/storage";
import { submitWWCCStep } from "@/lib/actions/verification";
import type { StepProps } from "../IDVerificationFunnel";

const WWCC_METHODS = [
  "WWCC Grant Email (Instant)",
  "Service NSW App Screenshot (Instant)",
  "Manual Entry (1-3 days)",
] as const;

// Map display labels to DB-compatible snake_case values
const METHOD_VALUE_MAP: Record<string, string> = {
  "WWCC Grant Email (Instant)": "grant_email",
  "Service NSW App Screenshot (Instant)": "service_nsw_app",
  "Manual Entry (1-3 days)": "manual_entry",
};

const VALUE_DISPLAY_MAP: Record<string, string> = {
  "grant_email": "WWCC Grant Email (Instant)",
  "service_nsw_app": "Service NSW App Screenshot (Instant)",
  "manual_entry": "Manual Entry (1-3 days)",
};

const WWCC_NUMBER_REGEX = /^WWC\d{7}[A-Z]$/;

function FileUploadZone({
  label,
  fieldName,
  currentFile,
  accept,
  note,
  confirmText,
  onFileChange,
}: {
  label: string;
  fieldName: string;
  currentFile: string | null;
  accept: string;
  note?: string;
  confirmText?: string;
  onFileChange: (name: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onFileChange(file.name, file);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileChange(file.name, file);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors"
      >
        {currentFile ? (
          <>
            <div className="flex items-center gap-2 text-violet-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">{confirmText ?? "WWCC uploaded!"}</span>
            </div>
            <span className="text-xs text-slate-500">{currentFile} — Click to replace</span>
          </>
        ) : (
          <>
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div>
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">Drag & drop or click to upload</p>
            </div>
          </>
        )}
      </div>
      {note && (
        <p className="text-xs text-slate-500 italic">{note}</p>
      )}
      <input
        ref={inputRef}
        id={fieldName}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

export function StepWWCC({ data, updateData, updateFile, getFile, goNext, goBack }: StepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wwccNumberError, setWwccNumberError] = useState<string | null>(null);

  const selectedDisplay = data.wwcc_method
    ? VALUE_DISPLAY_MAP[data.wwcc_method] ?? null
    : null;

  function handleMethodSelect(display: string) {
    const value = METHOD_VALUE_MAP[display];
    updateData({
      wwcc_method: value,
      // Clear other method's data when switching
      wwcc_grant_email_file: null,
      wwcc_service_nsw_file: null,
      wwcc_number: null,
    });
    setWwccNumberError(null);
  }

  function handleWwccNumberChange(val: string) {
    updateData({ wwcc_number: val || null });
    if (val && !WWCC_NUMBER_REGEX.test(val)) {
      setWwccNumberError(
        'Invalid format. Must be WWC followed by 7 digits and 1 capital letter (e.g. WWC1234567A)'
      );
    } else {
      setWwccNumberError(null);
    }
  }

  const method = data.wwcc_method;
  const isManual = method === "manual_entry";

  const wwccNumberValid = !!data.wwcc_number && WWCC_NUMBER_REGEX.test(data.wwcc_number);

  const methodFieldComplete = (() => {
    if (!method) return false;
    if (method === "grant_email") return !!data.wwcc_grant_email_file;
    if (method === "service_nsw_app") return !!data.wwcc_service_nsw_file;
    if (method === "manual_entry") return wwccNumberValid && !!data.wwcc_expiry_date;
    return false;
  })();

  const canContinue = methodFieldComplete && data.wwcc_confirmed === true;

  async function handleNext() {
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated. Please log in again.");
        setIsSubmitting(false);
        return;
      }

      // Upload WWCC file if applicable
      let wwccGrantEmailUrl: string | null = null;
      let wwccServiceNswUrl: string | null = null;

      if (method === 'grant_email') {
        const file = getFile?.('wwcc_grant_email_file');
        if (!file) {
          setError("Please select the WWCC grant email PDF.");
          setIsSubmitting(false);
          return;
        }
        const result = await uploadFile('verification-documents', user.id, file);
        if (result.error || !result.url) {
          setError(`Failed to upload WWCC document: ${result.error}`);
          setIsSubmitting(false);
          return;
        }
        wwccGrantEmailUrl = result.url;
      }

      if (method === 'service_nsw_app') {
        const file = getFile?.('wwcc_service_nsw_file');
        if (!file) {
          setError("Please select the Service NSW screenshot.");
          setIsSubmitting(false);
          return;
        }
        const result = await uploadFile('verification-documents', user.id, file);
        if (result.error || !result.url) {
          setError(`Failed to upload screenshot: ${result.error}`);
          setIsSubmitting(false);
          return;
        }
        wwccServiceNswUrl = result.url;
      }

      // Update DB with WWCC fields
      const result = await submitWWCCStep({
        wwcc_verification_method: method ?? '',
        wwcc_number: data.wwcc_number ?? undefined,
        wwcc_expiry_date: data.wwcc_expiry_date ?? null,
        wwcc_grant_email_url: wwccGrantEmailUrl,
        wwcc_service_nsw_screenshot_url: wwccServiceNswUrl,
      });

      if (!result.success) {
        setError(result.error ?? 'Failed to submit WWCC data');
        setIsSubmitting(false);
        return;
      }

      // Fire WWCC AI in background (waits for passport if needed)
      fetch('/api/run-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId: result.verificationId, phase: 'wwcc' }),
        keepalive: true,
      }).catch(() => {});

      goNext();
    } catch (err) {
      console.error('[StepWWCC] Error:', err);
      setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-slate-800">
          Verify your WWCC
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
        )}

        {/* Method selection */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">
            How would you like to verify your WWCC?
          </p>
          <div className="flex flex-wrap gap-2">
            {WWCC_METHODS.map((display) => (
              <button
                key={display}
                type="button"
                onClick={() => handleMethodSelect(display)}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-full border text-sm font-medium cursor-pointer transition-colors ${
                  selectedDisplay === display
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-slate-700 border-slate-300 hover:border-violet-400"
                }`}
              >
                {display}
              </button>
            ))}
          </div>
        </div>

        {/* Conditional fields */}
        {method === "grant_email" && (
          <FileUploadZone
            label="Upload WWCC Grant Email PDF"
            fieldName="wwcc_grant_email_file"
            currentFile={data.wwcc_grant_email_file ?? null}
            accept="application/pdf,.pdf"
            note="This must be the full unedited PDF of your email notification."
            confirmText="WWCC uploaded!"
            onFileChange={(name, file) => {
              updateData({ wwcc_grant_email_file: name });
              updateFile?.('wwcc_grant_email_file', file);
            }}
          />
        )}

        {method === "service_nsw_app" && (
          <FileUploadZone
            label="Upload WWCC Service NSW Screenshot"
            fieldName="wwcc_service_nsw_file"
            currentFile={data.wwcc_service_nsw_file ?? null}
            accept="image/*"
            note="This must be the full unedited screenshot from within your Service NSW wallet."
            confirmText="WWCC uploaded"
            onFileChange={(name, file) => {
              updateData({ wwcc_service_nsw_file: name });
              updateFile?.('wwcc_service_nsw_file', file);
            }}
          />
        )}

        {/* Manual entry fields: WWCC number + expiry date */}
        {isManual && (
          <>
            <div className="space-y-2">
              <Label htmlFor="wwcc_number" className="text-sm font-medium text-slate-700">
                WWCC Number
              </Label>
              <Input
                id="wwcc_number"
                type="text"
                placeholder="eg: WWC1234567A"
                value={data.wwcc_number ?? ""}
                onChange={(e) => handleWwccNumberChange(e.target.value)}
                disabled={isSubmitting}
                className={wwccNumberError ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""}
              />
              {wwccNumberError && (
                <p className="text-xs text-red-500">{wwccNumberError}</p>
              )}
              {data.wwcc_number && !wwccNumberError && (
                <p className="text-xs text-green-600 font-medium">Valid WWCC number format</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wwcc_expiry_date" className="text-sm font-medium text-slate-700">
                WWCC Expiry Date
              </Label>
              <Input
                id="wwcc_expiry_date"
                type="date"
                value={data.wwcc_expiry_date ?? ""}
                onChange={(e) => updateData({ wwcc_expiry_date: e.target.value || null })}
                disabled={isSubmitting}
              />
              <p className="text-xs text-slate-500">
                Found on your WWCC grant email or Service NSW app
              </p>
            </div>
          </>
        )}

        {/* Confirmation checkbox — only shown after method is selected */}
        {method && (
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <input
              id="wwcc_confirmed"
              type="checkbox"
              checked={data.wwcc_confirmed === true}
              onChange={(e) => updateData({ wwcc_confirmed: e.target.checked })}
              disabled={isSubmitting}
              className="mt-0.5 h-4 w-4 accent-violet-600 cursor-pointer flex-shrink-0"
            />
            <Label htmlFor="wwcc_confirmed" className="text-sm text-slate-700 cursor-pointer leading-relaxed">
              I confirm that the WWCC I have provided is genuine valid, and issued to me.
            </Label>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={goBack} disabled={isSubmitting} className="flex-1">
            Back
          </Button>
          {canContinue && (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Next"
              )}
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
