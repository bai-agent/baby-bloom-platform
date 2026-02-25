import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { VERIFICATION_STATUS, VERIFICATION_LEVEL, WWCC_STATUS, CROSS_CHECK_STATUS, GUIDANCE_MESSAGES } from '@/lib/verification';
import { parseOCGEmail } from '@/lib/verification/parse-ocg-email';
import { sendEmail } from '@/lib/email/resend';
import { getUserEmailInfo } from '@/lib/email/helpers';

// ── OCG Result Status Categories ──
// These MUST match the exact strings from the OCG portal email

const CLEARED_STATUSES = ['CLEARED'];
const HARD_BARRED_STATUSES = ['BARRED', 'INTERIM BAR'];
// Resubmit statuses: NOT FOUND, EXPIRED, CLOSED — downgrade, allow resubmit
// Pending statuses: APPLICATION IN PROGRESS — downgrade, wait and resubmit

/**
 * Parse OCG datetime string "DD/MM/YYYY HH:MM" → ISO 8601 (Sydney timezone)
 * Note: hardcoded +11:00 (AEDT). Off by 1h during AEST (Apr-Oct). Non-critical for audit.
 */
function parseOCGDatetime(raw: string): string | null {
  const match = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:00+11:00`;
}

/**
 * Map OCG result status to our verification_status integer and wwcc_status string.
 */
function mapOCGStatus(ocgStatus: string): {
  verification_status: number;
  wwcc_status: string;
  guidance: typeof GUIDANCE_MESSAGES[keyof typeof GUIDANCE_MESSAGES] | null;
} | null {
  if (CLEARED_STATUSES.includes(ocgStatus)) {
    return {
      verification_status: VERIFICATION_STATUS.FULLY_VERIFIED,
      wwcc_status: WWCC_STATUS.DOC_VERIFIED,
      guidance: null,
    };
  }
  if (HARD_BARRED_STATUSES.includes(ocgStatus)) {
    return {
      verification_status: VERIFICATION_STATUS.WWCC_REJECTED,
      wwcc_status: WWCC_STATUS.BARRED,
      guidance: GUIDANCE_MESSAGES.WWCC_BARRED,
    };
  }
  switch (ocgStatus) {
    case 'NOT FOUND':
      return {
        verification_status: VERIFICATION_STATUS.WWCC_OCG_NOT_FOUND,
        wwcc_status: WWCC_STATUS.OCG_NOT_FOUND,
        guidance: GUIDANCE_MESSAGES.WWCC_OCG_NOT_FOUND,
      };
    case 'EXPIRED':
      return {
        verification_status: VERIFICATION_STATUS.WWCC_EXPIRED,
        wwcc_status: WWCC_STATUS.EXPIRED,
        guidance: GUIDANCE_MESSAGES.WWCC_EXPIRED_OCG,
      };
    case 'CLOSED':
      return {
        verification_status: VERIFICATION_STATUS.WWCC_CLOSED,
        wwcc_status: WWCC_STATUS.CLOSED,
        guidance: GUIDANCE_MESSAGES.WWCC_CLOSED_OCG,
      };
    case 'APPLICATION IN PROGRESS':
      return {
        verification_status: VERIFICATION_STATUS.WWCC_APPLICATION_PENDING,
        wwcc_status: WWCC_STATUS.APPLICATION_PENDING,
        guidance: GUIDANCE_MESSAGES.WWCC_APPLICATION_PENDING,
      };
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  // ── 1. Auth check ──
  const authHeader = request.headers.get('authorization');
  const secret = process.env.OCG_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[OCG Webhook] OCG_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    console.warn('[OCG Webhook] Auth failed — header mismatch');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[OCG Webhook] Auth passed');

  // ── 2. Extract HTML + message_id from request body ──
  let html: string | undefined;
  let messageId: string | undefined;
  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      console.log('[OCG Webhook] Parsing as form data');
      const formData = await request.formData();
      html = formData.get('html')?.toString();
      messageId = formData.get('message_id')?.toString();
    } else {
      console.log(`[OCG Webhook] Parsing as JSON (content-type: ${contentType})`);
      const body = await request.json();
      html = body.html;
      messageId = body.message_id;
    }
  } catch (parseErr) {
    console.error('[OCG Webhook] Body parse failed:', parseErr);
    return NextResponse.json({ error: 'Could not parse request body' }, { status: 400 });
  }

  if (!html) {
    console.warn('[OCG Webhook] No html field in body');
    return NextResponse.json({ error: 'Missing html field' }, { status: 400 });
  }

  console.log(`[OCG Webhook] HTML received, length=${html.length}, message_id=${messageId ?? 'none'}`);

  // ── 3. Parse OCG email HTML ──
  let parsed;
  try {
    parsed = parseOCGEmail(html);
  } catch (err) {
    console.error('[OCG Webhook] Failed to parse email HTML:', err);
    return NextResponse.json({ error: 'Failed to parse email' }, { status: 422 });
  }

  console.log(`[OCG Webhook] Parsed ${parsed.results.length} results. Employer: ${parsed.employer_name} (${parsed.employer_id})`);
  for (const r of parsed.results) {
    console.log(`[OCG Webhook]   → family="${r.family_name}" ref="${r.reference_number}" status="${r.result_status}"`);
  }

  if (parsed.results.length === 0) {
    console.warn('[OCG Webhook] No results found in email');
    return NextResponse.json({ error: 'No results in email' }, { status: 422 });
  }

  // ── 4. Build shared OCG audit data from email header ──
  const ocgVerifiedAt = parseOCGDatetime(parsed.verification_datetime);
  const ocgAuditFields = {
    ocg_employer_id: parsed.employer_id || null,
    ocg_employer_name: parsed.employer_name || null,
    ocg_verified_at: ocgVerifiedAt,
    ocg_google_message_id: messageId || null,
    ocg_recorded_at: new Date().toISOString(),
  };

  // ── 5. Process each result row ──
  const supabase = createAdminClient();
  const processedResults: Array<{
    family_name: string;
    reference_number: string;
    result_status: string;
    action: string;
    verification_id?: string;
    error?: string;
  }> = [];

  for (const result of parsed.results) {
    const wwccNumber = result.reference_number.trim().toUpperCase();
    const familyName = result.family_name.trim();

    // Per-result OCG audit fields
    const resultOcgFields = {
      ...ocgAuditFields,
      ocg_result_status: result.result_status,
      ocg_result_text: result.result_text,
      ocg_expiry_date: result.expiry_date || null,
      ocg_reference_number: wwccNumber || null,
    };

    // Map OCG status to our system
    const mapped = mapOCGStatus(result.result_status);

    if (!mapped) {
      console.warn(`[OCG Webhook] Unknown OCG status: "${result.result_status}" for ${wwccNumber || familyName}`);
      processedResults.push({
        family_name: familyName,
        reference_number: wwccNumber,
        result_status: result.result_status,
        action: 'unknown_status',
      });
      continue;
    }

    // ── SURNAME-BASED LOOKUP (NOT FOUND, or any result without WWCC number) ──
    if (!wwccNumber || result.result_status === 'NOT FOUND') {
      console.log(`[OCG Webhook] Surname-based lookup for "${result.result_status}": familyName="${familyName}"`);

      if (!familyName) {
        processedResults.push({
          family_name: '',
          reference_number: '',
          result_status: result.result_status,
          action: 'skipped',
          error: 'No family name available',
        });
        continue;
      }

      // Search BOTH user_profiles.last_name AND verifications.surname
      const { data: profiles, error: profileErr } = await supabase
        .from('user_profiles')
        .select('user_id, last_name')
        .ilike('last_name', familyName);

      console.log(`[OCG Webhook] user_profiles.last_name query: ${profiles?.length ?? 0} matches (err: ${profileErr?.message ?? 'none'})`);

      const { data: directVerifications, error: directErr } = await supabase
        .from('verifications')
        .select('id, user_id, verification_status, wwcc_number')
        .ilike('surname', familyName)
        .not('verification_status', 'eq', VERIFICATION_STATUS.FULLY_VERIFIED);

      console.log(`[OCG Webhook] verifications.surname query: ${directVerifications?.length ?? 0} matches (err: ${directErr?.message ?? 'none'})`);

      let profileVerifications: typeof directVerifications = [];
      if (profiles && profiles.length > 0) {
        const userIds = profiles.map(p => p.user_id);
        const { data: pvs } = await supabase
          .from('verifications')
          .select('id, user_id, verification_status, wwcc_number')
          .in('user_id', userIds)
          .not('verification_status', 'eq', VERIFICATION_STATUS.FULLY_VERIFIED);
        profileVerifications = pvs ?? [];
        console.log(`[OCG Webhook] profile-based verifications: ${profileVerifications.length}`);
      }

      // Merge and deduplicate
      const verificationMap = new Map<string, { id: string; user_id: string; verification_status: number; wwcc_number: string | null }>();
      for (const v of [...(directVerifications ?? []), ...profileVerifications]) {
        if (!verificationMap.has(v.id)) verificationMap.set(v.id, v);
      }
      const verifications = Array.from(verificationMap.values());

      console.log(`[OCG Webhook] ${verifications.length} unique verifications for surname "${familyName}"`);

      if (verifications.length === 0) {
        processedResults.push({
          family_name: familyName,
          reference_number: '',
          result_status: result.result_status,
          action: 'no_match',
          error: `No pending verifications for surname "${familyName}"`,
        });
        continue;
      }

      for (const verification of verifications) {
        const updateResult = await updateVerificationFromOCG(supabase, verification.id, verification.user_id, mapped, resultOcgFields, result);
        processedResults.push({
          family_name: familyName,
          reference_number: verification.wwcc_number || '',
          result_status: result.result_status,
          ...updateResult,
          verification_id: verification.id,
        });
      }

      continue;
    }

    // ── WWCC NUMBER-BASED LOOKUP (all other statuses) ──

    // Match any non-final verification status (allow re-checks after NOT FOUND, EXPIRED, etc.)
    const { data: verification, error: fetchErr } = await supabase
      .from('verifications')
      .select('id, user_id, verification_status')
      .or(`wwcc_number.ilike.${wwccNumber},extracted_wwcc_number.ilike.${wwccNumber}`)
      .not('verification_status', 'eq', VERIFICATION_STATUS.FULLY_VERIFIED)
      .limit(1)
      .single();

    if (fetchErr || !verification) {
      console.warn(`[OCG Webhook] No matching verification for WWCC ${wwccNumber}`);
      processedResults.push({
        family_name: familyName,
        reference_number: wwccNumber,
        result_status: result.result_status,
        action: 'no_match',
        error: 'No verification record found',
      });
      continue;
    }

    const updateResult = await updateVerificationFromOCG(supabase, verification.id, verification.user_id, mapped, resultOcgFields, result);
    processedResults.push({
      family_name: familyName,
      reference_number: wwccNumber,
      result_status: result.result_status,
      ...updateResult,
      verification_id: verification.id,
    });
  }

  return NextResponse.json({
    processed: processedResults.length,
    employer: {
      id: parsed.employer_id,
      name: parsed.employer_name,
      datetime: parsed.verification_datetime,
    },
    results: processedResults,
  });
}

// ── Helper: Update verification + nanny based on OCG result ──

async function updateVerificationFromOCG(
  supabase: ReturnType<typeof createAdminClient>,
  verificationId: string,
  userId: string,
  mapped: NonNullable<ReturnType<typeof mapOCGStatus>>,
  ocgFields: Record<string, unknown>,
  result: { result_status: string; result_text: string; expiry_date: string | null }
): Promise<{ action: string; error?: string }> {

  const now = new Date().toISOString();
  const isCleared = CLEARED_STATUSES.includes(result.result_status);
  const isBarred = HARD_BARRED_STATUSES.includes(result.result_status);

  // Build verification update
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verificationUpdate: Record<string, any> = {
    verification_status: mapped.verification_status,
    wwcc_status: mapped.wwcc_status,
    wwcc_status_at: now,
    wwcc_ai_reasoning: `OCG Portal: ${result.result_text}`,
    wwcc_user_guidance: mapped.guidance,
    ...ocgFields,
    updated_at: now,
  };

  if (isCleared) {
    // CLEARED — full verification
    Object.assign(verificationUpdate, {
      wwcc_verified: true,
      wwcc_verified_at: now,
      wwcc_expiry_date: result.expiry_date,
      wwcc_doc_verified: true,
      wwcc_doc_verified_at: now,
      wwcc_rejection_reason: null,
      cross_check_status: CROSS_CHECK_STATUS.PASSED,
      cross_check_at: now,
    });
  } else if (isBarred) {
    // BARRED — hard rejection, no retry
    Object.assign(verificationUpdate, {
      wwcc_rejection_reason: `OCG Portal: ${result.result_status} — ${result.result_text}`,
      wwcc_verified: false,
    });
  } else {
    // NOT FOUND, EXPIRED, CLOSED, APPLICATION IN PROGRESS — allow resubmit
    Object.assign(verificationUpdate, {
      wwcc_rejection_reason: null,
      wwcc_verified: false,
    });
  }

  const { error: updateVerErr } = await supabase
    .from('verifications')
    .update(verificationUpdate)
    .eq('id', verificationId);

  if (updateVerErr) {
    console.error(`[OCG Webhook] Failed to update verification ${verificationId}:`, updateVerErr);
    return { action: 'error', error: updateVerErr.message };
  }

  // Update nanny record
  let nannyUpdate: Record<string, unknown>;
  if (isCleared) {
    nannyUpdate = {
      wwcc_verified: true,
      identity_verified: true,
      verification_level: VERIFICATION_LEVEL.FULLY_VERIFIED,
      status: 'active',
      updated_at: now,
    };
  } else if (isBarred) {
    nannyUpdate = {
      wwcc_verified: false,
      verification_level: VERIFICATION_LEVEL.SIGNED_UP,
      status: 'suspended',
      updated_at: now,
    };
  } else {
    nannyUpdate = {
      wwcc_verified: false,
      verification_level: VERIFICATION_LEVEL.ID_VERIFIED,
      updated_at: now,
    };
  }

  const { error: nannyErr, count: nannyCount } = await supabase
    .from('nannies')
    .update(nannyUpdate)
    .eq('user_id', userId);

  if (nannyErr) {
    console.error(`[OCG Webhook] Failed to update nanny for user ${userId}:`, nannyErr);
  } else {
    console.log(`[OCG Webhook] Nanny updated for user ${userId}: verification_level=${nannyUpdate.verification_level}, matched=${nannyCount ?? 'unknown'}`);
  }

  const actionName = isCleared ? 'cleared'
    : isBarred ? 'barred'
    : result.result_status === 'NOT FOUND' ? 'ocg_not_found'
    : result.result_status === 'EXPIRED' ? 'expired'
    : result.result_status === 'CLOSED' ? 'closed'
    : result.result_status === 'APPLICATION IN PROGRESS' ? 'application_pending'
    : 'processed';

  console.log(`[OCG Webhook] ${result.result_status} → verification ${verificationId} → status ${mapped.verification_status} (${actionName})`);

  // ── Send OCG result emails (fire-and-forget) ──
  sendOCGResultEmails(userId, result.result_status, isCleared, isBarred).catch(err => {
    console.error(`[OCG Webhook] Email send error:`, err);
  });

  return { action: actionName };
}

// ── OCG Result Email Dispatch ──

async function sendOCGResultEmails(
  userId: string,
  ocgStatus: string,
  isCleared: boolean,
  isBarred: boolean,
): Promise<void> {
  // No email for CLEARED — nanny already received VER-001 at provisionally verified
  if (isCleared) return;

  const userInfo = await getUserEmailInfo(userId);
  if (!userInfo) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app-babybloom.vercel.app';
  const baseStyle = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;`;
  const btnStyle = `background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;`;

  if (isBarred) {
    // VER-010: Barred — sent from hello@ (reply-enabled)
    await sendEmail({
      to: userInfo.email,
      subject: 'Important: Your Baby Bloom account has been restricted',
      html: `<div style="${baseStyle}">
        <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">[TBD] VER-010 — OCG Barred / Account Restricted. Account suspended due to OCG BARRED status. No resubmission possible. Contact Baby Bloom if believed to be an error.</p>
      </div>`,
      emailType: 'verification_rejected',
      recipientUserId: userId,
    });

    // VER-011: Admin notification
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@babybloomsydney.com.au';
    await sendEmail({
      to: adminEmail,
      subject: `⚠️ BARRED nanny account suspended: ${userInfo.firstName} ${userInfo.lastName}`,
      html: `<div style="${baseStyle}">
        <h1 style="color: #EF4444; font-size: 24px; margin-bottom: 16px;">⚠️ BARRED Account</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">[TBD] VER-011 — Admin Alert: Barred Account. Nanny ${userInfo.firstName} ${userInfo.lastName} (${userInfo.email}) barred by OCG. Account auto-suspended.</p>
        <p style="margin-top: 24px;"><a href="${appUrl}/admin/users" style="${btnStyle}">View in Admin</a></p>
      </div>`,
      emailType: 'admin_notification',
    });
    return;
  }

  // OCG non-cleared, non-barred results: NOT FOUND, EXPIRED, CLOSED, APPLICATION IN PROGRESS
  const emailMap: Record<string, { id: string; subject: string; summary: string; emailType: string }> = {
    'NOT FOUND': {
      id: 'VER-006',
      subject: 'Important: Your WWCC verification needs attention',
      summary: 'OCG could not find WWCC number with provided details. Nanny needs to check details and resubmit via website.',
      emailType: 'verification_rejected',
    },
    'EXPIRED': {
      id: 'VER-007',
      subject: 'Important: Your WWCC has expired',
      summary: 'OCG confirmed WWCC has expired. Nanny needs to apply for new WWCC at OCG website then resubmit.',
      emailType: 'wwcc_expired',
    },
    'CLOSED': {
      id: 'VER-008',
      subject: 'Important: Your WWCC application has been closed',
      summary: 'OCG indicated WWCC application was closed. Nanny needs to submit new application at OCG website then resubmit.',
      emailType: 'verification_rejected',
    },
    'APPLICATION IN PROGRESS': {
      id: 'VER-009',
      subject: 'Update: Your WWCC application is still being processed',
      summary: 'OCG confirmed WWCC application still being processed. No action needed from nanny — wait for OCG then resubmit.',
      emailType: 'verification_pending',
    },
  };

  const emailConfig = emailMap[ocgStatus];
  if (!emailConfig) return;

  await sendEmail({
    to: userInfo.email,
    subject: emailConfig.subject,
    html: `<div style="${baseStyle}">
      <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">[TBD] ${emailConfig.id} — ${emailConfig.summary}</p>
      <p style="margin-top: 24px;"><a href="${appUrl}/nanny/verification" style="${btnStyle}">View Details</a></p>
    </div>`,
    emailType: emailConfig.emailType,
    recipientUserId: userId,
  });
}
