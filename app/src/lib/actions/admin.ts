'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import {
  VERIFICATION_STATUS,
  VERIFICATION_LEVEL,
  IDENTITY_STATUS,
  WWCC_STATUS,
  CROSS_CHECK_STATUS,
} from '@/lib/verification';
import { runCrossCheckPhase } from '@/lib/ai/verification-pipeline';

// ── Helper: require admin role ──

async function requireAdmin(): Promise<{ userId: string; error: string | null }> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { userId: '', error: 'Not authenticated' };

  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!role || !['admin', 'super_admin'].includes(role.role)) {
    return { userId: '', error: 'Not authorized — admin role required' };
  }
  return { userId: user.id, error: null };
}

// ── Admin: Verify Identity (approve passport check) ──
// State transition: identity_status → verified, level 1 → 2

export async function adminVerifyIdentity(
  verificationId: string
): Promise<{ success: boolean; error: string | null }> {
  const { userId: adminId, error: authErr } = await requireAdmin();
  if (authErr) return { success: false, error: authErr };

  const supabase = createClient();

  const { data: verification, error: fetchErr } = await supabase
    .from('verifications')
    .select('user_id, verification_status, wwcc_status')
    .eq('id', verificationId)
    .single();

  if (fetchErr || !verification) {
    return { success: false, error: 'Verification record not found' };
  }

  const { error: updateVerErr } = await supabase
    .from('verifications')
    .update({
      identity_verified: true,
      identity_verified_at: new Date().toISOString(),
      identity_verified_by: adminId,
      identity_status: IDENTITY_STATUS.VERIFIED,
      identity_status_at: new Date().toISOString(),
      identity_rejection_reason: null,
      identity_user_guidance: null,
      verification_status: VERIFICATION_STATUS.PENDING_WWCC_AUTO,
      updated_at: new Date().toISOString(),
    })
    .eq('id', verificationId);

  if (updateVerErr) {
    return { success: false, error: `Failed to update verification: ${updateVerErr.message}` };
  }

  const { error: updateNannyErr } = await supabase
    .from('nannies')
    .update({
      identity_verified: true,
      verification_level: VERIFICATION_LEVEL.ID_VERIFIED,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', verification.user_id);

  if (updateNannyErr) {
    return { success: false, error: `Failed to update nanny: ${updateNannyErr.message}` };
  }

  // Check if WWCC is ready → trigger cross-check
  if (verification.wwcc_status === WWCC_STATUS.DOC_VERIFIED) {
    await supabase.from('verifications').update({
      cross_check_status: CROSS_CHECK_STATUS.PENDING,
      updated_at: new Date().toISOString(),
    }).eq('id', verificationId);

    runCrossCheckPhase(verificationId).catch(err => {
      console.error('[adminVerifyIdentity] Cross-check error:', err);
    });
  }

  revalidatePath('/admin/users');
  return { success: true, error: null };
}

// ── Admin: Reject Identity ──
// State transition: identity_status → rejected, level stays 1

export async function adminRejectIdentity(
  verificationId: string,
  reason: string
): Promise<{ success: boolean; error: string | null }> {
  const { error: authErr } = await requireAdmin();
  if (authErr) return { success: false, error: authErr };

  if (!reason.trim()) {
    return { success: false, error: 'Rejection reason is required' };
  }

  const supabase = createClient();

  const { error: updateErr } = await supabase
    .from('verifications')
    .update({
      identity_rejection_reason: reason.trim(),
      identity_status: IDENTITY_STATUS.REJECTED,
      identity_status_at: new Date().toISOString(),
      verification_status: VERIFICATION_STATUS.ID_REJECTED,
      updated_at: new Date().toISOString(),
    })
    .eq('id', verificationId);

  if (updateErr) {
    return { success: false, error: `Failed to reject: ${updateErr.message}` };
  }

  revalidatePath('/admin/users');
  return { success: true, error: null };
}

// ── Admin: Confirm WWCC (manual OCG portal check passed) ──
// State transition: wwcc_status → doc_verified, then trigger cross-check

export async function adminConfirmWWCC(
  verificationId: string
): Promise<{ success: boolean; error: string | null }> {
  const { userId: adminId, error: authErr } = await requireAdmin();
  if (authErr) return { success: false, error: authErr };

  const supabase = createClient();

  const { data: verification, error: fetchErr } = await supabase
    .from('verifications')
    .select('user_id, verification_status, identity_status')
    .eq('id', verificationId)
    .single();

  if (fetchErr || !verification) {
    return { success: false, error: 'Verification record not found' };
  }

  const { error: updateVerErr } = await supabase
    .from('verifications')
    .update({
      wwcc_verified: true,
      wwcc_verified_at: new Date().toISOString(),
      wwcc_verified_by: adminId,
      wwcc_status: WWCC_STATUS.DOC_VERIFIED,
      wwcc_status_at: new Date().toISOString(),
      wwcc_doc_verified: true,
      wwcc_doc_verified_at: new Date().toISOString(),
      wwcc_rejection_reason: null,
      wwcc_user_guidance: null,
      verification_status: VERIFICATION_STATUS.FULLY_VERIFIED,
      updated_at: new Date().toISOString(),
    })
    .eq('id', verificationId);

  if (updateVerErr) {
    return { success: false, error: `Failed to update verification: ${updateVerErr.message}` };
  }

  // If identity is verified → trigger cross-check
  if (verification.identity_status === IDENTITY_STATUS.VERIFIED) {
    await supabase.from('verifications').update({
      cross_check_status: CROSS_CHECK_STATUS.PENDING,
      updated_at: new Date().toISOString(),
    }).eq('id', verificationId);

    runCrossCheckPhase(verificationId).catch(err => {
      console.error('[adminConfirmWWCC] Cross-check error:', err);
    });
  }

  revalidatePath('/admin/users');
  return { success: true, error: null };
}

// ── Admin: Reject WWCC ──
// State transition: wwcc_status → rejected, level → 2

export async function adminRejectWWCC(
  verificationId: string,
  reason: string
): Promise<{ success: boolean; error: string | null }> {
  const { error: authErr } = await requireAdmin();
  if (authErr) return { success: false, error: authErr };

  if (!reason.trim()) {
    return { success: false, error: 'Rejection reason is required' };
  }

  const supabase = createClient();

  const { data: verification, error: fetchErr } = await supabase
    .from('verifications')
    .select('user_id')
    .eq('id', verificationId)
    .single();

  if (fetchErr || !verification) {
    return { success: false, error: 'Verification record not found' };
  }

  const { error: updateVerErr } = await supabase
    .from('verifications')
    .update({
      wwcc_rejection_reason: reason.trim(),
      wwcc_status: WWCC_STATUS.REJECTED,
      wwcc_status_at: new Date().toISOString(),
      verification_status: VERIFICATION_STATUS.WWCC_REJECTED,
      updated_at: new Date().toISOString(),
    })
    .eq('id', verificationId);

  if (updateVerErr) {
    return { success: false, error: `Failed to reject: ${updateVerErr.message}` };
  }

  const { error: updateNannyErr } = await supabase
    .from('nannies')
    .update({
      wwcc_verified: false,
      verification_level: VERIFICATION_LEVEL.ID_VERIFIED,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', verification.user_id);

  if (updateNannyErr) {
    return { success: false, error: `Failed to update nanny: ${updateNannyErr.message}` };
  }

  revalidatePath('/admin/users');
  return { success: true, error: null };
}

// ── Admin: Delete User ──
// Deletes from auth.users which cascades to all FK-referenced tables

export async function adminDeleteUser(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error: authErr } = await requireAdmin();
  if (authErr) return { success: false, error: authErr };

  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    console.error('[Admin] Delete user error:', error);
    return { success: false, error: `Failed to delete user: ${error.message}` };
  }

  revalidatePath('/admin/users');
  return { success: true, error: null };
}

// ── Admin: Change Role ──
// Updates user_roles and creates skeleton role-specific record if needed

export async function adminChangeRole(
  userId: string,
  newRole: 'nanny' | 'parent' | 'admin'
): Promise<{ success: boolean; error: string | null }> {
  const { error: authErr } = await requireAdmin();
  if (authErr) return { success: false, error: authErr };

  const adminClient = createAdminClient();

  // Update role
  const { error: roleErr } = await adminClient
    .from('user_roles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (roleErr) {
    return { success: false, error: `Failed to update role: ${roleErr.message}` };
  }

  // Create skeleton nanny record if switching to nanny
  if (newRole === 'nanny') {
    const { data: existing } = await adminClient
      .from('nannies')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      const { error: insertErr } = await adminClient
        .from('nannies')
        .insert({ user_id: userId, status: 'active' });

      if (insertErr) {
        console.error('[Admin] Create nanny record error:', insertErr);
      }
    }
  }

  // Create skeleton parent record if switching to parent
  if (newRole === 'parent') {
    const { data: existing } = await adminClient
      .from('parents')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existing) {
      const { error: insertErr } = await adminClient
        .from('parents')
        .insert({ user_id: userId, status: 'active' });

      if (insertErr) {
        console.error('[Admin] Create parent record error:', insertErr);
      }
    }
  }

  revalidatePath('/admin/users');
  return { success: true, error: null };
}

// ── Admin: Reset Verification ──
// Resets nanny verification to zero for re-testing

export async function adminResetVerification(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error: authErr } = await requireAdmin();
  if (authErr) return { success: false, error: authErr };

  const adminClient = createAdminClient();

  // Reset nanny record
  const { error: nannyErr } = await adminClient
    .from('nannies')
    .update({
      verification_level: VERIFICATION_LEVEL.SIGNED_UP,
      verification_status: VERIFICATION_STATUS.NOT_STARTED,
      wwcc_verified: false,
      identity_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (nannyErr) {
    return { success: false, error: `Failed to reset nanny: ${nannyErr.message}` };
  }

  // Delete all verification records
  const { error: deleteErr } = await adminClient
    .from('verifications')
    .delete()
    .eq('user_id', userId);

  if (deleteErr) {
    return { success: false, error: `Failed to delete verifications: ${deleteErr.message}` };
  }

  revalidatePath('/admin/users');
  return { success: true, error: null };
}
