-- Migration 002: Update nanny_positions for typeform flow
-- Run in Supabase SQL Editor
-- Safe to run: no production data exists in nanny_positions

-- ── 1. Add new columns ──

ALTER TABLE nanny_positions ADD COLUMN IF NOT EXISTS suburb TEXT;
ALTER TABLE nanny_positions ADD COLUMN IF NOT EXISTS postcode INT;
ALTER TABLE nanny_positions ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';

-- ── 2. Migrate existing data to new values ──

UPDATE nanny_positions SET schedule_type = 'Flexible' WHERE schedule_type = 'I''m Flexible';
UPDATE nanny_positions SET schedule_type = 'Fixed' WHERE schedule_type = 'Yes';
UPDATE nanny_positions SET schedule_type = NULL WHERE schedule_type = 'No';
UPDATE nanny_positions SET placement_length = 'Temporarily' WHERE placement_length = 'Until a certain date';
UPDATE nanny_positions SET urgency = 'As soon as possible' WHERE urgency = 'Immediately';

-- ── 3. Update CHECK constraints to match new form values ──

-- schedule_type: was 'Yes', 'No', 'I''m Flexible' → now 'Fixed', 'Flexible'
ALTER TABLE nanny_positions DROP CONSTRAINT IF EXISTS nanny_positions_schedule_type_check;
ALTER TABLE nanny_positions ADD CONSTRAINT nanny_positions_schedule_type_check
  CHECK (schedule_type IN ('Fixed', 'Flexible'));

-- placement_length: was 'Ongoing', 'Until a certain date' → now 'Ongoing', 'Temporarily'
ALTER TABLE nanny_positions DROP CONSTRAINT IF EXISTS nanny_positions_placement_length_check;
ALTER TABLE nanny_positions ADD CONSTRAINT nanny_positions_placement_length_check
  CHECK (placement_length IN ('Ongoing', 'Temporarily'));

-- urgency: was 'Immediately', 'At a later date' → now 'As soon as possible', 'At a later date'
ALTER TABLE nanny_positions DROP CONSTRAINT IF EXISTS nanny_positions_urgency_check;
ALTER TABLE nanny_positions ADD CONSTRAINT nanny_positions_urgency_check
  CHECK (urgency IN ('As soon as possible', 'At a later date'));

-- ── 3. Add indexes for new columns ──

CREATE INDEX IF NOT EXISTS idx_nanny_positions_postcode ON nanny_positions(postcode);
CREATE INDEX IF NOT EXISTS idx_nanny_positions_suburb ON nanny_positions(suburb);
CREATE INDEX IF NOT EXISTS idx_nanny_positions_details ON nanny_positions USING gin (details);

-- ── 4. Add comments ──

COMMENT ON COLUMN nanny_positions.suburb IS 'Where the nanny will primarily be working';
COMMENT ON COLUMN nanny_positions.postcode IS 'Postcode for distance-based matching';
COMMENT ON COLUMN nanny_positions.details IS 'JSONB for descriptive fields: has_pets, child_needs, focus_type, support_type, placement_duration';
COMMENT ON COLUMN nanny_positions.schedule_type IS 'Whether schedule is Fixed or Flexible';
COMMENT ON COLUMN nanny_positions.placement_length IS 'Ongoing or Temporarily';
COMMENT ON COLUMN nanny_positions.urgency IS 'As soon as possible or At a later date';
