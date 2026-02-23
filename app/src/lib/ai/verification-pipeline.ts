import { createAdminClient } from '@/lib/supabase/admin';
import { VERIFICATION_STATUS, VERIFICATION_LEVEL } from '@/lib/verification';
import { verifyPassport } from './verify-passport';
import { verifyWWCC } from './verify-wwcc';
import { verifyWWCCPdf } from './verify-wwcc-pdf';

/** Race a promise against a timeout. Throws on timeout so catch block handles it. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

const PASSPORT_AI_TIMEOUT = 30_000;  // 30s for OpenAI vision
const WWCC_AI_TIMEOUT = 25_000;      // 25s for OpenAI WWCC check
const PDF_DOWNLOAD_TIMEOUT = 10_000; // 10s for PDF download
const PDF_PARSE_TIMEOUT = 10_000;    // 10s for PDF parsing

/**
 * Phase 1: Passport verification only.
 * Called when status = 10 (Pending ID Auto).
 * Result: status → 20 (pass) or 11 (fail/flag).
 */
export async function runPassportPhase(verificationId: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    const { data: verification, error: fetchErr } = await supabase
      .from('verifications')
      .select('*')
      .eq('id', verificationId)
      .single();

    if (fetchErr || !verification) {
      console.error('[Passport] Could not fetch verification:', fetchErr?.message);
      return;
    }

    // Only run if status is 10
    if (verification.verification_status !== VERIFICATION_STATUS.PENDING_ID_AUTO) {
      console.log(`[Passport] Skipping — status is ${verification.verification_status}, not 10`);
      return;
    }

    const passportPath = verification.passport_upload_url;
    const selfiePath = verification.identification_photo_url;

    if (!passportPath || !selfiePath) {
      await supabase.from('verifications').update({
        verification_status: VERIFICATION_STATUS.PENDING_ID_REVIEW,
        identity_ai_issues: JSON.stringify(['Missing passport or selfie file']),
        updated_at: new Date().toISOString(),
      }).eq('id', verificationId);
      return;
    }

    const [passportUrlResult, selfieUrlResult] = await Promise.all([
      supabase.storage.from('verification-documents').createSignedUrl(passportPath, 3600),
      supabase.storage.from('verification-documents').createSignedUrl(selfiePath, 3600),
    ]);

    if (passportUrlResult.error || selfieUrlResult.error || !passportUrlResult.data?.signedUrl || !selfieUrlResult.data?.signedUrl) {
      await supabase.from('verifications').update({
        verification_status: VERIFICATION_STATUS.PENDING_ID_REVIEW,
        identity_ai_issues: JSON.stringify(['Could not generate signed URLs for documents']),
        updated_at: new Date().toISOString(),
      }).eq('id', verificationId);
      return;
    }

    const passportResult = await withTimeout(
      verifyPassport(
        passportUrlResult.data.signedUrl,
        selfieUrlResult.data.signedUrl,
        {
          surname: verification.surname ?? '',
          given_names: verification.given_names ?? '',
          date_of_birth: verification.date_of_birth ?? '',
          passport_country: verification.passport_country ?? '',
        }
      ),
      PASSPORT_AI_TIMEOUT,
      'Passport AI verification'
    );

    // Write passport AI results
    await supabase.from('verifications').update({
      extracted_surname: passportResult.extracted.surname,
      extracted_given_names: passportResult.extracted.given_names,
      extracted_dob: passportResult.extracted.dob,
      extracted_nationality: passportResult.extracted.nationality,
      extracted_passport_number: passportResult.extracted.passport_number,
      extracted_passport_expiry: passportResult.extracted.expiry,
      identity_ai_reasoning: passportResult.reasoning,
      identity_ai_issues: JSON.stringify(passportResult.issues),
      updated_at: new Date().toISOString(),
    }).eq('id', verificationId);

    if (!passportResult.pass) {
      await supabase.from('verifications').update({
        verification_status: VERIFICATION_STATUS.PENDING_ID_REVIEW,
        updated_at: new Date().toISOString(),
      }).eq('id', verificationId);
      console.log(`[Passport] FAILED → status 11`);
      return;
    }

    // Passport passed → status 20, level 2
    await supabase.from('verifications').update({
      identity_verified: true,
      identity_verified_at: new Date().toISOString(),
      verification_status: VERIFICATION_STATUS.PENDING_WWCC_AUTO,
      updated_at: new Date().toISOString(),
    }).eq('id', verificationId);

    await supabase.from('nannies').update({
      identity_verified: true,
      verification_level: VERIFICATION_LEVEL.ID_VERIFIED,
      updated_at: new Date().toISOString(),
    }).eq('user_id', verification.user_id);

    console.log(`[Passport] PASSED → status 20, level 2`);

  } catch (error) {
    console.error('[Passport] Error:', error);
    try {
      await supabase.from('verifications').update({
        verification_status: VERIFICATION_STATUS.PENDING_ID_REVIEW,
        identity_ai_issues: JSON.stringify([`Passport check error: ${error instanceof Error ? error.message : 'Unknown'}`]),
        updated_at: new Date().toISOString(),
      }).eq('id', verificationId);
    } catch { /* best-effort */ }
  }
}

/**
 * Phase 2: WWCC verification only.
 * Called when status = 20 (Pending WWCC Auto).
 * Result: status → 30 (pass) or 21 (manual review) or 24 (document failed).
 */
export async function runWWCCPhase(verificationId: string): Promise<void> {
  const supabase = createAdminClient();

  try {
    const { data: verification, error: fetchErr } = await supabase
      .from('verifications')
      .select('*')
      .eq('id', verificationId)
      .single();

    if (fetchErr || !verification) {
      console.error('[WWCC] Could not fetch verification:', fetchErr?.message);
      return;
    }

    // Atomic claim: only one invocation can proceed.
    // UPDATE WHERE status=20 ensures if two calls race, only one wins.
    const { data: claimed } = await supabase
      .from('verifications')
      .update({ verification_status: VERIFICATION_STATUS.WWCC_PROCESSING })
      .eq('id', verificationId)
      .eq('verification_status', VERIFICATION_STATUS.PENDING_WWCC_AUTO)
      .select('id')
      .single();

    if (!claimed) {
      console.log(`[WWCC] Skipping — could not claim (status was ${verification.verification_status})`);
      return;
    }

    const wwccMethod = verification.wwcc_verification_method as string | null;

    if (wwccMethod === 'manual_entry') {
      await supabase.from('verifications').update({
        verification_status: VERIFICATION_STATUS.PENDING_WWCC_REVIEW,
        updated_at: new Date().toISOString(),
      }).eq('id', verificationId);
      return;
    }

    const wwccDocPath = wwccMethod === 'grant_email'
      ? verification.wwcc_grant_email_url
      : verification.wwcc_service_nsw_screenshot_url;

    if (!wwccDocPath || !wwccMethod) {
      await supabase.from('verifications').update({
        verification_status: VERIFICATION_STATUS.PENDING_WWCC_REVIEW,
        wwcc_ai_issues: JSON.stringify(['Missing WWCC document']),
        updated_at: new Date().toISOString(),
      }).eq('id', verificationId);
      return;
    }

    const isPdf = wwccDocPath.toLowerCase().endsWith('.pdf');

    const wwccUrlResult = await supabase.storage
      .from('verification-documents')
      .createSignedUrl(wwccDocPath, 3600);

    if (wwccUrlResult.error || !wwccUrlResult.data?.signedUrl) {
      await supabase.from('verifications').update({
        verification_status: VERIFICATION_STATUS.PENDING_WWCC_REVIEW,
        wwcc_ai_issues: JSON.stringify(['Could not generate signed URL for WWCC document']),
        updated_at: new Date().toISOString(),
      }).eq('id', verificationId);
      return;
    }

    const wwccSubmitted = {
      surname: verification.surname ?? '',
      given_names: verification.given_names ?? '',
      wwcc_number: verification.wwcc_number ?? '',
    };

    let wwccResult;
    if (isPdf && wwccMethod === 'grant_email') {
      const pdfResponse = await withTimeout(
        fetch(wwccUrlResult.data.signedUrl),
        PDF_DOWNLOAD_TIMEOUT,
        'WWCC PDF download'
      );
      if (!pdfResponse.ok) {
        await supabase.from('verifications').update({
          verification_status: VERIFICATION_STATUS.PENDING_WWCC_REVIEW,
          wwcc_ai_issues: JSON.stringify(['Could not download WWCC PDF document']),
          updated_at: new Date().toISOString(),
        }).eq('id', verificationId);
        return;
      }
      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

      const pdfResult = await withTimeout(
        verifyWWCCPdf(pdfBuffer, wwccSubmitted),
        PDF_PARSE_TIMEOUT,
        'WWCC PDF parsing'
      );

      if (pdfResult.needsAIFallback) {
        console.log('[WWCC] PDF parser needs fallback, trying AI vision...');
        wwccResult = await withTimeout(
          verifyWWCC(wwccUrlResult.data.signedUrl, 'grant_email', wwccSubmitted, true),
          WWCC_AI_TIMEOUT,
          'WWCC AI verification (fallback)'
        );
      } else {
        wwccResult = pdfResult;
      }
    } else {
      wwccResult = await withTimeout(
        verifyWWCC(wwccUrlResult.data.signedUrl, wwccMethod as 'grant_email' | 'service_nsw_app', wwccSubmitted, isPdf),
        WWCC_AI_TIMEOUT,
        'WWCC AI verification'
      );
    }

    // Write WWCC extraction results
    await supabase.from('verifications').update({
      extracted_wwcc_surname: wwccResult.extracted.surname,
      extracted_wwcc_first_name: wwccResult.extracted.first_name,
      extracted_wwcc_other_names: wwccResult.extracted.other_names,
      extracted_wwcc_number: wwccResult.extracted.wwcc_number,
      extracted_wwcc_clearance_type: wwccResult.extracted.clearance_type,
      extracted_wwcc_expiry: wwccResult.extracted.expiry,
      wwcc_ai_reasoning: wwccResult.reasoning,
      wwcc_ai_issues: JSON.stringify(wwccResult.issues),
      ...(wwccResult.extracted.wwcc_number ? { wwcc_number: wwccResult.extracted.wwcc_number } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', verificationId);

    if (!wwccResult.pass) {
      await supabase.from('verifications').update({
        verification_status: VERIFICATION_STATUS.WWCC_DOCUMENT_FAILED,
        updated_at: new Date().toISOString(),
      }).eq('id', verificationId);
      console.log(`[WWCC] Document check FAILED → status 24`);
      return;
    }

    // Identity cross-check: WWCC surname must match passport-verified surname
    const verifiedSurname = (verification.extracted_surname ?? '').toLowerCase().trim();
    const wwccSurname = (wwccResult.extracted.surname ?? '').toLowerCase().trim();

    if (verifiedSurname && wwccSurname && verifiedSurname !== wwccSurname) {
      console.log(`[WWCC] Surname mismatch: passport="${verifiedSurname}" wwcc="${wwccSurname}"`);
      await supabase.from('verifications').update({
        verification_status: VERIFICATION_STATUS.PENDING_WWCC_REVIEW,
        wwcc_ai_reasoning: `Name mismatch: passport says "${verification.extracted_surname}" but WWCC says "${wwccResult.extracted.surname}". ${wwccResult.reasoning}`,
        wwcc_ai_issues: JSON.stringify([
          `Surname mismatch: passport "${verification.extracted_surname}" vs WWCC "${wwccResult.extracted.surname}"`,
          ...wwccResult.issues,
        ]),
        updated_at: new Date().toISOString(),
      }).eq('id', verificationId);
      return;
    }

    // WWCC passed + identity matches → status 30, level 3
    await supabase.from('verifications').update({
      verification_status: VERIFICATION_STATUS.PROVISIONALLY_VERIFIED,
      wwcc_expiry_date: wwccResult.extracted.expiry,
      updated_at: new Date().toISOString(),
    }).eq('id', verificationId);

    await supabase.from('nannies').update({
      verification_level: VERIFICATION_LEVEL.PROVISIONALLY_VERIFIED,
      updated_at: new Date().toISOString(),
    }).eq('user_id', verification.user_id);

    console.log(`[WWCC] PASSED → status 30, level 3`);

  } catch (error) {
    console.error('[WWCC] Error:', error);
    try {
      await supabase.from('verifications').update({
        verification_status: VERIFICATION_STATUS.PENDING_WWCC_REVIEW,
        wwcc_ai_issues: JSON.stringify([`WWCC check error: ${error instanceof Error ? error.message : 'Unknown'}`]),
        updated_at: new Date().toISOString(),
      }).eq('id', verificationId);
    } catch { /* best-effort */ }
  }
}

/**
 * Legacy wrapper — routes to the correct phase based on current status.
 */
export async function runVerificationPipeline(verificationId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('verifications')
    .select('verification_status').eq('id', verificationId).single();

  const status = data?.verification_status;

  if (status === VERIFICATION_STATUS.PENDING_ID_AUTO) {
    await runPassportPhase(verificationId);
  } else if (status === VERIFICATION_STATUS.PENDING_WWCC_AUTO) {
    await runWWCCPhase(verificationId);
  } else {
    console.log(`[Pipeline] No action for status ${status}`);
  }
}
