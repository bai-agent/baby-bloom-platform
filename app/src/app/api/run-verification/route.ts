import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runPassportPhase, runWWCCPhase } from '@/lib/ai/verification-pipeline';
import { VERIFICATION_STATUS } from '@/lib/verification';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const admin = createAdminClient();

  let verificationId: string | null = null;
  let phase: string | null = null;
  try {
    const body = await request.json();
    verificationId = body.verificationId ?? null;
    phase = body.phase ?? null;
  } catch { /* no body */ }

  if (!verificationId) {
    const { data, error } = await admin
      .from('verifications')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'No verification record found' }, { status: 404 });
    }
    verificationId = data.id;
  }

  const vid = verificationId as string;

  try {
    // Step 1 trigger: run passport, then chain to WWCC if data is ready
    if (phase === 'identity') {
      await runPassportPhase(vid);

      const { data: fresh } = await admin
        .from('verifications')
        .select('verification_status, wwcc_verification_method')
        .eq('id', vid)
        .single();

      if (fresh?.verification_status === VERIFICATION_STATUS.PENDING_WWCC_AUTO
          && fresh.wwcc_verification_method) {
        await runWWCCPhase(vid);
      }
      return NextResponse.json({ ok: true });
    }

    // Step 2 trigger: run WWCC only (passport already handled by Step 1)
    if (phase === 'wwcc') {
      const { data: fresh } = await admin
        .from('verifications')
        .select('verification_status, wwcc_verification_method')
        .eq('id', vid)
        .single();

      if (fresh?.verification_status === VERIFICATION_STATUS.PENDING_WWCC_AUTO
          && fresh.wwcc_verification_method) {
        await runWWCCPhase(vid);
      }
      return NextResponse.json({ ok: true });
    }

    // No phase (legacy/manual trigger): run both sequentially
    await runPassportPhase(vid);
    const { data: fresh } = await admin
      .from('verifications')
      .select('verification_status, wwcc_verification_method')
      .eq('id', vid)
      .single();
    if (fresh?.verification_status === VERIFICATION_STATUS.PENDING_WWCC_AUTO
        && fresh.wwcc_verification_method) {
      await runWWCCPhase(vid);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[run-verification] Pipeline error:', err);
    return NextResponse.json({ error: 'Pipeline failed' }, { status: 500 });
  }
}
