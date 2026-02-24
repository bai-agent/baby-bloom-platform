-- Migration: Add OCG (Office of the Children's Guardian) audit columns to verifications table
-- Created: 2026-02-24
-- Purpose: Store official OCG verification data for government audit compliance
--
-- These columns record the EXACT data from OCG notification emails,
-- which are the official record of WWCC verification through the OCG portal.
-- This data MUST be retained for government compliance assessments.
--
-- IMPORTANT: OCG is the AUTHORITATIVE source for WWCC verification.
-- Only OCG CLEARED status can set verification_level = 4 (FULLY_VERIFIED).

-- ═══════════════════════════════════════════════════════════════
-- PART 1: OCG Audit Columns
-- ═══════════════════════════════════════════════════════════════

-- The OCG employer account ID (identifies Baby Bloom's OCG account)
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS ocg_employer_id TEXT;

-- The employer name as registered with OCG
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS ocg_employer_name TEXT;

-- The exact date/time OCG performed the verification (from their email)
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS ocg_verified_at TIMESTAMPTZ;

-- The exact result status from OCG
-- Values: CLEARED, NOT FOUND, BARRED, INTERIM BAR, APPLICATION IN PROGRESS, EXPIRED, CLOSED
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS ocg_result_status TEXT;

-- The full result description text from OCG
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS ocg_result_text TEXT;

-- The expiry date as confirmed by OCG (authoritative — may differ from user-submitted)
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS ocg_expiry_date DATE;

-- The WWCC reference number that was checked by OCG (confirms what was submitted)
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS ocg_reference_number TEXT;

-- The Google Message-ID of the OCG notification email (for locating the original email)
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS ocg_google_message_id TEXT;

-- When the OCG data was recorded in our system
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS ocg_recorded_at TIMESTAMPTZ;

-- Column documentation
COMMENT ON COLUMN verifications.ocg_employer_id IS 'OCG employer account ID from verification email';
COMMENT ON COLUMN verifications.ocg_employer_name IS 'Employer name as registered with OCG';
COMMENT ON COLUMN verifications.ocg_verified_at IS 'Date/time OCG performed the WWCC verification (authoritative)';
COMMENT ON COLUMN verifications.ocg_result_status IS 'Exact OCG result: CLEARED, NOT FOUND, BARRED, INTERIM BAR, APPLICATION IN PROGRESS, EXPIRED, CLOSED';
COMMENT ON COLUMN verifications.ocg_result_text IS 'Full OCG result description text verbatim';
COMMENT ON COLUMN verifications.ocg_expiry_date IS 'WWCC expiry date as confirmed by OCG (authoritative)';
COMMENT ON COLUMN verifications.ocg_reference_number IS 'WWCC reference number confirmed by OCG';
COMMENT ON COLUMN verifications.ocg_google_message_id IS 'Google Message-ID of the OCG notification email for audit tracing';
COMMENT ON COLUMN verifications.ocg_recorded_at IS 'Timestamp when OCG verification data was recorded in our system';

-- ═══════════════════════════════════════════════════════════════
-- PART 1B: Update wwcc_status CHECK constraint to include OCG statuses
-- ═══════════════════════════════════════════════════════════════

-- The original constraint only allowed: not_started, pending, processing,
-- doc_verified, review, rejected, failed, expired
-- We need to add: ocg_not_found, closed, application_pending, barred

ALTER TABLE verifications DROP CONSTRAINT IF EXISTS chk_wwcc_status;
ALTER TABLE verifications ADD CONSTRAINT chk_wwcc_status
  CHECK (wwcc_status IN (
    'not_started', 'pending', 'processing', 'doc_verified',
    'review', 'rejected', 'failed', 'expired',
    'ocg_not_found', 'closed', 'application_pending', 'barred'
  ));

-- ═══════════════════════════════════════════════════════════════
-- PART 2: OCG Authority Constraint
-- ═══════════════════════════════════════════════════════════════

-- FULLY_VERIFIED (status 40) can ONLY be set when OCG has confirmed CLEARED.
-- This ensures no one reaches FULLY_VERIFIED through AI checks alone.
-- The constraint allows NULL ocg_result_status for backwards compatibility with
-- any existing records, but once OCG data is set, it must be CLEARED for status 40.
ALTER TABLE verifications
  DROP CONSTRAINT IF EXISTS chk_fully_verified_requires_ocg_cleared;

ALTER TABLE verifications
  ADD CONSTRAINT chk_fully_verified_requires_ocg_cleared
  CHECK (
    verification_status != 40
    OR ocg_result_status = 'CLEARED'
    OR ocg_result_status IS NULL  -- allow legacy records without OCG data
  );

-- ═══════════════════════════════════════════════════════════════
-- PART 3: OCG Authority Trigger — Auto-sync nannies table
-- ═══════════════════════════════════════════════════════════════

-- When OCG result is recorded on a verification, automatically update the
-- corresponding nannies row. This is the database-level enforcement that
-- OCG is the authoritative source for verification level.

CREATE OR REPLACE FUNCTION sync_nanny_from_ocg_result()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when ocg_result_status is newly set or changed
  IF NEW.ocg_result_status IS NOT NULL
     AND (OLD.ocg_result_status IS NULL OR OLD.ocg_result_status != NEW.ocg_result_status) THEN

    IF NEW.ocg_result_status = 'CLEARED' THEN
      -- OCG CLEARED → fully verified, active
      UPDATE nannies SET
        wwcc_verified = TRUE,
        identity_verified = TRUE,
        verification_level = 4,
        status = 'active',
        updated_at = NOW()
      WHERE user_id = NEW.user_id;

    ELSIF NEW.ocg_result_status IN ('BARRED', 'INTERIM BAR') THEN
      -- BARRED → suspended, level 0
      UPDATE nannies SET
        wwcc_verified = FALSE,
        verification_level = 0,
        status = 'suspended',
        updated_at = NOW()
      WHERE user_id = NEW.user_id;

    ELSIF NEW.ocg_result_status IN ('NOT FOUND', 'EXPIRED', 'CLOSED', 'APPLICATION IN PROGRESS') THEN
      -- Resubmit required → downgrade to ID_VERIFIED
      UPDATE nannies SET
        wwcc_verified = FALSE,
        verification_level = 2,
        updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_nanny_from_ocg ON verifications;
CREATE TRIGGER trg_sync_nanny_from_ocg
  AFTER INSERT OR UPDATE OF ocg_result_status ON verifications
  FOR EACH ROW
  EXECUTE FUNCTION sync_nanny_from_ocg_result();

-- ═══════════════════════════════════════════════════════════════
-- PART 4: Update expiry cron to use OCG authoritative expiry date
-- ═══════════════════════════════════════════════════════════════

-- Replace the existing check_wwcc_expiry function to also check ocg_expiry_date
-- (The OCG expiry is the authoritative one when available)
CREATE OR REPLACE FUNCTION check_wwcc_expiry()
RETURNS void AS $$
DECLARE
  expired_record RECORD;
BEGIN
  -- Find nannies with expired WWCC (check both legacy and OCG expiry dates)
  FOR expired_record IN
    SELECT v.id AS verification_id, v.user_id,
           COALESCE(v.ocg_expiry_date, v.wwcc_expiry_date) AS effective_expiry
    FROM verifications v
    JOIN nannies n ON n.user_id = v.user_id
    WHERE n.wwcc_verified = TRUE
      AND COALESCE(v.ocg_expiry_date, v.wwcc_expiry_date) <= CURRENT_DATE
  LOOP
    -- Update verification
    UPDATE verifications SET
      verification_status = 23,  -- WWCC_EXPIRED
      wwcc_status = 'expired',
      wwcc_verified = FALSE,
      updated_at = NOW()
    WHERE id = expired_record.verification_id;

    -- Update nanny (trigger will also fire, but explicit is clearer)
    UPDATE nannies SET
      wwcc_verified = FALSE,
      verification_level = 2,  -- ID_VERIFIED
      updated_at = NOW()
    WHERE user_id = expired_record.user_id;

    -- Audit log
    INSERT INTO activity_logs (user_id, action, details, created_at)
    VALUES (
      expired_record.user_id,
      'wwcc_expired',
      jsonb_build_object(
        'verification_id', expired_record.verification_id,
        'expiry_date', expired_record.effective_expiry,
        'source', CASE
          WHEN (SELECT ocg_expiry_date FROM verifications WHERE id = expired_record.verification_id) IS NOT NULL
          THEN 'ocg_authoritative'
          ELSE 'document_extracted'
        END
      ),
      NOW()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- DOWN MIGRATION (reference only — do not run)
-- ═══════════════════════════════════════════════════════════════

-- DROP TRIGGER IF EXISTS trg_sync_nanny_from_ocg ON verifications;
-- DROP FUNCTION IF EXISTS sync_nanny_from_ocg_result();
-- ALTER TABLE verifications DROP CONSTRAINT IF EXISTS chk_fully_verified_requires_ocg_cleared;
-- ALTER TABLE verifications DROP COLUMN IF EXISTS ocg_employer_id;
-- ALTER TABLE verifications DROP COLUMN IF EXISTS ocg_employer_name;
-- ALTER TABLE verifications DROP COLUMN IF EXISTS ocg_verified_at;
-- ALTER TABLE verifications DROP COLUMN IF EXISTS ocg_result_status;
-- ALTER TABLE verifications DROP COLUMN IF EXISTS ocg_result_text;
-- ALTER TABLE verifications DROP COLUMN IF EXISTS ocg_expiry_date;
-- ALTER TABLE verifications DROP COLUMN IF EXISTS ocg_reference_number;
-- ALTER TABLE verifications DROP COLUMN IF EXISTS ocg_google_message_id;
-- ALTER TABLE verifications DROP COLUMN IF EXISTS ocg_recorded_at;
