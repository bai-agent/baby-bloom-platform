"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { updateNannyAccountSettings } from "@/lib/actions/nanny";
import { Save, Loader2, CheckCircle } from "lucide-react";

function BooleanToggle({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-1.5">
      {[true, false].map((opt) => (
        <button
          key={String(opt)}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt
              ? "bg-violet-600 text-white shadow-sm border-transparent"
              : "border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
        >
          {opt ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

export default function NannySettingsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    email: profile?.email || "",
    date_of_birth: "",
    mobile_number: "",
    gender: "",
    nationality: "",
    residency_status: "",
    right_to_work: null as boolean | null,
    sydney_resident: null as boolean | null,
    suburb: profile?.suburb || "",
    postcode: profile?.postcode || "",
  });

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
  };

  const handleSave = () => {
    setSaveStatus("saving");
    setError(null);
    startTransition(async () => {
      const result = await updateNannyAccountSettings({
        first_name: form.first_name,
        last_name: form.last_name,
        date_of_birth: form.date_of_birth || null,
        mobile_number: form.mobile_number || null,
        gender: form.gender || null,
        nationality: form.nationality || null,
        residency_status: form.residency_status || null,
        right_to_work: form.right_to_work,
        sydney_resident: form.sydney_resident,
        suburb: form.suburb,
        postcode: form.postcode,
      });

      if (result.success) {
        setSaveStatus("saved");
        router.refresh();
      } else {
        setSaveStatus("error");
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="mt-1 text-slate-500">
          Manage your personal information and account preferences
        </p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your private details — not shown on your public profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              disabled
              className="bg-slate-50"
            />
            <p className="text-xs text-slate-400">Contact support to update your email address.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => update("date_of_birth", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={form.gender}
                onChange={(e) => update("gender", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
              >
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              type="tel"
              value={form.mobile_number}
              onChange={(e) => update("mobile_number", e.target.value)}
              placeholder="04XX XXX XXX"
            />
          </div>
        </CardContent>
      </Card>

      {/* Residency & Location */}
      <Card>
        <CardHeader>
          <CardTitle>Residency & Location</CardTitle>
          <CardDescription>Your residency status and location details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={form.nationality}
                onChange={(e) => update("nationality", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="residencyStatus">Residency Status</Label>
              <Input
                id="residencyStatus"
                value={form.residency_status}
                onChange={(e) => update("residency_status", e.target.value)}
                placeholder="e.g. Citizen, PR, Visa holder"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Right to Work in Australia</Label>
              <BooleanToggle value={form.right_to_work} onChange={(v) => update("right_to_work", v)} />
            </div>
            <div className="space-y-2">
              <Label>Sydney Resident</Label>
              <BooleanToggle value={form.sydney_resident} onChange={(v) => update("sydney_resident", v)} />
            </div>
          </div>
          {form.sydney_resident && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb</Label>
                <Input
                  id="suburb"
                  value={form.suburb}
                  onChange={(e) => update("suburb", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  value={form.postcode}
                  onChange={(e) => update("postcode", e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-slate-500">Notification settings coming soon</p>
            <p className="mt-1 text-xs text-slate-400">
              You&apos;ll be able to customize email and push notifications here
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {saveStatus === "saved" && (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-600">Settings saved</span>
              </>
            )}
            {saveStatus === "error" && <span className="text-red-500">{error}</span>}
          </div>
          <Button
            onClick={handleSave}
            disabled={isPending || saveStatus === "saving"}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {saveStatus === "saving" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Save Settings</>
            )}
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
            <div>
              <p className="font-medium text-red-900">Deactivate Account</p>
              <p className="text-sm text-red-700">This will hide your profile from families</p>
            </div>
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-100" disabled>
              Deactivate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
