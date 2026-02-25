import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import { getUserEmailInfo } from '@/lib/email/helpers';

/**
 * Cron endpoint: checks for verification failures older than 10 minutes
 * where the user has NOT taken any further action (updated_at unchanged).
 * Sends VER-002 (identity failed) and VER-003 (WWCC failed) emails.
 *
 * Called by Vercel Cron every 5 minutes (see vercel.json).
 * Also callable manually: GET /api/cron/send-delayed-emails
 */
export async function GET(request: NextRequest) {
  // Optional: protect with a cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app-babybloom.vercel.app';
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const baseStyle = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;`;
  const btnStyle = `background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;`;

  let sent = 0;
  let skipped = 0;

  // ── VER-002: Identity failed, no action in 10 minutes ──
  const { data: identityFailed } = await supabase
    .from('verifications')
    .select('id, user_id, identity_status_at, updated_at')
    .eq('identity_status', 'failed')
    .lt('identity_status_at', tenMinutesAgo);

  for (const v of identityFailed ?? []) {
    // Check no action taken: updated_at should equal identity_status_at (within 2s tolerance)
    const statusAt = new Date(v.identity_status_at).getTime();
    const updatedAt = new Date(v.updated_at).getTime();
    if (Math.abs(updatedAt - statusAt) > 2000) {
      // User has taken action since the failure — skip
      skipped++;
      continue;
    }

    // Check we haven't already sent this email (deduplicate)
    const { count } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_user_id', v.user_id)
      .eq('email_type', 'verification_rejected')
      .gte('created_at', v.identity_status_at);

    if (count && count > 0) {
      skipped++;
      continue;
    }

    const userInfo = await getUserEmailInfo(v.user_id);
    if (!userInfo) continue;

    await sendEmail({
      to: userInfo.email,
      subject: 'Action needed: Your identity verification',
      html: `<div style="${baseStyle}">
        <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">[TBD] VER-002 — Identity Verification Failed (delayed 10min). ID check needs attention. No failure details in email — directs to website for guidance and resubmission.</p>
        <p style="margin-top: 24px;"><a href="${appUrl}/nanny/verification" style="${btnStyle}">Fix It Now</a></p>
      </div>`,
      emailType: 'verification_rejected',
      recipientUserId: v.user_id,
    });
    sent++;
  }

  // ── VER-003: WWCC failed, no action in 10 minutes ──
  const { data: wwccFailed } = await supabase
    .from('verifications')
    .select('id, user_id, wwcc_status_at, updated_at')
    .eq('wwcc_status', 'failed')
    .lt('wwcc_status_at', tenMinutesAgo);

  for (const v of wwccFailed ?? []) {
    const statusAt = new Date(v.wwcc_status_at).getTime();
    const updatedAt = new Date(v.updated_at).getTime();
    if (Math.abs(updatedAt - statusAt) > 2000) {
      skipped++;
      continue;
    }

    const { count } = await supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_user_id', v.user_id)
      .eq('email_type', 'verification_rejected')
      .gte('created_at', v.wwcc_status_at);

    if (count && count > 0) {
      skipped++;
      continue;
    }

    const userInfo = await getUserEmailInfo(v.user_id);
    if (!userInfo) continue;

    await sendEmail({
      to: userInfo.email,
      subject: 'Action needed: Your WWCC verification',
      html: `<div style="${baseStyle}">
        <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">[TBD] VER-003 — WWCC Verification Failed (delayed 10min). WWCC check needs attention. No failure details in email — directs to website for guidance and resubmission.</p>
        <p style="margin-top: 24px;"><a href="${appUrl}/nanny/verification" style="${btnStyle}">Fix It Now</a></p>
      </div>`,
      emailType: 'verification_rejected',
      recipientUserId: v.user_id,
    });
    sent++;
  }

  console.log(`[Delayed Emails] Sent: ${sent}, Skipped: ${skipped}`);
  return NextResponse.json({ sent, skipped });
}
