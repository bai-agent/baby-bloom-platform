import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { VERIFICATION_STATUS, VERIFICATION_LEVEL } from '@/lib/verification';
import { parseOCGEmail } from '@/lib/verification/parse-ocg-email';

// Result status → action mapping
const CLEARED_STATUSES = ['CLEARED'];
const REJECTED_STATUSES = ['NOT FOUND', 'BARRED', 'INTERIM BAR'];
const IGNORED_STATUSES = ['APPLICATION IN PROGRESS'];

export async function POST(request: NextRequest) {
  // ── 1. Auth check ──
  const authHeader = request.headers.get('authorization');
  const secret = process.env.OCG_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[OCG Webhook] OCG_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Extract HTML from request body ──
  let html: string | undefined;
  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      html = formData.get('html')?.toString();
    } else {
      const body = await request.json();
      html = body.html;
    }
  } catch {
    return NextResponse.json({ error: 'Could not parse request body' }, { status: 400 });
  }

  if (!html) {
    return NextResponse.json({ error: 'Missing html field' }, { status: 400 });
  }

  // ── 4. Parse OCG email HTML ──
  let parsed;
  try {
    parsed = parseOCGEmail(html);
  } catch (err) {
    console.error('[OCG Webhook] Failed to parse email HTML:', err);
    return NextResponse.json({ error: 'Failed to parse email' }, { status: 422 });
  }

  if (parsed.results.length === 0) {
    console.warn('[OCG Webhook] No results found in email');
    return NextResponse.json({ error: 'No results in email' }, { status: 422 });
  }

  // ── 5. Process each result row ──
  const supabase = createAdminClient();
  const processedResults: Array<{
    reference_number: string;
    result_status: string;
    action: string;
    verification_id?: string;
    error?: string;
  }> = [];

  for (const result of parsed.results) {
    const wwccNumber = result.reference_number.trim().toUpperCase();

    // Skip results with no WWCC number
    if (!wwccNumber) {
      processedResults.push({
        reference_number: '',
        result_status: result.result_status,
        action: 'skipped',
        error: 'No reference number',
      });
      continue;
    }

    // Skip statuses we don't act on
    if (IGNORED_STATUSES.includes(result.result_status)) {
      console.log(`[OCG Webhook] ${wwccNumber}: ${result.result_status} — no action`);
      processedResults.push({
        reference_number: wwccNumber,
        result_status: result.result_status,
        action: 'ignored',
      });
      continue;
    }

    // Look up verification record by WWCC number (check both columns)
    // Only match records awaiting OCG confirmation (status 30 or 21)
    const { data: verification, error: fetchErr } = await supabase
      .from('verifications')
      .select('id, user_id, verification_status')
      .or(`wwcc_number.ilike.${wwccNumber},extracted_wwcc_number.ilike.${wwccNumber}`)
      .in('verification_status', [
        VERIFICATION_STATUS.PROVISIONALLY_VERIFIED,
        VERIFICATION_STATUS.PENDING_WWCC_REVIEW,
      ])
      .limit(1)
      .single();

    if (fetchErr || !verification) {
      console.warn(`[OCG Webhook] No matching verification for ${wwccNumber}`);
      processedResults.push({
        reference_number: wwccNumber,
        result_status: result.result_status,
        action: 'no_match',
        error: 'No verification record found',
      });
      continue;
    }

    // ── CLEARED ──
    if (CLEARED_STATUSES.includes(result.result_status)) {
      const { error: updateVerErr } = await supabase
        .from('verifications')
        .update({
          verification_status: VERIFICATION_STATUS.FULLY_VERIFIED,
          wwcc_verified: true,
          wwcc_verified_at: new Date().toISOString(),
          wwcc_expiry_date: result.expiry_date,
          wwcc_ai_reasoning: `OCG Portal: ${result.result_text}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', verification.id);

      if (updateVerErr) {
        console.error(`[OCG Webhook] Failed to update verification ${verification.id}:`, updateVerErr);
        processedResults.push({
          reference_number: wwccNumber,
          result_status: result.result_status,
          action: 'error',
          verification_id: verification.id,
          error: updateVerErr.message,
        });
        continue;
      }

      const { error: updateNannyErr } = await supabase
        .from('nannies')
        .update({
          wwcc_verified: true,
          identity_verified: true,
          verification_level: VERIFICATION_LEVEL.FULLY_VERIFIED,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', verification.user_id);

      if (updateNannyErr) {
        console.error(`[OCG Webhook] Failed to update nanny for user ${verification.user_id}:`, updateNannyErr);
      }

      console.log(`[OCG Webhook] ${wwccNumber}: CLEARED → status 40, level 4`);
      processedResults.push({
        reference_number: wwccNumber,
        result_status: result.result_status,
        action: 'cleared',
        verification_id: verification.id,
      });
    }

    // ── NOT FOUND / BARRED / INTERIM BAR ──
    else if (REJECTED_STATUSES.includes(result.result_status)) {
      const { error: updateVerErr } = await supabase
        .from('verifications')
        .update({
          verification_status: VERIFICATION_STATUS.WWCC_REJECTED,
          wwcc_rejection_reason: `OCG Portal: ${result.result_status} — ${result.result_text}`,
          wwcc_ai_reasoning: `OCG Portal: ${result.result_text}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', verification.id);

      if (updateVerErr) {
        console.error(`[OCG Webhook] Failed to update verification ${verification.id}:`, updateVerErr);
        processedResults.push({
          reference_number: wwccNumber,
          result_status: result.result_status,
          action: 'error',
          verification_id: verification.id,
          error: updateVerErr.message,
        });
        continue;
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
        console.error(`[OCG Webhook] Failed to update nanny for user ${verification.user_id}:`, updateNannyErr);
      }

      console.log(`[OCG Webhook] ${wwccNumber}: ${result.result_status} → status 22, level 2`);
      processedResults.push({
        reference_number: wwccNumber,
        result_status: result.result_status,
        action: 'rejected',
        verification_id: verification.id,
      });
    }

    // ── Unknown status ──
    else {
      console.warn(`[OCG Webhook] Unknown result status for ${wwccNumber}: ${result.result_status}`);
      processedResults.push({
        reference_number: wwccNumber,
        result_status: result.result_status,
        action: 'unknown_status',
      });
    }
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
