"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/supabase/storage";
import {
  NannyProfile,
  updateNannyProfile,
  updateNannyAIContent,
  regenerateNannyAIContent,
} from "@/lib/actions/nanny";
import {
  User,
  FileText,
  CheckSquare,
  CalendarDays,
  MapPin,
  ShieldCheck,
  BadgeCheck,
  Pencil,
  X,
  Save,
  Loader2,
  CheckCircle,
  RefreshCw,
  Settings,
  Camera,
} from "lucide-react";

// ── Helpers ──

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age > 0 && age < 120 ? age : null;
}

function ageMonthsToLabel(months: number | null | undefined): string {
  if (months === null || months === undefined) return "Any";
  if (months === 0) return "Newborn";
  if (months < 12) return `${months} months`;
  const y = Math.floor(months / 12);
  return `${y} year${y > 1 ? "s" : ""}`;
}

function parseBioSummary(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ── Availability helpers ──

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const TIME_SLOTS = ["Morning (6am-10am)", "Midday (10am-2pm)", "Afternoon (2pm-6pm)", "Evening (6pm-10pm)"] as const;
const SLOT_LABELS = ["Morning", "Midday", "Afternoon", "Evening"];
const SLOT_RANGES = [
  { start: 6, end: 10 },
  { start: 10, end: 14 },
  { start: 14, end: 18 },
  { start: 18, end: 22 },
];

function normaliseDaySlots(raw: unknown): boolean[] {
  if (!raw) return [false, false, false, false];
  if (Array.isArray(raw)) {
    return TIME_SLOTS.map((slot) => raw.includes(slot));
  }
  if (typeof raw === "object" && raw !== null && "available" in raw) {
    const obj = raw as { available?: boolean; start?: string | null; end?: string | null };
    if (!obj.available || !obj.start || !obj.end) return [false, false, false, false];
    const startHour = parseInt(obj.start.split(":")[0]);
    const endHour = parseInt(obj.end.split(":")[0]);
    return SLOT_RANGES.map((range) => startHour <= range.start && endHour >= range.end);
  }
  return [false, false, false, false];
}

// ── Option constants (matching registration funnel) ──

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EXPERIENCE_OPTIONS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"];
const QUALIFICATION_OPTIONS = [
  "Certificate III in Early Childhood Education and Care",
  "Certificate IV in Education Support",
  "Diploma of Early Childhood Education and Care",
  "Bachelor of Early Childhood Education (Or Equivalent)",
  "No Qualifications",
];
const ASSURANCE_OPTIONS = ["National Police Check", "References"];
const CERTIFICATE_OPTIONS = ["CPR", "First Aid", "First Aid in Education & Care Setting", "Child Protection"];
const ROLE_TYPE_OPTIONS = ["Mothers Help", "Back-to-Work Support", "Pick Up & Drop Off", "Child Development", "Home Management"];
const LEVEL_OF_SUPPORT_OPTIONS = ["Supervision", "Engagement and Play", "Educational Support", "Developmental Assistance"];
const PAY_FREQUENCY_OPTIONS = ["Daily", "Weekly", "Fortnightly", "Monthly"];
const LANGUAGE_OPTIONS = ["English", "Foreign Language", "Multiple"];
const MIN_AGE_OPTIONS = [
  { label: "Newborn", months: 0 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "12 months", months: 12 },
  { label: "18 months", months: 18 },
  { label: "2 years", months: 24 },
  { label: "3 years", months: 36 },
  { label: "5 years", months: 60 },
  { label: "10 years", months: 120 },
];
const MAX_AGE_OPTIONS = [
  { label: "12 months", months: 12 },
  { label: "3 years", months: 36 },
  { label: "5 years", months: 60 },
  { label: "10 years", months: 120 },
  { label: "13 years", months: 156 },
  { label: "16 years", months: 192 },
];

// ── Shared sub-components ──

const TAG_ACTIVE = "bg-violet-600 text-white shadow-sm border-transparent";
const TAG_INACTIVE = "border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50";

function MultiSelectTags({ options, selected, onChange }: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            selected.includes(opt) ? TAG_ACTIVE : TAG_INACTIVE
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SingleSelectTags({ options, value, onChange }: {
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt ? TAG_ACTIVE : TAG_INACTIVE
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function BooleanTags({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-1.5">
      {[true, false].map((opt) => (
        <button
          key={String(opt)}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt ? TAG_ACTIVE : TAG_INACTIVE
          }`}
        >
          {opt ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

// ── View-mode sub-components ──

function VerificationBadge({ tier }: { tier: string }) {
  if (tier === "tier3") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <BadgeCheck className="h-3.5 w-3.5" /> Fully Verified
      </span>
    );
  }
  if (tier === "tier2") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
        <ShieldCheck className="h-3.5 w-3.5" /> ID Verified
      </span>
    );
  }
  return null;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}

// ── HTML ↔ plain text helpers ──

function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function plainTextToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// ── Editable AI section (local state, saves on global Save) ──

function EditableSection({
  html,
  editValue,
  onEdit,
}: {
  html: string;
  editValue: string | undefined;
  onEdit: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const handleOpen = () => {
    setDraft(htmlToPlainText(editValue ?? html));
    setEditing(true);
  };

  const handleDone = () => {
    onEdit(plainTextToHtml(draft));
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full rounded-lg border-2 border-violet-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
          rows={5}
        />
        <div className="flex gap-2">
          <button
            onClick={handleDone}
            className="rounded-full bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700"
          >
            Done
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const display = editValue ?? html;
  return (
    <div className="group relative">
      <div
        className="text-sm text-slate-700 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0"
        dangerouslySetInnerHTML={{ __html: display }}
      />
      <button
        onClick={handleOpen}
        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-white border border-slate-200 shadow-sm hover:border-violet-300"
        title="Edit this section"
      >
        <Pencil className="h-3 w-3 text-slate-400 hover:text-violet-500" />
      </button>
    </div>
  );
}

// ── View mode tabs ──

const VIEW_TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "about", label: "About", icon: FileText },
  { id: "checklist", label: "Checklist", icon: CheckSquare },
  { id: "availability", label: "Availability", icon: CalendarDays },
] as const;

// ── Edit mode tabs ──

const EDIT_TABS = [
  { id: "profile", label: "Profile" },
  { id: "about", label: "About" },
  { id: "details", label: "Details" },
] as const;

const DETAIL_SUB_TABS = [
  { id: "credentials", label: "Credentials" },
  { id: "preferences", label: "Preferences" },
  { id: "availability", label: "Availability" },
  { id: "info", label: "Info" },
  { id: "bio", label: "Bio" },
] as const;

// ── Main Component ──

export function NannyMyProfile({ profile }: { profile: NannyProfile }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Mode & navigation
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [activeSubTab, setActiveSubTab] = useState<string>("credentials");

  // Save state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // AI content edits (keyed by field path e.g. "headline", "bio_summary.about")
  const [aiEdits, setAiEdits] = useState<Record<string, string>>({});

  // Profile photo upload
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);

  // Profile data
  const nannyId = profile.nanny_id;
  const age = calculateAge(profile.date_of_birth);
  const aiContent = profile.ai_content as Record<string, unknown> | null;
  const tagline = aiContent?.headline ? String(aiContent.headline) : "";
  const bioContent = aiContent?.parent_pitch ? String(aiContent.parent_pitch) : "";
  const experienceContent = aiContent?.experience_summary ? String(aiContent.experience_summary) : "";
  const checklistContent = aiContent?.skills_highlight ? String(aiContent.skills_highlight) : "";
  const bioSummary = parseBioSummary(
    aiContent?.bio_summary ? (typeof aiContent.bio_summary === "string" ? aiContent.bio_summary : JSON.stringify(aiContent.bio_summary)) : undefined
  );

  // ── Form state (for Details tabs) ──

  const [form, setForm] = useState({
    // Credentials
    total_experience_years: profile.total_experience_years,
    nanny_experience_years: profile.nanny_experience_years,
    under_3_experience_years: profile.under_3_experience_years,
    newborn_experience_years: profile.newborn_experience_years,
    experience_details: profile.experience_details || "",
    highest_qualification: profile.highest_qualification || null,
    certificates: profile.certificates || [],
    assurances: profile.assurances || [],
    // Preferences + Salary
    role_types_preferred: profile.role_types_preferred || [],
    level_of_support_offered: profile.level_of_support_offered || [],
    max_children: profile.max_children,
    min_child_age_months: profile.min_child_age_months,
    max_child_age_months: profile.max_child_age_months,
    additional_needs_ok: profile.additional_needs_ok ?? false,
    hourly_rate_min: profile.hourly_rate_min,
    pay_frequency: profile.pay_frequency || [],
    // Availability
    available_days: profile.availability?.days_available || [],
    schedule: (profile.availability?.schedule || {}) as Record<string, string[]>,
    immediate_start_available: profile.immediate_start_available ?? false,
    placement_ongoing_preferred: profile.placement_ongoing_preferred ?? false,
    start_date_earliest: profile.start_date_earliest || "",
    end_date_latest: profile.end_date_latest || "",
    // Info
    languages: profile.languages || [],
    drivers_license: profile.drivers_license,
    has_car: profile.has_car,
    comfortable_with_pets: profile.comfortable_with_pets,
    vaccination_status: profile.vaccination_status,
    non_smoker: profile.non_smoker,
    // Bio
    hobbies_interests: profile.hobbies_interests || "",
    strengths_traits: profile.strengths_traits || "",
    skills_training: profile.skills_training || "",
  });

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
    setShowRegenerate(false);
  };

  const setAiEdit = (key: string, value: string) => {
    setAiEdits((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
    setShowRegenerate(false);
  };

  // ── Photo upload handler ──

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    setPhotoUploading(true);
    setError(null);

    try {
      // Get user ID from Supabase client (same pattern as registration step)
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setError("You must be logged in to upload a photo");
        setPhotoUploading(false);
        return;
      }

      const result = await uploadFile("profile-pictures", authUser.id, file);

      if (result.error || !result.url) {
        setError(result.error || "Upload failed");
        return;
      }

      setNewPhotoUrl(result.url);
      setSaveStatus("idle");
    } catch (err) {
      setError("Upload failed — please try again");
      console.error("Photo upload error:", err);
    } finally {
      setPhotoUploading(false);
      // Reset file input so the same file can be re-selected
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  // ── Save handler ──

  const handleSave = () => {
    setSaveStatus("saving");
    setError(null);
    startTransition(async () => {
      // 1. Save core profile data
      const result = await updateNannyProfile({
        ...(newPhotoUrl ? { profile_picture_url: newPhotoUrl } : {}),
        total_experience_years: form.total_experience_years,
        nanny_experience_years: form.nanny_experience_years,
        under_3_experience_years: form.under_3_experience_years,
        newborn_experience_years: form.newborn_experience_years,
        experience_details: form.experience_details || null,
        highest_qualification: form.highest_qualification,
        certificates: form.certificates,
        assurances: form.assurances,
        role_types_preferred: form.role_types_preferred,
        level_of_support_offered: form.level_of_support_offered,
        max_children: form.max_children,
        min_child_age_months: form.min_child_age_months,
        max_child_age_months: form.max_child_age_months,
        additional_needs_ok: form.additional_needs_ok,
        hourly_rate_min: form.hourly_rate_min,
        pay_frequency: form.pay_frequency,
        available_days: form.available_days,
        schedule: form.schedule,
        immediate_start_available: form.immediate_start_available,
        placement_ongoing_preferred: form.placement_ongoing_preferred,
        start_date_earliest: form.start_date_earliest || null,
        end_date_latest: form.end_date_latest || null,
        languages: form.languages,
        drivers_license: form.drivers_license,
        has_car: form.has_car,
        comfortable_with_pets: form.comfortable_with_pets,
        vaccination_status: form.vaccination_status,
        non_smoker: form.non_smoker,
        hobbies_interests: form.hobbies_interests || null,
        strengths_traits: form.strengths_traits || null,
        skills_training: form.skills_training || null,
      });

      if (!result.success) {
        setSaveStatus("error");
        setError(result.error);
        return;
      }

      // 2. Save AI content edits if any
      if (Object.keys(aiEdits).length > 0) {
        const aiUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(aiEdits)) {
          if (key.includes(".")) {
            const [parent, child] = key.split(".");
            aiUpdates[parent] = { ...(aiUpdates[parent] as Record<string, unknown> || {}), [child]: value };
          } else {
            aiUpdates[key] = value;
          }
        }
        const aiResult = await updateNannyAIContent(nannyId, aiUpdates);
        if (!aiResult.success) {
          setSaveStatus("error");
          setError(aiResult.error);
          return;
        }
      }

      setSaveStatus("saved");
      setShowRegenerate(true);
      router.refresh();
    });
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    const result = await regenerateNannyAIContent();
    setRegenerating(false);
    if (result.success) {
      setShowRegenerate(false);
      setAiEdits({});
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  const enterEditMode = () => {
    setEditMode(true);
    setActiveTab("profile");
    setSaveStatus("idle");
    setShowRegenerate(false);
    setAiEdits({});
    setNewPhotoUrl(null);
  };

  const exitEditMode = () => {
    setEditMode(false);
    setActiveTab("profile");
    setSaveStatus("idle");
    setShowRegenerate(false);
    setAiEdits({});
    setNewPhotoUrl(null);
    // Reset form to current profile data
    setForm({
      total_experience_years: profile.total_experience_years,
      nanny_experience_years: profile.nanny_experience_years,
      under_3_experience_years: profile.under_3_experience_years,
      newborn_experience_years: profile.newborn_experience_years,
      experience_details: profile.experience_details || "",
      highest_qualification: profile.highest_qualification || null,
      certificates: profile.certificates || [],
      assurances: profile.assurances || [],
      role_types_preferred: profile.role_types_preferred || [],
      level_of_support_offered: profile.level_of_support_offered || [],
      max_children: profile.max_children,
      min_child_age_months: profile.min_child_age_months,
      max_child_age_months: profile.max_child_age_months,
      additional_needs_ok: profile.additional_needs_ok ?? false,
      hourly_rate_min: profile.hourly_rate_min,
      pay_frequency: profile.pay_frequency || [],
      available_days: profile.availability?.days_available || [],
      schedule: (profile.availability?.schedule || {}) as Record<string, string[]>,
      immediate_start_available: profile.immediate_start_available ?? false,
      placement_ongoing_preferred: profile.placement_ongoing_preferred ?? false,
      start_date_earliest: profile.start_date_earliest || "",
      end_date_latest: profile.end_date_latest || "",
      languages: profile.languages || [],
      drivers_license: profile.drivers_license,
      has_car: profile.has_car,
      comfortable_with_pets: profile.comfortable_with_pets,
      vaccination_status: profile.vaccination_status,
      non_smoker: profile.non_smoker,
      hobbies_interests: profile.hobbies_interests || "",
      strengths_traits: profile.strengths_traits || "",
      skills_training: profile.skills_training || "",
    });
  };

  // ══════════════════════════════════════════════
  // ── Hero Section (shared between view & edit) ──
  // ══════════════════════════════════════════════

  const heroSection = (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex gap-5">
        <div className="flex-shrink-0">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-3 border-violet-200 bg-violet-50">
            {(newPhotoUrl || profile.profile_picture_url) ? (
              <Image
                src={newPhotoUrl || profile.profile_picture_url!}
                alt={`${profile.first_name}'s photo`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-violet-300">
                {profile.first_name[0]}
              </div>
            )}
            {editMode && (
              <>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity cursor-pointer rounded-full",
                    photoUploading ? "opacity-100" : "opacity-0 hover:opacity-100"
                  )}
                >
                  {photoUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
              </>
            )}
          </div>
          {editMode && error && (
            <p className="mt-1 text-[11px] text-red-500 text-center">{error}</p>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {profile.first_name}{age ? `, ${age}` : ""}
              </h1>
              <p className="flex items-center gap-1 text-sm text-slate-500 mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                {profile.suburb}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <VerificationBadge tier={profile.verification_tier} />
              {!editMode && (
                <button
                  onClick={enterEditMode}
                  className="p-2 rounded-full border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-colors"
                  title="Edit Profile"
                >
                  <Pencil className="h-4 w-4 text-slate-400 hover:text-violet-500" />
                </button>
              )}
              {editMode && (
                <button
                  onClick={exitEditMode}
                  className="p-2 rounded-full border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-colors"
                  title="Cancel Editing"
                >
                  <X className="h-4 w-4 text-slate-400 hover:text-red-500" />
                </button>
              )}
            </div>
          </div>

          {/* Tagline */}
          {editMode && activeTab === "profile" ? (
            tagline ? (
              <div className="mt-3">
                <EditableSection
                  html={tagline.replace(/<\/?p>/g, "")}
                  editValue={aiEdits["headline"]}
                  onEdit={(v) => setAiEdit("headline", v)}
                />
              </div>
            ) : null
          ) : (
            tagline && (
              <div className="mt-3">
                <div
                  className="text-sm text-slate-700 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: tagline.replace(/<\/?p>/g, "") }}
                />
              </div>
            )
          )}

          {profile.hourly_rate_min && (
            <p className="mt-2 text-sm font-medium text-violet-600">
              From ${profile.hourly_rate_min}/hr
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════
  // ── VIEW MODE ──
  // ══════════════════════════════════

  if (!editMode) {
    return (
      <div className="mx-auto max-w-2xl space-y-0">
        {heroSection}

        {/* Tab bar */}
        <div className="mt-6 flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="mt-6 space-y-4">
          {activeTab === "profile" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {bioContent ? (
                <div
                  className="text-sm text-slate-700 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: bioContent }}
                />
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-600 leading-relaxed">
                    {profile.first_name} is a {profile.nationality || ""} nanny based in {profile.suburb}
                    {profile.total_experience_years ? ` with ${profile.total_experience_years} years of childcare experience` : ""}.
                  </p>
                  {profile.strengths_traits && (
                    <p className="text-slate-600 leading-relaxed">{profile.strengths_traits}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "about" && (
            <>
              {bioSummary.about && (
                <SectionCard title="About Me">
                  <div className="text-sm text-slate-700 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: bioSummary.about }} />
                </SectionCard>
              )}
              {(experienceContent || profile.total_experience_years) && (
                <SectionCard title="Experience">
                  {experienceContent ? (
                    <div className="text-sm text-slate-700 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: experienceContent }} />
                  ) : (
                    <div className="space-y-1 text-sm text-slate-700">
                      {profile.total_experience_years !== null && <p>{profile.total_experience_years} years total childcare experience</p>}
                      {profile.nanny_experience_years !== null && <p>{profile.nanny_experience_years} years as a nanny</p>}
                    </div>
                  )}
                </SectionCard>
              )}
              {bioSummary.traits && (
                <SectionCard title="Strengths">
                  <div className="text-sm text-slate-700 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: bioSummary.traits }} />
                </SectionCard>
              )}
              {bioSummary.background && (
                <SectionCard title="Background & Skills">
                  <div className="text-sm text-slate-700 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: bioSummary.background }} />
                </SectionCard>
              )}
              {bioSummary.services && (
                <SectionCard title="Services">
                  <div className="text-sm text-slate-700 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: bioSummary.services }} />
                </SectionCard>
              )}
              {!bioSummary.about && !bioSummary.traits && (
                <>
                  {profile.strengths_traits && (
                    <SectionCard title="Strengths"><p className="text-sm text-slate-700">{profile.strengths_traits}</p></SectionCard>
                  )}
                  {profile.hobbies_interests && (
                    <SectionCard title="Hobbies & Interests"><p className="text-sm text-slate-700">{profile.hobbies_interests}</p></SectionCard>
                  )}
                </>
              )}
              <SectionCard title="Key Details">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {profile.nationality && (
                    <div><span className="text-slate-500">Nationality</span><p className="font-medium text-slate-700">{profile.nationality}</p></div>
                  )}
                  {profile.languages && profile.languages.length > 0 && (
                    <div><span className="text-slate-500">Languages</span><p className="font-medium text-slate-700">{profile.languages.join(", ")}</p></div>
                  )}
                  <div>
                    <span className="text-slate-500">Age Range</span>
                    <p className="font-medium text-slate-700">{ageMonthsToLabel(profile.min_child_age_months)} – {ageMonthsToLabel(profile.max_child_age_months)}</p>
                  </div>
                  {profile.max_children && (
                    <div><span className="text-slate-500">Max Children</span><p className="font-medium text-slate-700">{profile.max_children}</p></div>
                  )}
                  {profile.hourly_rate_min && (
                    <div><span className="text-slate-500">Hourly Rate</span><p className="font-medium text-slate-700">From ${profile.hourly_rate_min}</p></div>
                  )}
                  {profile.pay_frequency && profile.pay_frequency.length > 0 && (
                    <div><span className="text-slate-500">Pay Frequency</span><p className="font-medium text-slate-700">{profile.pay_frequency.join(", ")}</p></div>
                  )}
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === "checklist" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {checklistContent ? (
                <div
                  className="text-sm text-slate-700 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_br]:block [&_br]:my-0.5"
                  dangerouslySetInnerHTML={{ __html: checklistContent }}
                />
              ) : (
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Summary</h4>
                    <p className="text-slate-700">✅ Ages {ageMonthsToLabel(profile.min_child_age_months)} – {ageMonthsToLabel(profile.max_child_age_months)}</p>
                    {profile.role_types_preferred?.map((s) => <p key={s} className="text-slate-700">✅ {s}</p>)}
                    {profile.level_of_support_offered?.map((s) => <p key={s} className="text-slate-700">✅ {s}</p>)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Transport & Other</h4>
                    {profile.drivers_license && <p className="text-slate-700">🪪 Drivers License</p>}
                    {profile.has_car && <p className="text-slate-700">🚗 Car</p>}
                    {profile.comfortable_with_pets && <p className="text-slate-700">✅ Comfortable with Pets</p>}
                    {profile.vaccination_status && <p className="text-slate-700">✅ Fully Vaccinated</p>}
                    {profile.non_smoker && <p className="text-slate-700">✅ Non-Smoker</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "availability" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <ViewAvailabilityGrid availability={profile.availability} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════
  // ── EDIT MODE ──
  // ══════════════════════════════════

  return (
    <div className="mx-auto max-w-2xl space-y-0">
      {heroSection}

      {/* Main tabs */}
      <div className="mt-6 flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {EDIT_TABS.map((tab) => {
          const Icon = tab.id === "profile" ? User : tab.id === "about" ? FileText : Settings;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tabs for Details */}
      {activeTab === "details" && (
        <div className="mt-3 flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {DETAIL_SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                activeSubTab === tab.id
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      <div className="mt-6 space-y-4">
        {/* ── Edit: Profile tab ── */}
        {activeTab === "profile" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {bioContent ? (
              <EditableSection
                html={bioContent}
                editValue={aiEdits["parent_pitch"]}
                onEdit={(v) => setAiEdit("parent_pitch", v)}
              />
            ) : (
              <p className="text-sm text-slate-400 italic">
                No bio content generated yet. Save your profile and click &quot;Regenerate Profile&quot; to generate.
              </p>
            )}
          </div>
        )}

        {/* ── Edit: About tab ── */}
        {activeTab === "about" && (
          <>
            {bioSummary.about && (
              <SectionCard title="About Me">
                <EditableSection
                  html={bioSummary.about}
                  editValue={aiEdits["bio_summary.about"]}
                  onEdit={(v) => setAiEdit("bio_summary.about", v)}
                />
              </SectionCard>
            )}
            {(experienceContent || profile.total_experience_years) && (
              <SectionCard title="Experience">
                {experienceContent ? (
                  <EditableSection
                    html={experienceContent}
                    editValue={aiEdits["experience_summary"]}
                    onEdit={(v) => setAiEdit("experience_summary", v)}
                  />
                ) : (
                  <div className="space-y-1 text-sm text-slate-700">
                    {profile.total_experience_years !== null && <p>{profile.total_experience_years} years total childcare experience</p>}
                  </div>
                )}
              </SectionCard>
            )}
            {bioSummary.traits && (
              <SectionCard title="Strengths">
                <EditableSection
                  html={bioSummary.traits}
                  editValue={aiEdits["bio_summary.traits"]}
                  onEdit={(v) => setAiEdit("bio_summary.traits", v)}
                />
              </SectionCard>
            )}
            {bioSummary.background && (
              <SectionCard title="Background & Skills">
                <EditableSection
                  html={bioSummary.background}
                  editValue={aiEdits["bio_summary.background"]}
                  onEdit={(v) => setAiEdit("bio_summary.background", v)}
                />
              </SectionCard>
            )}
            {bioSummary.services && (
              <SectionCard title="Services">
                <EditableSection
                  html={bioSummary.services}
                  editValue={aiEdits["bio_summary.services"]}
                  onEdit={(v) => setAiEdit("bio_summary.services", v)}
                />
              </SectionCard>
            )}
            {!bioSummary.about && !bioSummary.traits && !bioSummary.background && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                <p className="text-sm text-slate-400 italic">No AI content generated yet. Save and regenerate to create content.</p>
              </div>
            )}
          </>
        )}

        {/* ── Edit: Details tab ── */}
        {activeTab === "details" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            {/* Credentials */}
            {activeSubTab === "credentials" && (
              <>
                <div>
                  <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Experience</Label>
                  <div className="mt-3">
                    <Label className="text-xs text-slate-500">Experience Details</Label>
                    <textarea
                      value={form.experience_details}
                      onChange={(e) => update("experience_details", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                      rows={3}
                      placeholder="Describe your childcare experience..."
                    />
                  </div>
                  <div className="mt-4 space-y-4">
                    {([
                      ["total_experience_years", "Total Childcare Experience"],
                      ["nanny_experience_years", "Nanny Experience"],
                      ["under_3_experience_years", "Under 3s Experience"],
                      ["newborn_experience_years", "Newborn Experience"],
                    ] as const).map(([key, label]) => (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs text-slate-500">{label}</Label>
                          <span className="text-xs font-medium text-violet-600">
                            {form[key] !== null ? (form[key]! >= 10 ? "10+" : `${form[key]}`) : "0"} years
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={form[key] ?? 0}
                          onChange={(e) => update(key, parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-violet-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-5">
                  <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Qualifications</Label>
                  <div className="mt-3">
                    <Label className="text-xs text-slate-500">Highest Qualification</Label>
                    <select
                      value={form.highest_qualification || ""}
                      onChange={(e) => update("highest_qualification", e.target.value || null)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                    >
                      <option value="">Select...</option>
                      {QUALIFICATION_OPTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs text-slate-500">Certificates</Label>
                    <MultiSelectTags options={CERTIFICATE_OPTIONS} selected={form.certificates} onChange={(v) => update("certificates", v)} />
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs text-slate-500">Assurances</Label>
                    <MultiSelectTags options={ASSURANCE_OPTIONS} selected={form.assurances} onChange={(v) => update("assurances", v)} />
                  </div>
                </div>
              </>
            )}

            {/* Preferences */}
            {activeSubTab === "preferences" && (
              <>
                <div>
                  <Label className="text-xs text-slate-500">Role Types</Label>
                  <MultiSelectTags options={ROLE_TYPE_OPTIONS} selected={form.role_types_preferred} onChange={(v) => update("role_types_preferred", v)} />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Level of Support</Label>
                  <MultiSelectTags options={LEVEL_OF_SUPPORT_OPTIONS} selected={form.level_of_support_offered} onChange={(v) => update("level_of_support_offered", v)} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Max Children</Label>
                    <SingleSelectTags
                      options={["1", "2", "3"]}
                      value={form.max_children !== null ? String(form.max_children) : null}
                      onChange={(v) => update("max_children", parseInt(v))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Min Child Age</Label>
                    <select
                      value={form.min_child_age_months ?? ""}
                      onChange={(e) => update("min_child_age_months", e.target.value ? parseInt(e.target.value) : null)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                    >
                      <option value="">Any</option>
                      {MIN_AGE_OPTIONS.map((o) => <option key={o.months} value={o.months}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Max Child Age</Label>
                    <select
                      value={form.max_child_age_months ?? ""}
                      onChange={(e) => update("max_child_age_months", e.target.value ? parseInt(e.target.value) : null)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                    >
                      <option value="">Any</option>
                      {MAX_AGE_OPTIONS.map((o) => <option key={o.months} value={o.months}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Comfortable with Additional Needs?</Label>
                  <BooleanTags value={form.additional_needs_ok} onChange={(v) => update("additional_needs_ok", v)} />
                </div>
                <div className="border-t border-slate-100 pt-5">
                  <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Salary</Label>
                  <div className="mt-3">
                    <Label className="text-xs text-slate-500">Minimum Hourly Rate ($)</Label>
                    <Input
                      type="number"
                      min={25}
                      step={0.25}
                      value={form.hourly_rate_min ?? ""}
                      onChange={(e) => update("hourly_rate_min", e.target.value ? parseFloat(e.target.value) : null)}
                      className="mt-1 max-w-[200px]"
                    />
                  </div>
                  <div className="mt-3">
                    <Label className="text-xs text-slate-500">Pay Frequency</Label>
                    <MultiSelectTags options={PAY_FREQUENCY_OPTIONS} selected={form.pay_frequency} onChange={(v) => update("pay_frequency", v)} />
                  </div>
                </div>
              </>
            )}

            {/* Availability */}
            {activeSubTab === "availability" && (
              <>
                <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Weekly Schedule</Label>
                <p className="text-xs text-slate-400">Click cells to toggle availability</p>
                <EditableAvailabilityGrid form={form} update={update} />
                <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Immediate Start?</Label>
                    <BooleanTags value={form.immediate_start_available} onChange={(v) => update("immediate_start_available", v)} />
                    {!form.immediate_start_available && (
                      <Input
                        type="date"
                        value={form.start_date_earliest}
                        onChange={(e) => update("start_date_earliest", e.target.value)}
                        className="mt-2"
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Ongoing Placement?</Label>
                    <BooleanTags value={form.placement_ongoing_preferred} onChange={(v) => update("placement_ongoing_preferred", v)} />
                    {!form.placement_ongoing_preferred && (
                      <Input
                        type="date"
                        value={form.end_date_latest}
                        onChange={(e) => update("end_date_latest", e.target.value)}
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Info */}
            {activeSubTab === "info" && (
              <>
                <div>
                  <Label className="text-xs text-slate-500">Languages</Label>
                  <MultiSelectTags options={LANGUAGE_OPTIONS} selected={form.languages} onChange={(v) => update("languages", v)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Driver&apos;s License</Label>
                    <BooleanTags value={form.drivers_license} onChange={(v) => update("drivers_license", v)} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Access to Car</Label>
                    <BooleanTags value={form.has_car} onChange={(v) => update("has_car", v)} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Comfortable with Pets</Label>
                    <BooleanTags value={form.comfortable_with_pets} onChange={(v) => update("comfortable_with_pets", v)} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Fully Vaccinated</Label>
                    <BooleanTags value={form.vaccination_status} onChange={(v) => update("vaccination_status", v)} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Non-Smoker</Label>
                    <BooleanTags value={form.non_smoker} onChange={(v) => update("non_smoker", v)} />
                  </div>
                </div>
              </>
            )}

            {/* Bio */}
            {activeSubTab === "bio" && (
              <>
                <div>
                  <Label className="text-xs text-slate-500">Hobbies & Interests</Label>
                  <textarea
                    value={form.hobbies_interests}
                    onChange={(e) => update("hobbies_interests", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Strengths & Traits</Label>
                  <textarea
                    value={form.strengths_traits}
                    onChange={(e) => update("strengths_traits", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Skills & Training</Label>
                  <textarea
                    value={form.skills_training}
                    onChange={(e) => update("skills_training", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Save / Regenerate bar ── */}
      <div className="sticky bottom-4 z-10 mt-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {saveStatus === "saved" && (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-600">Saved</span>
              </>
            )}
            {saveStatus === "error" && <span className="text-red-500 text-xs">{error}</span>}
          </div>
          <div className="flex items-center gap-2">
            {showRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="text-violet-600 border-violet-200 hover:bg-violet-50"
              >
                {regenerating ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Regenerating...</>
                ) : (
                  <><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Regenerate Profile</>
                )}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isPending || saveStatus === "saving"}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {saveStatus === "saving" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Save</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Read-only availability grid (view mode) ──

function ViewAvailabilityGrid({ availability }: { availability: NannyProfile["availability"] }) {
  if (!availability?.days_available || availability.days_available.length === 0) {
    return <p className="text-sm text-slate-500 italic">Availability not set yet.</p>;
  }
  const schedule = availability.schedule || {};
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="py-2 pr-3 text-left text-xs font-medium text-slate-500 uppercase" />
            {SLOT_LABELS.map((label) => (
              <th key={label} className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => {
            const dayKey = day.toLowerCase();
            const rawEntry = (schedule as Record<string, unknown>)[dayKey];
            const slotActive = normaliseDaySlots(rawEntry);
            const isAvailable = availability.days_available?.includes(day);
            return (
              <tr key={day} className="border-t border-slate-100">
                <td className="py-2.5 pr-3 font-medium text-slate-700 text-sm whitespace-nowrap">{day.slice(0, 3)}</td>
                {SLOT_LABELS.map((_, i) => {
                  const active = isAvailable && slotActive[i];
                  return (
                    <td key={i} className="px-2 py-2.5 text-center">
                      <span className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs",
                        active ? "bg-violet-100 text-violet-600" : "bg-slate-50 text-slate-300"
                      )}>
                        {active ? "✓" : "–"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Interactive availability grid (edit mode) ──

function EditableAvailabilityGrid({
  form,
  update,
}: {
  form: { available_days: string[]; schedule: Record<string, string[]> };
  update: (key: "available_days" | "schedule", value: string[] | Record<string, string[]>) => void;
}) {
  const toggleCell = (day: string, slotIndex: number) => {
    const dayKey = day.toLowerCase();
    const slot = TIME_SLOTS[slotIndex];
    const currentSlots = form.schedule[dayKey] || [];
    const isActive = form.available_days.includes(day) && currentSlots.includes(slot);

    if (isActive) {
      // Remove slot
      const newSlots = currentSlots.filter((s) => s !== slot);
      const newSchedule = { ...form.schedule, [dayKey]: newSlots };
      // If no slots left for this day, remove from available_days
      if (newSlots.length === 0) {
        update("available_days", form.available_days.filter((d) => d !== day));
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [dayKey]: _removed, ...rest } = newSchedule;
        update("schedule", rest);
      } else {
        update("schedule", newSchedule);
      }
    } else {
      // Add slot
      const newDays = form.available_days.includes(day) ? form.available_days : [...form.available_days, day];
      update("available_days", newDays);
      update("schedule", { ...form.schedule, [dayKey]: [...currentSlots, slot] });
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="py-2 pr-3 text-left text-xs font-medium text-slate-500 uppercase" />
            {SLOT_LABELS.map((label) => (
              <th key={label} className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => {
            const dayKey = day.toLowerCase();
            const currentSlots = form.schedule[dayKey] || [];
            const isDayAvailable = form.available_days.includes(day);
            return (
              <tr key={day} className="border-t border-slate-100">
                <td className="py-2.5 pr-3 font-medium text-slate-700 text-sm whitespace-nowrap">{day.slice(0, 3)}</td>
                {TIME_SLOTS.map((slot, i) => {
                  const active = isDayAvailable && currentSlots.includes(slot);
                  return (
                    <td key={i} className="px-2 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => toggleCell(day, i)}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all",
                          active
                            ? "bg-violet-500 text-white shadow-sm hover:bg-violet-600"
                            : "bg-slate-100 text-slate-400 hover:bg-violet-100 hover:text-violet-500"
                        )}
                      >
                        {active ? "✓" : "–"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
