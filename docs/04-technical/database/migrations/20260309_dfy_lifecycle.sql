-- Migration: DFY Lifecycle Management
-- Date: 2026-03-09
-- Description: Add dfy_expires_at to nanny_positions for 7-day DFY expiry window

ALTER TABLE nanny_positions ADD COLUMN IF NOT EXISTS dfy_expires_at TIMESTAMPTZ;

-- Backfill existing DFY-activated positions: set expires_at = activated_at + 7 days
UPDATE nanny_positions
SET dfy_expires_at = dfy_activated_at + INTERVAL '7 days'
WHERE dfy_activated_at IS NOT NULL AND dfy_expires_at IS NULL;
