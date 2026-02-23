import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { VERIFICATION_STATUS } from '@/lib/verification';

// If status 10 or 20 has been stuck for this long, auto-escalate to manual review.
// This is the safety net for pipeline timeouts / Vercel hard-kills.
const STALE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ status: null }, { status: 401 });
  }

  const { data } = await supabase
    .from('verifications')
    .select('verification_status, updated_at')
    .eq('user_id', user.id)
    .single();

  if (!data) {
    return NextResponse.json({ status: null });
  }

  let status = data.verification_status;

  // Staleness safety net: if auto-check status has been stuck too long,
  // the pipeline likely died (Vercel timeout, OpenAI hang, etc.).
  // Auto-escalate to manual review so the user isn't stuck forever.
  if (status === VERIFICATION_STATUS.PENDING_ID_AUTO || status === VERIFICATION_STATUS.PENDING_WWCC_AUTO) {
    const updatedAt = new Date(data.updated_at).getTime();
    const stuckMs = Date.now() - updatedAt;

    if (stuckMs > STALE_THRESHOLD_MS) {
      const adminClient = createAdminClient();
      const newStatus = status === VERIFICATION_STATUS.PENDING_ID_AUTO
        ? VERIFICATION_STATUS.PENDING_ID_REVIEW
        : VERIFICATION_STATUS.PENDING_WWCC_REVIEW;
      const issueField = status === VERIFICATION_STATUS.PENDING_ID_AUTO
        ? 'identity_ai_issues'
        : 'wwcc_ai_issues';

      await adminClient.from('verifications').update({
        verification_status: newStatus,
        [issueField]: JSON.stringify(['Auto-check timed out — escalated to manual review']),
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);

      console.log(`[verification-status] Stale status ${status} for user ${user.id} — escalated to ${newStatus}`);
      status = newStatus;
    }
  }

  return NextResponse.json({ status });
}
