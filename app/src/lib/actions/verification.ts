'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { VERIFICATION_STATUS } from '@/lib/verification';

// ── Step 1: Identity ──

interface SubmitIdentityData {
  surname: string;
  given_names: string;
  date_of_birth: string;
  passport_country: string;
  passport_upload_url: string;
  identification_photo_url: string;
}

export async function submitIdentityStep(
  data: SubmitIdentityData
): Promise<{ success: boolean; error: string | null; verificationId?: string }> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!data.surname?.trim() || !data.given_names?.trim() || !data.date_of_birth || !data.passport_country) {
    return { success: false, error: 'Missing required identity fields' };
  }
  if (!data.passport_upload_url || !data.identification_photo_url) {
    return { success: false, error: 'Missing required document uploads' };
  }

  const adminClient = createAdminClient();

  const { data: verification, error: upsertErr } = await adminClient
    .from('verifications')
    .upsert({
      user_id: user.id,
      surname: data.surname.trim(),
      given_names: data.given_names.trim(),
      date_of_birth: data.date_of_birth,
      passport_country: data.passport_country,
      passport_upload_url: data.passport_upload_url,
      identification_photo_url: data.identification_photo_url,
      verification_status: VERIFICATION_STATUS.PENDING_ID_AUTO,
      // Clear previous identity AI data on resubmission
      identity_rejection_reason: null,
      identity_verified: false,
      extracted_surname: null,
      extracted_given_names: null,
      extracted_dob: null,
      extracted_nationality: null,
      extracted_passport_number: null,
      extracted_passport_expiry: null,
      identity_ai_reasoning: null,
      identity_ai_issues: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('id')
    .single();

  if (upsertErr || !verification) {
    console.error('[submitIdentityStep] Upsert failed:', upsertErr);
    return { success: false, error: 'Failed to save verification record' };
  }

  // Update nannies table: level -> 1 (Registered)
  await adminClient.from('nannies').update({
    verification_level: 1,
    updated_at: new Date().toISOString(),
  }).eq('user_id', user.id);

  revalidatePath('/nanny/verification');
  return { success: true, error: null, verificationId: verification.id };
}

// ── Step 2: WWCC ──

interface SubmitWWCCData {
  wwcc_verification_method: string;
  wwcc_number?: string;
  wwcc_expiry_date?: string | null;
  wwcc_grant_email_url?: string | null;
  wwcc_service_nsw_screenshot_url?: string | null;
}

export async function submitWWCCStep(
  data: SubmitWWCCData
): Promise<{ success: boolean; error: string | null; verificationId?: string }> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!data.wwcc_verification_method) {
    return { success: false, error: 'Missing WWCC verification method' };
  }

  if (data.wwcc_verification_method === 'grant_email' && !data.wwcc_grant_email_url) {
    return { success: false, error: 'WWCC grant email document is required' };
  }
  if (data.wwcc_verification_method === 'service_nsw_app' && !data.wwcc_service_nsw_screenshot_url) {
    return { success: false, error: 'Service NSW screenshot is required' };
  }
  if (data.wwcc_verification_method === 'manual_entry') {
    if (!data.wwcc_number) return { success: false, error: 'WWCC number is required for manual entry' };
    if (!data.wwcc_expiry_date) return { success: false, error: 'WWCC expiry date is required for manual entry' };
  }

  const adminClient = createAdminClient();

  // Look up existing verification record
  const { data: existing, error: lookupErr } = await adminClient
    .from('verifications')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (lookupErr || !existing) {
    return { success: false, error: 'No verification record found. Complete Step 1 first.' };
  }

  const { error: updateErr } = await adminClient
    .from('verifications')
    .update({
      wwcc_verification_method: data.wwcc_verification_method,
      wwcc_number: data.wwcc_number?.trim() ?? null,
      wwcc_expiry_date: data.wwcc_expiry_date ?? null,
      wwcc_grant_email_url: data.wwcc_grant_email_url ?? null,
      wwcc_service_nsw_screenshot_url: data.wwcc_service_nsw_screenshot_url ?? null,
      // Clear previous WWCC AI data on resubmission
      wwcc_rejection_reason: null,
      wwcc_verified: false,
      extracted_wwcc_surname: null,
      extracted_wwcc_first_name: null,
      extracted_wwcc_other_names: null,
      extracted_wwcc_number: null,
      extracted_wwcc_clearance_type: null,
      extracted_wwcc_expiry: null,
      wwcc_ai_reasoning: null,
      wwcc_ai_issues: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (updateErr) {
    console.error('[submitWWCCStep] Update failed:', updateErr);
    return { success: false, error: 'Failed to save WWCC data' };
  }

  revalidatePath('/nanny/verification');
  return { success: true, error: null, verificationId: existing.id };
}

// ── Step 3: Contact Details ──

interface SubmitContactData {
  phone_number: string;
  address_line: string;
  city: string;
  state?: string | null;
  postcode: string;
  country: string;
}

export async function submitContactStep(
  data: SubmitContactData
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!data.phone_number?.trim() || !data.address_line?.trim() || !data.city?.trim() || !data.postcode?.trim()) {
    return { success: false, error: 'Missing required contact details' };
  }

  const adminClient = createAdminClient();

  const { error: updateErr } = await adminClient
    .from('verifications')
    .update({
      phone_number: data.phone_number.trim(),
      address_line: data.address_line.trim(),
      city: data.city.trim(),
      state: data.state?.trim() ?? null,
      postcode: data.postcode.trim(),
      country: data.country.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (updateErr) {
    console.error('[submitContactStep] Update failed:', updateErr);
    return { success: false, error: 'Failed to save contact details' };
  }

  revalidatePath('/nanny/verification');
  return { success: true, error: null };
}

// ── Get Verification Status ──

export interface VerificationRecord {
  id: string;
  verification_status: number;
  identity_verified: boolean;
  wwcc_verified: boolean;
  identity_rejection_reason: string | null;
  wwcc_rejection_reason: string | null;
  wwcc_expiry_date: string | null;
  wwcc_number: string | null;
  created_at: string;
  updated_at: string;
}

export async function getVerificationStatus(): Promise<{
  data: VerificationRecord | null;
  error: string | null;
}> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('verifications')
    .select('id, verification_status, identity_verified, wwcc_verified, identity_rejection_reason, wwcc_rejection_reason, wwcc_expiry_date, wwcc_number, created_at, updated_at')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[getVerificationStatus] Error:', error);
    return { data: null, error: 'Failed to fetch verification status' };
  }

  return { data: data ?? null, error: null };
}
