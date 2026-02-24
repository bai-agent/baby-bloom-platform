-- Migration: Per-Section Verification Status Columns
-- Run this in Supabase SQL Editor before deploying code changes.
--
-- Adds independent status tracking for each verification section:
--   identity_status, wwcc_status, contact_status, cross_check_status
-- Keeps legacy verification_status INTEGER for backward compatibility.

BEGIN;

-- ── Per-section status columns ──

ALTER TABLE verifications ADD COLUMN IF NOT EXISTS identity_status TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS wwcc_status TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS contact_status TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS cross_check_status TEXT NOT NULL DEFAULT 'not_started';

-- ── Per-section timestamps (for staleness detection) ──

ALTER TABLE verifications ADD COLUMN IF NOT EXISTS identity_status_at TIMESTAMPTZ;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS wwcc_status_at TIMESTAMPTZ;

-- ── WWCC doc verification tracking (separate from cross-check) ──

ALTER TABLE verifications ADD COLUMN IF NOT EXISTS wwcc_doc_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS wwcc_doc_verified_at TIMESTAMPTZ;

-- ── Cross-check tracking ──

ALTER TABLE verifications ADD COLUMN IF NOT EXISTS cross_check_reasoning TEXT;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS cross_check_issues JSONB;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS cross_check_at TIMESTAMPTZ;

-- ── User-facing guidance for failures (populated by AI or hardcoded) ──

ALTER TABLE verifications ADD COLUMN IF NOT EXISTS identity_user_guidance JSONB;
ALTER TABLE verifications ADD COLUMN IF NOT EXISTS wwcc_user_guidance JSONB;

-- ── CHECK constraints for valid status values ──

ALTER TABLE verifications ADD CONSTRAINT chk_identity_status
  CHECK (identity_status IN ('not_started', 'pending', 'processing', 'verified', 'review', 'rejected', 'failed'));

ALTER TABLE verifications ADD CONSTRAINT chk_wwcc_status
  CHECK (wwcc_status IN ('not_started', 'pending', 'processing', 'doc_verified', 'review', 'rejected', 'failed', 'expired'));

ALTER TABLE verifications ADD CONSTRAINT chk_contact_status
  CHECK (contact_status IN ('not_started', 'saved'));

ALTER TABLE verifications ADD CONSTRAINT chk_cross_check_status
  CHECK (cross_check_status IN ('not_started', 'pending', 'processing', 'passed', 'review'));

-- ── Backfill existing records based on legacy verification_status ──

UPDATE verifications SET
  identity_status = CASE
    WHEN verification_status = 10 THEN 'pending'
    WHEN verification_status = 11 THEN 'review'
    WHEN verification_status = 12 THEN 'rejected'
    WHEN verification_status >= 20 THEN 'verified'
    ELSE 'not_started'
  END,
  identity_status_at = CASE
    WHEN verification_status >= 10 THEN updated_at
    ELSE NULL
  END,
  wwcc_status = CASE
    WHEN verification_status IN (20, 25) THEN 'pending'
    WHEN verification_status = 21 THEN 'review'
    WHEN verification_status = 22 THEN 'rejected'
    WHEN verification_status = 23 THEN 'expired'
    WHEN verification_status = 24 THEN 'failed'
    WHEN verification_status >= 30 THEN 'doc_verified'
    ELSE 'not_started'
  END,
  wwcc_status_at = CASE
    WHEN verification_status >= 20 THEN updated_at
    ELSE NULL
  END,
  contact_status = CASE
    WHEN phone_number IS NOT NULL THEN 'saved'
    ELSE 'not_started'
  END,
  cross_check_status = CASE
    WHEN verification_status >= 30 THEN 'passed'
    ELSE 'not_started'
  END,
  cross_check_at = CASE
    WHEN verification_status >= 30 THEN updated_at
    ELSE NULL
  END,
  wwcc_doc_verified = (verification_status >= 30),
  wwcc_doc_verified_at = CASE
    WHEN verification_status >= 30 THEN updated_at
    ELSE NULL
  END;

COMMIT;
