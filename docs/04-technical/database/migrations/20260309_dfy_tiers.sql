ALTER TABLE nanny_positions ADD COLUMN IF NOT EXISTS dfy_tier TEXT DEFAULT 'standard';
ALTER TABLE nanny_positions ADD CONSTRAINT nanny_positions_dfy_tier_check
  CHECK (dfy_tier IN ('standard', 'priority'));
UPDATE nanny_positions SET dfy_tier = 'priority' WHERE dfy_activated_at IS NOT NULL;
