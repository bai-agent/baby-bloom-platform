-- ============================================================
-- Migration: viral_shares table
-- Date: 2026-03-05
-- Description: Single table for all three viral loop share cases
--   (nanny_profile, parent_position, parent_bsr).
--   AI post content is stored on entity tables, not here.
-- ============================================================

-- Table
CREATE TABLE viral_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_type TEXT NOT NULL CHECK (case_type IN ('nanny_profile', 'parent_position', 'parent_bsr')),
  reference_id UUID NOT NULL,
  share_status INTEGER NOT NULL DEFAULT 10 CHECK (share_status IN (10, 20, 30, 40, 50, 60, 90)),

  -- Checkpoint timestamps (one per status — foundation for analytics)
  ready_at TIMESTAMPTZ DEFAULT now(),
  shared_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  processing_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  bypassed_at TIMESTAMPTZ,

  -- Screenshot proof
  screenshot_url TEXT,

  -- AI screenshot check
  check_result JSONB,
  checked_at TIMESTAMPTZ,

  -- Failure detail
  fail_reason TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Admin bypass (only admin control — no manual review/approve/reject)
  bypassed_by UUID REFERENCES auth.users(id),

  -- Standard
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comments
COMMENT ON TABLE viral_shares IS 'Tracks Facebook share compliance for all three viral loop cases (nanny profile, parent position, parent BSR). AI post content is stored on the entity tables, not here.';
COMMENT ON COLUMN viral_shares.case_type IS 'Discriminator: nanny_profile, parent_position, or parent_bsr';
COMMENT ON COLUMN viral_shares.reference_id IS 'Polymorphic FK: nannies.id, nanny_positions.id, or babysitting_requests.id depending on case_type';
COMMENT ON COLUMN viral_shares.share_status IS '10=Ready, 20=Shared, 30=Submitted, 40=Processing, 50=Approved, 60=Failed, 90=Bypassed';
COMMENT ON COLUMN viral_shares.ready_at IS 'When share record was created at READY status';
COMMENT ON COLUMN viral_shares.shared_at IS 'When browser session confirmed user completed a Facebook share';
COMMENT ON COLUMN viral_shares.processing_at IS 'When AI screenshot check began';
COMMENT ON COLUMN viral_shares.approved_at IS 'When access was granted (by AI check or admin bypass) — designed for future time-limited access';
COMMENT ON COLUMN viral_shares.bypassed_at IS 'When admin bypassed the share requirement';
COMMENT ON COLUMN viral_shares.bypassed_by IS 'Which admin bypassed the share requirement';
COMMENT ON COLUMN viral_shares.check_result IS 'AI screenshot check output: confidence, detected group name, pass/fail reasons';

-- Unique constraint: one share record per user per case per entity
CREATE UNIQUE INDEX idx_viral_shares_unique
  ON viral_shares(user_id, case_type, reference_id);

-- Lookup by user: "what shares does this user need to complete?"
CREATE INDEX idx_viral_shares_user ON viral_shares(user_id);

-- Lookup by reference entity: "has this entity been shared?"
CREATE INDEX idx_viral_shares_reference ON viral_shares(case_type, reference_id);

-- Monitoring: submitted or failed items
CREATE INDEX idx_viral_shares_action ON viral_shares(share_status)
  WHERE share_status IN (30, 60);

-- Analytics: approved shares
CREATE INDEX idx_viral_shares_approved ON viral_shares(case_type, approved_at)
  WHERE share_status = 50;

-- Pending user action
CREATE INDEX idx_viral_shares_pending ON viral_shares(user_id, share_status)
  WHERE share_status IN (10, 20, 60);

-- Auto-update updated_at (function already exists in DB)
CREATE TRIGGER trg_viral_shares_updated_at
  BEFORE UPDATE ON viral_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ──

ALTER TABLE viral_shares ENABLE ROW LEVEL SECURITY;

-- Users can read their own share records
CREATE POLICY "Users can view own shares"
  ON viral_shares FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own shares (screenshot upload, status progression)
CREATE POLICY "Users can update own shares"
  ON viral_shares FOR UPDATE
  USING (auth.uid() = user_id);

-- No INSERT policy for regular users — records created by server actions via admin client

-- Admins can read/update/insert/delete all shares
CREATE POLICY "Admins can manage all shares"
  ON viral_shares FOR ALL
  USING (public.is_admin());
