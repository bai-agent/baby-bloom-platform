'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface Position {
  id: string;
  parent_id: string;
  title: string | null;
  description: string | null;

  // Timeline
  urgency: string | null;
  start_date: string | null;
  placement_length: string | null;
  end_date: string | null;

  // Schedule
  schedule_type: string | null;
  hours_per_week: number | null;
  days_required: string[] | null;
  schedule_details: string | null;

  // Nanny Requirements
  language_preference: string | null;
  language_preference_details: string | null;
  minimum_age_requirement: number | null;
  years_of_experience: number | null;
  qualification_requirement: string | null;
  certificate_requirements: string[] | null;
  assurances_required: string[] | null;
  residency_status_requirement: string | null;

  // Booleans
  vaccination_required: boolean | null;
  drivers_license_required: boolean | null;
  car_required: boolean | null;
  comfortable_with_pets_required: boolean | null;
  non_smoker_required: boolean | null;
  other_requirements_exist: boolean | null;
  other_requirements_details: string | null;

  // Compensation
  hourly_rate: number | null;
  pay_frequency: string[] | null;

  // Reason & Support
  reason_for_nanny: string[] | null;
  level_of_support: string[] | null;

  // Location
  suburb: string | null;
  postcode: number | null;

  // Details (JSONB)
  details: Record<string, unknown> | null;

  // Status
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PositionChild {
  id: string;
  position_id: string;
  child_label: string;
  age_months: number;
  gender: string | null;
  display_order: number;
}

export interface PositionWithChildren extends Position {
  children: PositionChild[];
}

export async function getParentId(): Promise<string | null> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: parent, error } = await supabase
    .from('parents')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (error || !parent) return null;
  return parent.id;
}

export async function getPosition(): Promise<{ data: PositionWithChildren | null; error: string | null }> {
  const supabase = createClient();

  const parentId = await getParentId();
  if (!parentId) {
    return { data: null, error: 'Not authenticated as parent' };
  }

  // Get position
  const { data: position, error: positionError } = await supabase
    .from('nanny_positions')
    .select('*')
    .eq('parent_id', parentId)
    .eq('status', 'active')
    .single();

  if (positionError) {
    if (positionError.code === 'PGRST116') {
      // No rows found - that's OK
      return { data: null, error: null };
    }
    console.error('Position fetch error:', positionError);
    return { data: null, error: 'Failed to fetch position' };
  }

  // Get children for the position
  const { data: children, error: childrenError } = await supabase
    .from('position_children')
    .select('*')
    .eq('position_id', position.id)
    .order('display_order');

  if (childrenError) {
    console.error('Children fetch error:', childrenError);
  }

  return {
    data: {
      ...position,
      children: children || [],
    },
    error: null,
  };
}

export interface CreatePositionData {
  // Timeline
  urgency?: string;
  start_date?: string;
  placement_length?: string;
  end_date?: string;

  // Schedule
  schedule_type?: string;
  hours_per_week?: number;
  days_required?: string[];
  schedule_details?: string;

  // Children (1-3)
  children?: Array<{
    age_months: number;
    gender?: string;
  }>;

  // Nanny Requirements
  language_preference?: string;
  language_preference_details?: string;
  minimum_age_requirement?: number;
  years_of_experience?: number;
  qualification_requirement?: string;
  certificate_requirements?: string[];
  assurances_required?: string[];
  residency_status_requirement?: string;

  // Booleans
  vaccination_required?: boolean;
  drivers_license_required?: boolean;
  car_required?: boolean;
  comfortable_with_pets_required?: boolean;
  non_smoker_required?: boolean;
  other_requirements_exist?: boolean;
  other_requirements_details?: string;

  // Compensation
  hourly_rate?: number;
  pay_frequency?: string[];

  // Reason & Support
  reason_for_nanny?: string[];
  level_of_support?: string[];
}

export async function createPosition(
  data: CreatePositionData
): Promise<{ success: boolean; error: string | null; positionId?: string }> {
  const supabase = createClient();

  const parentId = await getParentId();
  if (!parentId) {
    return { success: false, error: 'Not authenticated as parent' };
  }

  // Extract children from data
  const { children, ...positionData } = data;

  // Create position
  const { data: position, error: positionError } = await supabase
    .from('nanny_positions')
    .insert({
      parent_id: parentId,
      ...positionData,
      status: 'active',
    })
    .select('id')
    .single();

  if (positionError) {
    console.error('Position create error:', positionError);
    if (positionError.code === '23505') {
      return { success: false, error: 'You already have an active position. Please close it first.' };
    }
    return { success: false, error: 'Failed to create position' };
  }

  // Create children records
  if (children && children.length > 0) {
    const childrenData = children.map((child, index) => ({
      position_id: position.id,
      child_label: ['A', 'B', 'C'][index],
      age_months: child.age_months,
      gender: child.gender || null,
      display_order: index + 1,
    }));

    const { error: childrenError } = await supabase
      .from('position_children')
      .insert(childrenData);

    if (childrenError) {
      console.error('Children create error:', childrenError);
      // Don't fail the whole operation, position was created
    }
  }

  revalidatePath('/parent/position');
  return { success: true, error: null, positionId: position.id };
}

export async function updatePosition(
  positionId: string,
  data: CreatePositionData
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const parentId = await getParentId();
  if (!parentId) {
    return { success: false, error: 'Not authenticated as parent' };
  }

  // Extract children from data
  const { children, ...positionData } = data;

  // Update position
  const { error: positionError } = await supabase
    .from('nanny_positions')
    .update(positionData)
    .eq('id', positionId)
    .eq('parent_id', parentId);

  if (positionError) {
    console.error('Position update error:', positionError);
    return { success: false, error: 'Failed to update position' };
  }

  // Update children - delete existing and recreate
  if (children) {
    await supabase
      .from('position_children')
      .delete()
      .eq('position_id', positionId);

    if (children.length > 0) {
      const childrenData = children.map((child, index) => ({
        position_id: positionId,
        child_label: ['A', 'B', 'C'][index],
        age_months: child.age_months,
        gender: child.gender || null,
        display_order: index + 1,
      }));

      await supabase
        .from('position_children')
        .insert(childrenData);
    }
  }

  revalidatePath('/parent/position');
  return { success: true, error: null };
}

// ── Typeform position save ──

import type { TypeformFormData } from '@/app/parent/request/questions';

const AGE_RANGE_TO_MONTHS: Record<string, number> = {
  '0–3 months': 1,
  '3–6 months': 4,
  '6–12 months': 9,
  '1–2 years': 18,
  '2–3 years': 30,
  '3–4 years': 42,
  '4–5 years': 54,
  '5–10 years': 90,
  '10–13 years': 138,
  '13–16 years': 174,
  '16+': 192,
};

const HOURS_TO_INT: Record<string, number> = {
  'Under 10': 8,
  '10–20': 15,
  '20–30': 25,
  '30–40': 35,
  '40+': 45,
};

const DAY_TO_ROSTER_FIELD: Record<string, keyof TypeformFormData> = {
  Monday: 'monday_roster',
  Tuesday: 'tuesday_roster',
  Wednesday: 'wednesday_roster',
  Thursday: 'thursday_roster',
  Friday: 'friday_roster',
  Saturday: 'saturday_roster',
  Sunday: 'sunday_roster',
};

function buildScheduleJson(
  data: Partial<TypeformFormData>
): Record<string, string[]> {
  const schedule: Record<string, string[]> = {};
  for (const day of data.weekly_roster ?? []) {
    const fieldKey = DAY_TO_ROSTER_FIELD[day];
    if (!fieldKey) continue;
    const times = (data[fieldKey] as string[] | undefined) ?? [];
    if (times.length > 0) {
      schedule[day.toLowerCase()] = times;
    }
  }
  return schedule;
}

export async function saveTypeformPosition(
  formData: Partial<TypeformFormData>
): Promise<{ success: boolean; error: string | null; positionId?: string }> {
  const supabase = createClient();

  const parentId = await getParentId();
  if (!parentId) {
    return { success: false, error: 'Not authenticated as parent' };
  }

  // Check for existing active position
  const { data: existing } = await supabase
    .from('nanny_positions')
    .select('id')
    .eq('parent_id', parentId)
    .eq('status', 'active')
    .maybeSingle();

  // Build position row
  const positionRow = {
    // Integers
    minimum_age_requirement: formData.minimum_age
      ? parseInt(formData.minimum_age)
      : null,
    years_of_experience: formData.years_of_experience
      ? parseInt(formData.years_of_experience)
      : null,
    hours_per_week: formData.hours_per_week
      ? (HOURS_TO_INT[formData.hours_per_week] ?? null)
      : null,

    // Booleans (form stores "Yes"/"No" strings)
    drivers_license_required: formData.drivers_license_required === 'Yes',
    car_required: formData.car_required === 'Yes',
    vaccination_required: formData.vaccination_required === 'Yes',
    non_smoker_required: formData.non_smoker_required === 'Yes',
    comfortable_with_pets_required: formData.has_pets === 'Yes',

    // Text
    language_preference: formData.language_preference ?? null,
    language_preference_details: formData.language_preference_details ?? null,
    suburb: formData.suburb ?? null,
    postcode: formData.postcode ?? null,
    schedule_type: formData.schedule_type ?? null,
    urgency: formData.urgency ?? null,
    start_date: formData.start_date ?? null,
    placement_length: formData.placement_length ?? null,

    // Arrays
    days_required: formData.weekly_roster ?? [],
    reason_for_nanny: formData.reason_for_nanny
      ? [formData.reason_for_nanny]
      : [],

    // JSONB — descriptive fields not queried for matching + full form data for editing
    details: {
      has_pets_details: formData.has_pets_details ?? null,
      child_needs: formData.child_needs_yn === 'Yes',
      child_needs_details: formData.child_needs_details ?? null,
      focus_type: formData.focus_type ?? null,
      support_type: formData.support_type ?? null,
      placement_duration: formData.placement_duration ?? null,
      hours_per_week_label: formData.hours_per_week ?? null,
      notes: formData.notes ?? null,
      form_data: formData,
    },
  };

  let positionId: string;

  if (existing) {
    const { error } = await supabase
      .from('nanny_positions')
      .update(positionRow)
      .eq('id', existing.id)
      .eq('parent_id', parentId);

    if (error) {
      console.error('Position update error:', error);
      return { success: false, error: 'Failed to update position' };
    }
    positionId = existing.id;
  } else {
    const { data: position, error } = await supabase
      .from('nanny_positions')
      .insert({
        parent_id: parentId,
        ...positionRow,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Position create error:', error);
      if (error.code === '23505') {
        return {
          success: false,
          error: 'You already have an active position.',
        };
      }
      return { success: false, error: 'Failed to create position' };
    }
    positionId = position.id;
  }

  // Children: delete existing and recreate
  await supabase
    .from('position_children')
    .delete()
    .eq('position_id', positionId);

  const numChildren = formData.num_children ?? 0;
  if (numChildren > 0) {
    const AGE_KEYS = [
      'child_a_age',
      'child_b_age',
      'child_c_age',
    ] as const;
    const GENDER_KEYS = [
      'child_a_gender',
      'child_b_gender',
      'child_c_gender',
    ] as const;

    const childrenRows = Array.from({ length: numChildren }).map((_, i) => ({
      position_id: positionId,
      child_label: ['A', 'B', 'C'][i],
      age_months:
        AGE_RANGE_TO_MONTHS[
          (formData[AGE_KEYS[i] as keyof TypeformFormData] as string) ?? ''
        ] ?? 0,
      gender:
        (formData[GENDER_KEYS[i] as keyof TypeformFormData] as string) ?? null,
      display_order: i + 1,
    }));

    const { error: childrenError } = await supabase
      .from('position_children')
      .insert(childrenRows);

    if (childrenError) {
      console.error('Children create error:', childrenError);
    }
  }

  // Schedule: upsert
  const schedule = buildScheduleJson(formData);
  if (Object.keys(schedule).length > 0) {
    const { error: scheduleError } = await supabase
      .from('position_schedule')
      .upsert(
        { position_id: positionId, schedule },
        { onConflict: 'position_id' }
      );

    if (scheduleError) {
      console.error('Schedule upsert error:', scheduleError);
    }
  }

  revalidatePath('/parent/position');
  revalidatePath('/parent/request');
  return { success: true, error: null, positionId };
}

export async function closePosition(
  positionId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const parentId = await getParentId();
  if (!parentId) {
    return { success: false, error: 'Not authenticated as parent' };
  }

  const { error } = await supabase
    .from('nanny_positions')
    .update({ status: 'cancelled' })
    .eq('id', positionId)
    .eq('parent_id', parentId);

  if (error) {
    console.error('Position close error:', error);
    return { success: false, error: 'Failed to close position' };
  }

  revalidatePath('/parent/position');
  return { success: true, error: null };
}
