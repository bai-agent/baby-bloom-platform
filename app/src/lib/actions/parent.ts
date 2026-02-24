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
