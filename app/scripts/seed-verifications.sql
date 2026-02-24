-- ============================================================
-- SEED: Verification test data for admin dashboard testing
-- Run via Supabase SQL editor
-- Safe to re-run (clears existing verification records first)
-- ============================================================
--
-- Verification funnel (sequential, never parallel):
--   1. Address → always passes, stored to user_profiles
--   2. ID (passport + selfie) → manual admin review
--   3. WWCC → only checked AFTER ID passes → manual admin review
--
-- Valid states:
--   A) Pending ID review (WWCC not yet checked)
--   B) ID failed / rejected (must redo ID, account inactive)
--   C) ID verified, pending WWCC review
--   D) ID verified, WWCC failed (must redo WWCC only, account inactive)
--   E) Fully verified (both passed)
-- ============================================================

-- Clear existing verification records for nannies
DELETE FROM verifications
WHERE user_id IN (SELECT user_id FROM nannies);

-- Assign 5 different scenarios to the first 5 nannies
WITH numbered_nannies AS (
  SELECT
    n.user_id,
    up.first_name,
    up.last_name,
    up.date_of_birth,
    ROW_NUMBER() OVER (ORDER BY n.created_at) AS rn
  FROM nannies n
  JOIN user_profiles up ON up.user_id = n.user_id
  LIMIT 5
)
INSERT INTO verifications (
  user_id,
  -- WWCC fields
  wwcc_verification_method, wwcc_number, wwcc_declaration,
  wwcc_verified, wwcc_expiry_date, wwcc_rejection_reason,
  -- Identity fields
  surname, given_names, date_of_birth, passport_country,
  passport_upload_url, identification_photo_url, passport_declaration,
  identity_verified, identity_rejection_reason,
  -- Overall
  verification_status,
  created_at
)
SELECT
  nn.user_id,

  -- ── WWCC fields ──
  -- Only scenarios C, D, E have WWCC data (ID must pass first)
  CASE WHEN nn.rn IN (3, 4, 5) THEN 'manual_entry' ELSE NULL END,
  CASE
    WHEN nn.rn = 3 THEN 'WWC0067890E'
    WHEN nn.rn = 4 THEN 'WWC0099999E'
    WHEN nn.rn = 5 THEN 'WWC0054321E'
    ELSE NULL
  END,
  CASE WHEN nn.rn IN (3, 4, 5) THEN true ELSE false END,
  -- wwcc_verified (only scenario E)
  CASE WHEN nn.rn = 5 THEN true ELSE false END,
  -- wwcc_expiry_date
  CASE WHEN nn.rn = 5 THEN (CURRENT_DATE + INTERVAL '4 years')::DATE ELSE NULL END,
  -- wwcc_rejection_reason (scenario D = WWCC failed)
  CASE WHEN nn.rn = 4 THEN 'WWCC number does not match records on the OCG portal. Please check your WWCC number and resubmit.' ELSE NULL END,

  -- ── Identity fields (all scenarios have passport submission) ──
  nn.last_name,
  nn.first_name,
  nn.date_of_birth,
  CASE
    WHEN nn.rn = 1 THEN 'Australia'
    WHEN nn.rn = 2 THEN 'New Zealand'
    WHEN nn.rn = 3 THEN 'United Kingdom'
    WHEN nn.rn = 4 THEN 'Australia'
    WHEN nn.rn = 5 THEN 'Australia'
    ELSE NULL
  END,
  -- passport_upload_url (placeholder images)
  'https://placehold.co/600x400/e2e8f0/64748b?text=Passport+' || nn.rn,
  -- identification_photo_url (placeholder selfies)
  'https://placehold.co/600x400/e2e8f0/64748b?text=Selfie+' || nn.rn,
  true,
  -- identity_verified (scenarios C, D, E have passed ID)
  CASE WHEN nn.rn IN (3, 4, 5) THEN true ELSE false END,
  -- identity_rejection_reason (scenario B = ID rejected)
  CASE WHEN nn.rn = 2 THEN 'Passport photo is too blurry to read. Name and date of birth cannot be confirmed. Please resubmit a clearer image.' ELSE NULL END,

  -- ── verification_status ──
  CASE
    WHEN nn.rn = 1 THEN 'pending'          -- A: Pending ID review
    WHEN nn.rn = 2 THEN 'rejected'         -- B: ID failed
    WHEN nn.rn = 3 THEN 'pending'          -- C: ID passed, pending WWCC review
    WHEN nn.rn = 4 THEN 'rejected'         -- D: ID passed, WWCC failed
    WHEN nn.rn = 5 THEN 'fully_verified'   -- E: Both passed
    ELSE 'pending'
  END,

  -- created_at (staggered for realistic "submitted X ago")
  CASE
    WHEN nn.rn = 1 THEN NOW() - INTERVAL '2 hours'
    WHEN nn.rn = 2 THEN NOW() - INTERVAL '2 days'
    WHEN nn.rn = 3 THEN NOW() - INTERVAL '6 hours'
    WHEN nn.rn = 4 THEN NOW() - INTERVAL '1 day'
    WHEN nn.rn = 5 THEN NOW() - INTERVAL '5 days'
    ELSE NOW()
  END

FROM numbered_nannies nn;

-- ── Update nannies table flags to match ──

-- Scenario A: Pending ID — not verified yet
UPDATE nannies SET wwcc_verified = false, identity_verified = false, verification_tier = 1
WHERE user_id = (SELECT user_id FROM nannies ORDER BY created_at LIMIT 1 OFFSET 0);

-- Scenario B: ID rejected — not verified, account should be inactive
UPDATE nannies SET wwcc_verified = false, identity_verified = false, verification_tier = 1, status = 'inactive'
WHERE user_id = (SELECT user_id FROM nannies ORDER BY created_at LIMIT 1 OFFSET 1);

-- Scenario C: ID passed, WWCC pending — ID verified but not fully active yet
UPDATE nannies SET wwcc_verified = false, identity_verified = true, verification_tier = 1
WHERE user_id = (SELECT user_id FROM nannies ORDER BY created_at LIMIT 1 OFFSET 2);

-- Scenario D: ID passed, WWCC failed — account inactive until WWCC resubmit
UPDATE nannies SET wwcc_verified = false, identity_verified = true, verification_tier = 1, status = 'inactive'
WHERE user_id = (SELECT user_id FROM nannies ORDER BY created_at LIMIT 1 OFFSET 3);

-- Scenario E: Fully verified — both passed, active
UPDATE nannies SET wwcc_verified = true, identity_verified = true, verification_tier = 2, status = 'active'
WHERE user_id = (SELECT user_id FROM nannies ORDER BY created_at LIMIT 1 OFFSET 4);

-- ── Verify results ──
SELECT
  up.first_name || ' ' || up.last_name AS name,
  v.verification_status,
  v.identity_verified AS id_ok,
  v.wwcc_verified AS wwcc_ok,
  v.wwcc_number,
  v.identity_rejection_reason AS id_reject,
  v.wwcc_rejection_reason AS wwcc_reject,
  n.status AS nanny_status,
  n.verification_tier AS tier
FROM verifications v
JOIN user_profiles up ON up.user_id = v.user_id
JOIN nannies n ON n.user_id = v.user_id
ORDER BY v.created_at;
