-- ============================================================================
-- Migration: Connect Feature
-- Date: 2026-02-25
-- Description:
--   1. Rename interview_requests → connection_requests with column changes
--   2. Create inbox_messages table (in-app notification system)
--   3. Create connections_log table (JSONB-heavy event log)
--   4. Update RLS trigger for renamed columns
-- ============================================================================

-- ── 1A. Rename table ──
ALTER TABLE interview_requests RENAME TO connection_requests;

-- ── 1B. Migrate existing data (if any) ──
UPDATE connection_requests SET status = 'confirmed' WHERE status = 'accepted';
UPDATE connection_requests SET status = 'confirmed' WHERE status = 'completed';

-- ── 1C. Rename column ──
ALTER TABLE connection_requests RENAME COLUMN requested_dates TO proposed_times;

-- ── 1D. Add new columns ──
ALTER TABLE connection_requests ADD COLUMN confirmed_time TIMESTAMPTZ;
ALTER TABLE connection_requests ADD COLUMN confirmed_at TIMESTAMPTZ;
ALTER TABLE connection_requests ADD COLUMN decline_reason TEXT;
ALTER TABLE connection_requests ADD COLUMN nanny_phone_shared TEXT;

-- ── 1E. Drop old columns ──
ALTER TABLE connection_requests DROP COLUMN IF EXISTS interview_location;
ALTER TABLE connection_requests DROP COLUMN IF EXISTS interview_type;
ALTER TABLE connection_requests DROP COLUMN IF EXISTS completed_at;
ALTER TABLE connection_requests DROP COLUMN IF EXISTS outcome;
ALTER TABLE connection_requests DROP COLUMN IF EXISTS outcome_notes;
ALTER TABLE connection_requests DROP COLUMN IF EXISTS nanny_response_message;
ALTER TABLE connection_requests DROP COLUMN IF EXISTS interview_date;
ALTER TABLE connection_requests DROP COLUMN IF EXISTS interview_time;

-- ── 1F. Update status CHECK constraint ──
-- Drop old constraint (name is auto-generated as connection_requests_status_check after rename)
ALTER TABLE connection_requests DROP CONSTRAINT IF EXISTS interview_requests_status_check;
ALTER TABLE connection_requests DROP CONSTRAINT IF EXISTS connection_requests_status_check;
ALTER TABLE connection_requests ADD CONSTRAINT connection_requests_status_check
  CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled', 'expired'));

-- ── 1G. Rename indexes ──
ALTER INDEX IF EXISTS idx_interview_requests_nanny    RENAME TO idx_connection_requests_nanny;
ALTER INDEX IF EXISTS idx_interview_requests_parent   RENAME TO idx_connection_requests_parent;
ALTER INDEX IF EXISTS idx_interview_requests_position RENAME TO idx_connection_requests_position;
ALTER INDEX IF EXISTS idx_interview_requests_status   RENAME TO idx_connection_requests_status;
ALTER INDEX IF EXISTS idx_interview_requests_created  RENAME TO idx_connection_requests_created;

-- Add new index for expiry queries
CREATE INDEX IF NOT EXISTS idx_connection_requests_expires_pending
  ON connection_requests(expires_at) WHERE status = 'pending';

-- ── 1H. Rename trigger ──
ALTER TRIGGER trg_interview_requests_updated_at ON connection_requests
  RENAME TO trg_connection_requests_updated_at;

-- ── 1I. Update RLS protection trigger function ──
-- The old function references requested_dates, need to update to proposed_times
CREATE OR REPLACE FUNCTION protect_connection_request_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    -- Nannies can only update response fields; lock ownership/structural fields
    IF public.is_nanny() THEN
      new.parent_id := old.parent_id;
      new.nanny_id := old.nanny_id;
      new.position_id := old.position_id;
      new.message := old.message;
      new.proposed_times := old.proposed_times;
      new.created_at := old.created_at;
      new.expires_at := old.expires_at;
    END IF;
  END IF;
  RETURN new;
END;
$$;

-- Drop old trigger and function, create new trigger
DROP TRIGGER IF EXISTS trg_protect_interview_request_ownership ON connection_requests;
DROP FUNCTION IF EXISTS protect_interview_request_ownership();

CREATE TRIGGER trg_protect_connection_request_ownership
  BEFORE UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION protect_connection_request_ownership();

-- ── 1J. Update table/column comments ──
COMMENT ON TABLE connection_requests IS 'Connection requests between parents and nannies — parent proposes 3 intro call times, nanny accepts/declines';
COMMENT ON COLUMN connection_requests.proposed_times IS 'JSONB array of 3 ISO datetime strings for proposed 15-minute intro call times';
COMMENT ON COLUMN connection_requests.confirmed_time IS 'The time the nanny selected from proposed_times';
COMMENT ON COLUMN connection_requests.confirmed_at IS 'When the nanny confirmed the connection';
COMMENT ON COLUMN connection_requests.decline_reason IS 'Optional reason provided by nanny when declining (not shown to parent)';
COMMENT ON COLUMN connection_requests.nanny_phone_shared IS 'Nanny phone number cached at confirmation time (shared with parent)';
COMMENT ON COLUMN connection_requests.expires_at IS 'Auto-expire if nanny does not respond — set to earliest proposed_time minus 12 hours';

-- ── Update RLS policies to reference new table name ──
-- Supabase RLS policies reference table names, and since we renamed the table
-- the existing policies should auto-follow. But let's verify the select policy name.
-- Note: Postgres renames policies automatically when table is renamed.


-- ============================================================================
-- 2. CREATE inbox_messages TABLE
-- ============================================================================

CREATE TABLE inbox_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message content
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  action_url      TEXT,

  -- Reference to related entity
  reference_id    UUID,
  reference_type  TEXT,

  -- Read status
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,

  -- Flexible metadata
  metadata        JSONB DEFAULT '{}'::JSONB,

  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_inbox_user_unread ON inbox_messages(user_id) WHERE is_read = false;
CREATE INDEX idx_inbox_user_created ON inbox_messages(user_id, created_at DESC);
CREATE INDEX idx_inbox_reference ON inbox_messages(reference_id, reference_type);

-- Updated_at trigger
CREATE TRIGGER trg_inbox_messages_updated_at
  BEFORE UPDATE ON inbox_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own messages
CREATE POLICY inbox_messages_select ON inbox_messages
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own messages (mark as read)
CREATE POLICY inbox_messages_update ON inbox_messages
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Only service role can insert (system-generated messages)
CREATE POLICY inbox_messages_insert ON inbox_messages
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- Allow service_role (admin client) to insert for any user
      current_setting('role', true) = 'service_role'
      OR
      -- Allow users to insert messages for themselves (edge case)
      user_id = auth.uid()
    )
  );

COMMENT ON TABLE inbox_messages IS 'In-app notification system for nannies and parents — connection requests, verification updates, system alerts';
COMMENT ON COLUMN inbox_messages.type IS 'Message type: connection_request, connection_confirmed, connection_declined, connection_expired, connection_cancelled, verification_update, etc.';
COMMENT ON COLUMN inbox_messages.action_url IS 'Relative URL for the CTA button, e.g. /nanny/inbox';
COMMENT ON COLUMN inbox_messages.reference_id IS 'UUID of the related entity (e.g. connection_request.id)';
COMMENT ON COLUMN inbox_messages.reference_type IS 'Type of the referenced entity: connection_request, verification, etc.';


-- ============================================================================
-- 3. CREATE connections_log TABLE
-- ============================================================================

CREATE TABLE connections_log (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_request_id   UUID NOT NULL REFERENCES connection_requests(id) ON DELETE CASCADE,
  parent_id               UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  nanny_id                UUID NOT NULL REFERENCES nannies(id) ON DELETE CASCADE,

  -- Event tracking
  event_type              TEXT NOT NULL,
  event_data              JSONB DEFAULT '{}'::JSONB,

  -- Future: post-call confirmation, hire outcome
  outcome_data            JSONB,

  -- System metadata
  metadata                JSONB DEFAULT '{}'::JSONB,

  -- Timestamp
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_connections_log_request ON connections_log(connection_request_id);
CREATE INDEX idx_connections_log_event_type ON connections_log(event_type);
CREATE INDEX idx_connections_log_nanny ON connections_log(nanny_id);
CREATE INDEX idx_connections_log_parent ON connections_log(parent_id);

-- RLS
ALTER TABLE connections_log ENABLE ROW LEVEL SECURITY;

-- Users can read log entries where they are the parent or nanny
CREATE POLICY connections_log_select ON connections_log
  FOR SELECT USING (
    nanny_id IN (SELECT id FROM nannies WHERE user_id = auth.uid())
    OR
    parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid())
    OR
    public.is_admin()
  );

-- Only service role can insert
CREATE POLICY connections_log_insert ON connections_log
  FOR INSERT WITH CHECK (
    current_setting('role', true) = 'service_role'
  );

COMMENT ON TABLE connections_log IS 'Event log for connection lifecycle — JSONB columns for flexible event data and future post-call confirmation';
COMMENT ON COLUMN connections_log.event_type IS 'Event: created, confirmed, declined, cancelled, expired, call_completed, call_missed, hired';
COMMENT ON COLUMN connections_log.event_data IS 'All event-specific data (selected time, phone number shared, etc.)';
COMMENT ON COLUMN connections_log.outcome_data IS 'Future: post-call survey responses, hire decision, rating';
