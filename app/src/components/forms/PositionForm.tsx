"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatePositionData, PositionWithChildren, createPosition, updatePosition } from "@/lib/actions/parent";
import { Loader2, Check, Plus, Trash2 } from "lucide-react";

interface PositionFormProps {
  initialData?: PositionWithChildren | null;
  onSuccess?: () => void;
}

const DAYS_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const REASON_OPTIONS = [
  "Both parents work",
  "Single parent",
  "Extra support needed",
  "Occasional help",
  "School pickup/dropoff",
  "Date nights",
  "Travel",
];

const SUPPORT_OPTIONS = [
  "Sole charge",
  "Parent present",
  "Household help",
  "Light housekeeping",
  "Cooking",
  "Errands",
];

const PAY_FREQUENCY_OPTIONS = ["Weekly", "Fortnightly", "Monthly"];

const CERTIFICATE_OPTIONS = [
  "First Aid",
  "CPR",
  "Child Protection",
  "Anaphylaxis and Asthma Management",
];

interface ChildData {
  age_months: number;
  gender?: string;
}

export function PositionForm({ initialData, onSuccess }: PositionFormProps) {
  const [formData, setFormData] = useState<CreatePositionData>({
    urgency: initialData?.urgency || undefined,
    start_date: initialData?.start_date || undefined,
    placement_length: initialData?.placement_length || undefined,
    end_date: initialData?.end_date || undefined,
    schedule_type: initialData?.schedule_type || undefined,
    hours_per_week: initialData?.hours_per_week || undefined,
    days_required: initialData?.days_required || [],
    schedule_details: initialData?.schedule_details || undefined,
    language_preference: initialData?.language_preference || undefined,
    language_preference_details: initialData?.language_preference_details || undefined,
    minimum_age_requirement: initialData?.minimum_age_requirement || undefined,
    years_of_experience: initialData?.years_of_experience || undefined,
    qualification_requirement: initialData?.qualification_requirement || undefined,
    certificate_requirements: initialData?.certificate_requirements || [],
    residency_status_requirement: initialData?.residency_status_requirement || undefined,
    vaccination_required: initialData?.vaccination_required || false,
    drivers_license_required: initialData?.drivers_license_required || false,
    car_required: initialData?.car_required || false,
    comfortable_with_pets_required: initialData?.comfortable_with_pets_required || false,
    non_smoker_required: initialData?.non_smoker_required || false,
    other_requirements_exist: initialData?.other_requirements_exist || false,
    other_requirements_details: initialData?.other_requirements_details || undefined,
    hourly_rate: initialData?.hourly_rate || undefined,
    pay_frequency: initialData?.pay_frequency || [],
    reason_for_nanny: initialData?.reason_for_nanny || [],
    level_of_support: initialData?.level_of_support || [],
  });

  const [children, setChildren] = useState<ChildData[]>(
    initialData?.children?.map((c) => ({ age_months: c.age_months, gender: c.gender || undefined })) || [{ age_months: 0 }]
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof CreatePositionData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleArrayToggle = (field: keyof CreatePositionData, value: string) => {
    const currentArray = (formData[field] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((v) => v !== value)
      : [...currentArray, value];
    handleChange(field, newArray);
  };

  const handleChildChange = (index: number, field: keyof ChildData, value: unknown) => {
    const newChildren = [...children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setChildren(newChildren);
    setSaved(false);
  };

  const addChild = () => {
    if (children.length < 3) {
      setChildren([...children, { age_months: 0 }]);
    }
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // DEV MODE: skip server action
    if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSuccess?.();
      return;
    }

    setSaving(true);
    setError(null);

    const dataToSave = { ...formData, children };

    let result;
    if (initialData) {
      result = await updatePosition(initialData.id, dataToSave);
    } else {
      result = await createPosition(dataToSave);
    }

    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSuccess?.();
    } else {
      setError(result.error || "Failed to save");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="children">Children</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="compensation">Pay</TabsTrigger>
          <TabsTrigger value="reason">Reason</TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>When do you need a nanny?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="urgency">How urgently do you need a nanny?</Label>
                <select
                  id="urgency"
                  value={formData.urgency || ""}
                  onChange={(e) => handleChange("urgency", e.target.value || undefined)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  <option value="Immediately">Immediately</option>
                  <option value="At a later date">At a later date</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date || ""}
                  onChange={(e) => handleChange("start_date", e.target.value || undefined)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="placement_length">How long do you need a nanny?</Label>
                <select
                  id="placement_length"
                  value={formData.placement_length || ""}
                  onChange={(e) => handleChange("placement_length", e.target.value || undefined)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Until a certain date">Until a certain date</option>
                </select>
              </div>

              {formData.placement_length === "Until a certain date" && (
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date || ""}
                    onChange={(e) => handleChange("end_date", e.target.value || undefined)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
              <CardDescription>What hours do you need?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schedule_type">Do you have a set schedule?</Label>
                <select
                  id="schedule_type"
                  value={formData.schedule_type || ""}
                  onChange={(e) => handleChange("schedule_type", e.target.value || undefined)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="I'm Flexible">I&apos;m Flexible</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours_per_week">Hours per week</Label>
                <Input
                  id="hours_per_week"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.hours_per_week ?? ""}
                  onChange={(e) => handleChange("hours_per_week", e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>

              <div className="space-y-2">
                <Label>Days Required</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OPTIONS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleArrayToggle("days_required", day)}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        (formData.days_required || []).includes(day)
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule_details">Schedule Details</Label>
                <textarea
                  id="schedule_details"
                  value={formData.schedule_details || ""}
                  onChange={(e) => handleChange("schedule_details", e.target.value)}
                  rows={3}
                  placeholder="e.g., Monday-Friday 8am-6pm, occasional weekends"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Children */}
        <TabsContent value="children">
          <Card>
            <CardHeader>
              <CardTitle>Children</CardTitle>
              <CardDescription>Tell us about your children (up to 3)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {children.map((child, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Child {index + 1}</h4>
                    {children.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChild(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Age (months)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="216"
                        value={child.age_months}
                        onChange={(e) => handleChildChange(index, "age_months", Number(e.target.value))}
                        placeholder="e.g., 24 for 2 years"
                      />
                      <p className="text-xs text-slate-500">
                        {child.age_months >= 12 ? `${Math.floor(child.age_months / 12)} year${Math.floor(child.age_months / 12) !== 1 ? "s" : ""} ${child.age_months % 12 > 0 ? `${child.age_months % 12} month${child.age_months % 12 !== 1 ? "s" : ""}` : ""}` : `${child.age_months} month${child.age_months !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <select
                        value={child.gender || ""}
                        onChange={(e) => handleChildChange(index, "gender", e.target.value || undefined)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select...</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Rather Not Say">Rather Not Say</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {children.length < 3 && (
                <Button type="button" variant="outline" onClick={addChild}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Child
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requirements */}
        <TabsContent value="requirements">
          <Card>
            <CardHeader>
              <CardTitle>Nanny Requirements</CardTitle>
              <CardDescription>What qualifications are you looking for?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="minimum_age_requirement">Minimum Age</Label>
                  <select
                    id="minimum_age_requirement"
                    value={formData.minimum_age_requirement ?? ""}
                    onChange={(e) => handleChange("minimum_age_requirement", e.target.value ? Number(e.target.value) : undefined)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No preference</option>
                    <option value="18">18+</option>
                    <option value="21">21+</option>
                    <option value="25">25+</option>
                    <option value="28">28+</option>
                    <option value="35">35+</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="years_of_experience">Years of Experience</Label>
                  <select
                    id="years_of_experience"
                    value={formData.years_of_experience ?? ""}
                    onChange={(e) => handleChange("years_of_experience", e.target.value ? Number(e.target.value) : undefined)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No preference</option>
                    <option value="1">1+ years</option>
                    <option value="2">2+ years</option>
                    <option value="3">3+ years</option>
                    <option value="5">5+ years</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language_preference">Language Preference</Label>
                <select
                  id="language_preference"
                  value={formData.language_preference || ""}
                  onChange={(e) => handleChange("language_preference", e.target.value || undefined)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No preference</option>
                  <option value="English">English</option>
                  <option value="Foreign language">Foreign language</option>
                  <option value="Multiple">Multiple languages</option>
                </select>
              </div>

              {formData.language_preference && formData.language_preference !== "English" && (
                <div className="space-y-2">
                  <Label htmlFor="language_preference_details">Language Details</Label>
                  <Input
                    id="language_preference_details"
                    value={formData.language_preference_details || ""}
                    onChange={(e) => handleChange("language_preference_details", e.target.value)}
                    placeholder="e.g., Mandarin, Spanish"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Certificate Requirements</Label>
                <div className="flex flex-wrap gap-2">
                  {CERTIFICATE_OPTIONS.map((cert) => (
                    <button
                      key={cert}
                      type="button"
                      onClick={() => handleArrayToggle("certificate_requirements", cert)}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        (formData.certificate_requirements || []).includes(cert)
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {cert}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="residency_status_requirement">Residency Status</Label>
                <select
                  id="residency_status_requirement"
                  value={formData.residency_status_requirement || ""}
                  onChange={(e) => handleChange("residency_status_requirement", e.target.value || undefined)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No preference</option>
                  <option value="Permanent Resident">Permanent Resident or Citizen</option>
                  <option value="Any Status">Any Status</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Other Preferences</CardTitle>
              <CardDescription>Additional requirements for your nanny</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="vaccination_required"
                    checked={formData.vaccination_required || false}
                    onChange={(e) => handleChange("vaccination_required", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="vaccination_required" className="font-normal">
                    Vaccination required
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="drivers_license_required"
                    checked={formData.drivers_license_required || false}
                    onChange={(e) => handleChange("drivers_license_required", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="drivers_license_required" className="font-normal">
                    Driver&apos;s license required
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="car_required"
                    checked={formData.car_required || false}
                    onChange={(e) => handleChange("car_required", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="car_required" className="font-normal">
                    Own car required
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="comfortable_with_pets_required"
                    checked={formData.comfortable_with_pets_required || false}
                    onChange={(e) => handleChange("comfortable_with_pets_required", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="comfortable_with_pets_required" className="font-normal">
                    Must be comfortable with pets
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="non_smoker_required"
                    checked={formData.non_smoker_required || false}
                    onChange={(e) => handleChange("non_smoker_required", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="non_smoker_required" className="font-normal">
                    Non-smoker required
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="other_requirements_exist"
                    checked={formData.other_requirements_exist || false}
                    onChange={(e) => handleChange("other_requirements_exist", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="other_requirements_exist" className="font-normal">
                    Other requirements
                  </Label>
                </div>

                {formData.other_requirements_exist && (
                  <textarea
                    value={formData.other_requirements_details || ""}
                    onChange={(e) => handleChange("other_requirements_details", e.target.value)}
                    rows={3}
                    placeholder="Describe any other requirements..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compensation */}
        <TabsContent value="compensation">
          <Card>
            <CardHeader>
              <CardTitle>Compensation</CardTitle>
              <CardDescription>What are you willing to pay?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  min="0"
                  step="0.50"
                  value={formData.hourly_rate ?? ""}
                  onChange={(e) => handleChange("hourly_rate", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 35.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Pay Frequency</Label>
                <div className="flex flex-wrap gap-2">
                  {PAY_FREQUENCY_OPTIONS.map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => handleArrayToggle("pay_frequency", freq)}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        (formData.pay_frequency || []).includes(freq)
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reason & Support */}
        <TabsContent value="reason">
          <Card>
            <CardHeader>
              <CardTitle>Reason & Support</CardTitle>
              <CardDescription>Why are you looking for a nanny?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Reason for Hiring</Label>
                <div className="flex flex-wrap gap-2">
                  {REASON_OPTIONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => handleArrayToggle("reason_for_nanny", reason)}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        (formData.reason_for_nanny || []).includes(reason)
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Level of Support Needed</Label>
                <div className="flex flex-wrap gap-2">
                  {SUPPORT_OPTIONS.map((support) => (
                    <button
                      key={support}
                      type="button"
                      onClick={() => handleArrayToggle("level_of_support", support)}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        (formData.level_of_support || []).includes(support)
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {support}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="sticky bottom-4 mt-6 flex justify-end">
        <div className="rounded-lg bg-white p-2 shadow-lg">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={saving} className="min-w-[120px]">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Saved
              </>
            ) : initialData ? (
              "Update Position"
            ) : (
              "Create Position"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
