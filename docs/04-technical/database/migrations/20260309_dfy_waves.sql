-- Migration: DFY Waved Email Sending
-- Date: 2026-03-09
-- Description: Add wave column to dfy_match_notifications and dfy_wave_sent to nanny_positions
--              for 3-wave email sending (Day 0, Day 2, Day 5)

-- 1. Add wave column to dfy_match_notifications (1, 2, or 3)
ALTER TABLE dfy_match_notifications ADD COLUMN IF NOT EXISTS wave INTEGER DEFAULT 1;

-- 2. Add dfy_wave_sent JSONB array to nanny_positions (tracks which waves have been sent)
ALTER TABLE nanny_positions ADD COLUMN IF NOT EXISTS dfy_wave_sent JSONB DEFAULT '[]';

-- 3. Update CHECK constraint to include 'pending_wave' status
-- Drop existing constraint first, then re-add with new value
ALTER TABLE dfy_match_notifications DROP CONSTRAINT IF EXISTS dfy_match_notifications_status_check;
ALTER TABLE dfy_match_notifications ADD CONSTRAINT dfy_match_notifications_status_check
  CHECK (status IN ('notified', 'viewed', 'interested', 'approved', 'declined', 'expired', 'pending_wave'));

-- 4. Backfill existing notifications as wave 1
UPDATE dfy_match_notifications SET wave = 1 WHERE wave IS NULL;

-- 5. Backfill existing DFY-activated positions with wave 1 sent
UPDATE nanny_positions SET dfy_wave_sent = '[1]'
WHERE dfy_activated_at IS NOT NULL AND (dfy_wave_sent IS NULL OR dfy_wave_sent = '[]'::jsonb);
