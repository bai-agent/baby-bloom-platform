"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitContactStep } from "@/lib/actions/verification";
import type { StepProps } from "../IDVerificationFunnel";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

interface ContactDetailsProps extends StepProps {
  onSuccess: () => void;
}

export function StepContactDetails({
  data,
  updateData,
  goBack,
  onSuccess,
}: ContactDetailsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !!data.phone_number?.trim() &&
    !!data.address_line?.trim() &&
    !!data.city?.trim() &&
    !!data.postcode?.trim();

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitContactStep({
        phone_number: data.phone_number ?? '',
        address_line: data.address_line ?? '',
        city: data.city ?? '',
        state: data.state ?? null,
        postcode: data.postcode ?? '',
        country: data.country ?? 'Australia',
      });

      if (!result.success) {
        setError(result.error ?? 'Failed to save contact details');
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch (err) {
      console.error('[StepContactDetails] Error:', err);
      setError(`Failed to submit: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-slate-800">
          Contact Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
        )}

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone_number" className="text-sm font-medium text-slate-700">
            Phone Number
          </Label>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 flex-shrink-0">
              <span>🇦🇺</span>
              <span className="font-medium">+61</span>
            </div>
            <Input
              id="phone_number"
              type="tel"
              placeholder="04XX XXX XXX"
              value={data.phone_number ?? ""}
              onChange={(e) => updateData({ phone_number: e.target.value || null })}
              disabled={isSubmitting}
              className="flex-1"
            />
          </div>
        </div>

        {/* Address section */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-700">Address</p>

          {/* Address line */}
          <div className="space-y-2">
            <Label htmlFor="address_line" className="text-sm font-medium text-slate-600">
              Street Address
            </Label>
            <Input
              id="address_line"
              type="text"
              placeholder="eg: 42 Bondi Road"
              value={data.address_line ?? ""}
              onChange={(e) => updateData({ address_line: e.target.value || null })}
              disabled={isSubmitting}
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city" className="text-sm font-medium text-slate-600">
              City / Suburb
            </Label>
            <Input
              id="city"
              type="text"
              placeholder="eg: Bondi"
              value={data.city ?? ""}
              onChange={(e) => updateData({ city: e.target.value || null })}
              disabled={isSubmitting}
            />
          </div>

          {/* State + Postcode side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="state" className="text-sm font-medium text-slate-600">
                State
              </Label>
              <select
                id="state"
                value={data.state ?? ""}
                onChange={(e) => updateData({ state: e.target.value || null })}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
              >
                <option value="" disabled>Select state</option>
                {AU_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postcode" className="text-sm font-medium text-slate-600">
                Postcode
              </Label>
              <Input
                id="postcode"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="eg: 2026"
                value={data.postcode ?? ""}
                onChange={(e) => updateData({ postcode: e.target.value || null })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Country — pre-filled, readonly */}
          <div className="space-y-2">
            <Label htmlFor="country" className="text-sm font-medium text-slate-600">
              Country
            </Label>
            <Input
              id="country"
              type="text"
              value="Australia"
              readOnly
              disabled
              className="bg-slate-100 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={isSubmitting}
            className="flex-1"
          >
            Back
          </Button>
          {canSubmit && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
