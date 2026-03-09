-- Fix: Allow service_role (admin client) to update placement status fields
--
-- The protect_placement_core_fields() trigger prevents non-admin users from
-- modifying placement status, end_reason, end_notes, etc. But it also blocks
-- the service_role key used by server actions (createAdminClient), because
-- auth.uid() returns null for service_role and is_admin() returns false.
--
-- This migration adds a check for service_role JWT claims so that server
-- actions using createAdminClient() can properly end placements.

CREATE OR REPLACE FUNCTION protect_placement_core_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (used by createAdminClient in server actions) full access
  IF coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    new.nanny_id := old.nanny_id;
    new.parent_id := old.parent_id;
    new.position_id := old.position_id;
    new.source := old.source;
    new.interview_request_id := old.interview_request_id;
    new.babysitting_request_id := old.babysitting_request_id;
    new.hired_at := old.hired_at;
    new.start_date := old.start_date;
    new.status := old.status;
    new.ended_at := old.ended_at;
    new.end_reason := old.end_reason;
    new.end_notes := old.end_notes;
    new.created_by := old.created_by;
  END IF;
  RETURN NEW;
END;
$$;
