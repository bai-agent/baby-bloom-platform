"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitContactSection } from "@/lib/actions/verification";
import type { VerificationData } from "@/lib/actions/verification";

// Strip all non-digit characters for validation
function normalisePhone(val: string): string {
  return val.replace(/\s+/g, "");
}

// Australian mobile: 04XX XXX XXX (10 digits starting with 04)
const AU_MOBILE_REGEX = /^04\d{8}$/;

interface SuburbEntry {
  suburb: string;
  postcode: string;
}

interface ContactSectionProps {
  verification: VerificationData | null;
  locked: boolean;
  onSaved: () => void;
}

export function ContactSection({ verification, locked, onSaved }: ContactSectionProps) {
  const status = verification?.contact_status ?? "not_started";
  const isCompleted = status === "saved";

  const [editing, setEditing] = useState(status === "not_started");
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState(verification?.phone_number ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [address, setAddress] = useState(verification?.address_line ?? "");

  // Suburb/postcode autocomplete
  const [suburbQuery, setSuburbQuery] = useState(
    verification?.city && verification?.postcode
      ? `${verification.city}, ${verification.postcode}`
      : ""
  );
  const [selectedSuburb, setSelectedSuburb] = useState<SuburbEntry | null>(
    verification?.city && verification?.postcode
      ? { suburb: verification.city, postcode: verification.postcode }
      : null
  );
  const [suburbs, setSuburbs] = useState<SuburbEntry[]>([]);
  const [filteredSuburbs, setFilteredSuburbs] = useState<SuburbEntry[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suburbs on mount
  useEffect(() => {
    fetch("/api/sydney-postcodes")
      .then((res) => res.json())
      .then((data: SuburbEntry[]) => setSuburbs(data))
      .catch(() => {});
  }, []);

  // Filter suburbs as user types
  const handleSuburbChange = useCallback((val: string) => {
    setSuburbQuery(val);
    setSelectedSuburb(null);

    if (val.trim().length < 2) {
      setFilteredSuburbs([]);
      setShowDropdown(false);
      return;
    }

    const query = val.toLowerCase().trim();
    const matches = suburbs.filter(
      (s) =>
        s.suburb.toLowerCase().includes(query) ||
        s.postcode.includes(query)
    ).slice(0, 10);

    setFilteredSuburbs(matches);
    setShowDropdown(matches.length > 0);
  }, [suburbs]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSuburbSelect(entry: SuburbEntry) {
    setSelectedSuburb(entry);
    setSuburbQuery(`${entry.suburb}, ${entry.postcode}`);
    setShowDropdown(false);
  }

  function handlePhoneChange(val: string) {
    setPhone(val);
    const normalised = normalisePhone(val);
    if (normalised && !AU_MOBILE_REGEX.test(normalised)) {
      setPhoneError("Must be an Australian mobile number (04XX XXX XXX)");
    } else {
      setPhoneError(null);
    }
  }

  if (locked) {
    return (
      <div className="text-sm text-slate-500 py-4">
        Complete the WWCC section first to unlock Contact Information.
      </div>
    );
  }

  const phoneValid = AU_MOBILE_REGEX.test(normalisePhone(phone));
  const canSave = phoneValid && address.trim() && selectedSuburb;

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    try {
      const result = await Promise.race([
        submitContactSection({
          phone_number: normalisePhone(phone),
          address_line: address.trim(),
          city: selectedSuburb!.suburb,
          state: "NSW",
          postcode: selectedSuburb!.postcode,
          country: "Australia",
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Save timed out — please try again")), 15000)),
      ]);

      if (!result.success) {
        setError(result.error ?? "Failed to save");
        setIsSaving(false);
        return;
      }

      // Brief "verifying" spinner for UX
      setIsSaving(false);
      setIsVerifying(true);
      await new Promise(resolve => setTimeout(resolve, 1200));
      setIsVerifying(false);
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      setIsSaving(false);
    }
  }

  const displaySuburb = selectedSuburb?.suburb ?? verification?.city;
  const displayPostcode = selectedSuburb?.postcode ?? verification?.postcode;

  if (!editing && isCompleted) {
    return (
      <div className="space-y-4">
        <div className="space-y-1 text-sm text-green-700">
          {phone && <p>{phone}</p>}
          {address && <p>{address}</p>}
          {displaySuburb && <p>{displaySuburb}, NSW {displayPostcode}</p>}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setEditing(true)}
          size="sm"
        >
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="phone_number" className="text-sm font-medium text-slate-700">Phone Number</Label>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 flex-shrink-0">
            <span>+61</span>
          </div>
          <div className="flex-1 space-y-1">
            <Input
              id="phone_number"
              type="tel"
              placeholder="04XX XXX XXX"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              disabled={isSaving}
              className={phoneError ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""}
            />
            {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address_line" className="text-sm font-medium text-slate-700">Street Address</Label>
          <Input
            id="address_line"
            placeholder="eg: 42 Bondi Road"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="space-y-2 relative" ref={dropdownRef}>
          <Label htmlFor="suburb_postcode" className="text-sm font-medium text-slate-700">Suburb & Postcode</Label>
          <Input
            ref={inputRef}
            id="suburb_postcode"
            placeholder="Start typing suburb or postcode..."
            value={suburbQuery}
            onChange={(e) => handleSuburbChange(e.target.value)}
            onFocus={() => {
              if (filteredSuburbs.length > 0) setShowDropdown(true);
            }}
            disabled={isSaving}
            autoComplete="off"
          />
          {showDropdown && (
            <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {filteredSuburbs.map((s) => (
                <button
                  key={`${s.suburb}-${s.postcode}`}
                  type="button"
                  onClick={() => handleSuburbSelect(s)}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 cursor-pointer"
                >
                  {s.suburb}, {s.postcode}
                </button>
              ))}
            </div>
          )}
          {selectedSuburb && (
            <p className="text-xs text-green-600 font-medium">{selectedSuburb.suburb}, NSW {selectedSuburb.postcode}</p>
          )}
        </div>

      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={!canSave || isSaving || isVerifying}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white"
      >
        {isSaving || isVerifying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify"
        )}
      </Button>
    </div>
  );
}
