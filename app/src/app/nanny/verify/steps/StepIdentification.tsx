"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/supabase/storage";
import { submitIdentityStep } from "@/lib/actions/verification";
import type { StepProps } from "../IDVerificationFunnel";

// Australia first, then alphabetical country names
const PASSPORT_COUNTRIES = [
  "Australia",
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

function FileUploadZone({
  label,
  fieldName,
  currentFile,
  accept,
  onFileChange,
}: {
  label: string;
  fieldName: string;
  currentFile: string | null;
  accept: string;
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
              <span className="text-sm font-medium">{currentFile}</span>
            </div>
            <span className="text-xs text-slate-500">Click to replace</span>
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

export function StepIdentification({ data, updateData, updateFile, getFile, goNext, goBack }: StepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  const canContinue =
    !!data.surname?.trim() &&
    !!data.given_names?.trim() &&
    !!data.date_of_birth &&
    !!data.passport_country &&
    !!data.passport_file &&
    !!data.identification_photo &&
    data.passport_confirmed === true;

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

      // Upload passport + selfie
      const passportFile = getFile?.('passport_file');
      const photoFile = getFile?.('identification_photo');
      if (!passportFile || !photoFile) {
        setError("Please select both passport and identification photo files.");
        setIsSubmitting(false);
        return;
      }

      const [passportResult, photoResult] = await Promise.all([
        uploadFile('verification-documents', user.id, passportFile),
        uploadFile('verification-documents', user.id, photoFile),
      ]);

      if (passportResult.error || !passportResult.url) {
        setError(`Failed to upload passport: ${passportResult.error}`);
        setIsSubmitting(false);
        return;
      }
      if (photoResult.error || !photoResult.url) {
        setError(`Failed to upload identification photo: ${photoResult.error}`);
        setIsSubmitting(false);
        return;
      }

      // Create DB record (status 10)
      const result = await submitIdentityStep({
        surname: data.surname ?? '',
        given_names: data.given_names ?? '',
        date_of_birth: data.date_of_birth ?? '',
        passport_country: data.passport_country ?? '',
        passport_upload_url: passportResult.url,
        identification_photo_url: photoResult.url,
      });

      if (!result.success) {
        setError(result.error ?? 'Failed to submit identity data');
        setIsSubmitting(false);
        return;
      }

      // Fire passport AI in background (keepalive so it survives navigation)
      fetch('/api/run-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId: result.verificationId, phase: 'identity' }),
        keepalive: true,
      }).catch(() => {});

      goNext();
    } catch (err) {
      console.error('[StepIdentification] Error:', err);
      setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-slate-800">
          Verify Your Identity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
        )}

        {/* Surname */}
        <div className="space-y-2">
          <Label htmlFor="surname" className="text-sm font-medium text-slate-700">
            Surname
          </Label>
          <Input
            id="surname"
            type="text"
            placeholder="As shown on passport"
            value={data.surname ?? ""}
            onChange={(e) => updateData({ surname: e.target.value || null })}
            disabled={isSubmitting}
          />
        </div>

        {/* Given Names */}
        <div className="space-y-2">
          <Label htmlFor="given_names" className="text-sm font-medium text-slate-700">
            Given Name(s)
          </Label>
          <Input
            id="given_names"
            type="text"
            placeholder="As shown on passport"
            value={data.given_names ?? ""}
            onChange={(e) => updateData({ given_names: e.target.value || null })}
            disabled={isSubmitting}
          />
        </div>

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label htmlFor="date_of_birth" className="text-sm font-medium text-slate-700">
            Date of Birth
          </Label>
          <Input
            id="date_of_birth"
            type="date"
            max={today}
            value={data.date_of_birth ?? ""}
            onChange={(e) => updateData({ date_of_birth: e.target.value || null })}
            disabled={isSubmitting}
          />
        </div>

        {/* Passport Country of Issue */}
        <div className="space-y-2">
          <Label htmlFor="passport_country" className="text-sm font-medium text-slate-700">
            Passport Country of Issue
          </Label>
          <select
            id="passport_country"
            value={data.passport_country ?? ""}
            onChange={(e) => updateData({ passport_country: e.target.value || null })}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
          >
            <option value="" disabled>Select country of issue</option>
            {PASSPORT_COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Upload Passport */}
        <FileUploadZone
          label="Upload Passport"
          fieldName="passport_file"
          currentFile={data.passport_file ?? null}
          accept="image/*,application/pdf,.pdf,.doc,.docx"
          onFileChange={(name, file) => {
            updateData({ passport_file: name });
            updateFile?.('passport_file', file);
          }}
        />

        {/* Upload Identification Photo */}
        <FileUploadZone
          label="Upload Identification Photo"
          fieldName="identification_photo"
          currentFile={data.identification_photo ?? null}
          accept="image/*,application/pdf,.pdf,.doc,.docx"
          onFileChange={(name, file) => {
            updateData({ identification_photo: name });
            updateFile?.('identification_photo', file);
          }}
        />

        {/* Confirmation checkbox */}
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <input
            id="passport_confirmed"
            type="checkbox"
            checked={data.passport_confirmed === true}
            onChange={(e) => updateData({ passport_confirmed: e.target.checked })}
            disabled={isSubmitting}
            className="mt-0.5 h-4 w-4 accent-violet-600 cursor-pointer flex-shrink-0"
          />
          <Label htmlFor="passport_confirmed" className="text-sm text-slate-700 cursor-pointer leading-relaxed">
            I confirm that the passport I have provided is genuine, valid, and issued to me.
          </Label>
        </div>

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
