-- ============================================================================
-- BABY BLOOM SYDNEY - ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Version: 1.0
-- Created: 2026-02-06
-- Platform: Supabase (PostgreSQL 15+)
-- Tables: 23 (excludes auth.users which is managed by Supabase)
--
-- This script creates all RLS helper functions, enables RLS on every table,
-- creates protection triggers for admin-only fields, and defines granular
-- access policies for nanny, parent, admin, and super_admin roles.
--
-- IMPORTANT: Run this script AFTER supabase-setup.sql has been executed.
-- This script assumes all 23 public tables already exist.
--
-- ============================================================================
-- Section 1: Helper Functions
-- Section 2: Enable RLS on All Tables
-- Section 3: Protection Triggers
-- Section 4: Core Identity Policies (user_roles, user_profiles)
-- Section 5: Nanny Domain Policies (nannies, availability, credentials, etc.)
-- Section 6: Parent Domain Policies (parents, positions, schedule, children)
-- Section 7: Matching & Request Policies (interviews, BSR, placements)
-- Section 8: Logging & Reference Policies (logs, postcodes, progress, retention)
-- ============================================================================


-- ============================================================================
-- SECTION 1: HELPER FUNCTIONS
-- ============================================================================
-- All functions are created in the PUBLIC schema with SECURITY DEFINER so they
-- execute with the privileges of the function creator, allowing them to read
-- from tables even when the calling user's RLS would otherwise block access.
-- This prevents infinite recursion in RLS policy evaluation.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- get_user_role(): Returns the current authenticated user's role string.
-- Returns null if no role is assigned.
-- ---------------------------------------------------------------------------
create or replace function public.get_user_role()
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return (
    select role
    from user_roles
    where user_id = auth.uid()
  );
end;
$$;

comment on function public.get_user_role() is 'Returns current authenticated user role from user_roles table';

-- ---------------------------------------------------------------------------
-- is_nanny(): Returns true if the current user has the nanny role.
-- ---------------------------------------------------------------------------
create or replace function public.is_nanny()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return coalesce(public.get_user_role() = 'nanny', false);
end;
$$;

comment on function public.is_nanny() is 'Returns true if current user is a nanny';

-- ---------------------------------------------------------------------------
-- is_parent(): Returns true if the current user has the parent role.
-- ---------------------------------------------------------------------------
create or replace function public.is_parent()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return coalesce(public.get_user_role() = 'parent', false);
end;
$$;

comment on function public.is_parent() is 'Returns true if current user is a parent';

-- ---------------------------------------------------------------------------
-- is_admin(): Returns true if the current user is admin OR super_admin.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return coalesce(public.get_user_role() in ('admin', 'super_admin'), false);
end;
$$;

comment on function public.is_admin() is 'Returns true if current user is admin or super_admin';

-- ---------------------------------------------------------------------------
-- is_super_admin(): Returns true only if the current user is super_admin.
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return coalesce(public.get_user_role() = 'super_admin', false);
end;
$$;

comment on function public.is_super_admin() is 'Returns true if current user is super_admin';

-- ---------------------------------------------------------------------------
-- get_nanny_id(): Returns the nannies.id for the current user.
-- Returns null if the user is not a nanny or has no nanny record.
-- ---------------------------------------------------------------------------
create or replace function public.get_nanny_id()
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return (
    select id
    from nannies
    where user_id = auth.uid()
  );
end;
$$;

comment on function public.get_nanny_id() is 'Returns nannies.id for current authenticated user';

-- ---------------------------------------------------------------------------
-- get_parent_id(): Returns the parents.id for the current user.
-- Returns null if the user is not a parent or has no parent record.
-- ---------------------------------------------------------------------------
create or replace function public.get_parent_id()
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return (
    select id
    from parents
    where user_id = auth.uid()
  );
end;
$$;

comment on function public.get_parent_id() is 'Returns parents.id for current authenticated user';


-- ============================================================================
-- SECTION 2: ENABLE RLS ON ALL 23 TABLES
-- ============================================================================
-- enable row level security ensures policies are evaluated for every query.
-- force row level security ensures even the table owner is subject to policies
-- (important: the service_role in Supabase bypasses RLS regardless).
-- ============================================================================

alter table user_roles enable row level security;
alter table user_roles force row level security;

alter table user_profiles enable row level security;
alter table user_profiles force row level security;

alter table sydney_postcodes enable row level security;
alter table sydney_postcodes force row level security;

alter table verifications enable row level security;
alter table verifications force row level security;

alter table activity_logs enable row level security;
alter table activity_logs force row level security;

alter table email_logs enable row level security;
alter table email_logs force row level security;

alter table user_progress enable row level security;
alter table user_progress force row level security;

alter table nannies enable row level security;
alter table nannies force row level security;

alter table nanny_availability enable row level security;
alter table nanny_availability force row level security;

alter table nanny_credentials enable row level security;
alter table nanny_credentials force row level security;

alter table nanny_assurances enable row level security;
alter table nanny_assurances force row level security;

alter table nanny_images enable row level security;
alter table nanny_images force row level security;

alter table nanny_ai_content enable row level security;
alter table nanny_ai_content force row level security;

alter table parents enable row level security;
alter table parents force row level security;

alter table nanny_positions enable row level security;
alter table nanny_positions force row level security;

alter table position_schedule enable row level security;
alter table position_schedule force row level security;

alter table position_children enable row level security;
alter table position_children force row level security;

alter table interview_requests enable row level security;
alter table interview_requests force row level security;

alter table babysitting_requests enable row level security;
alter table babysitting_requests force row level security;

alter table bsr_time_slots enable row level security;
alter table bsr_time_slots force row level security;

alter table bsr_notifications enable row level security;
alter table bsr_notifications force row level security;

alter table nanny_placements enable row level security;
alter table nanny_placements force row level security;

alter table file_retention_log enable row level security;
alter table file_retention_log force row level security;


-- ============================================================================
-- SECTION 3: PROTECTION TRIGGERS
-- ============================================================================
-- PostgreSQL RLS policies cannot reference NEW or OLD in USING/WITH CHECK
-- clauses. To prevent non-admin users from modifying admin-only fields
-- (verification status, approval flags, etc.), we use BEFORE UPDATE triggers
-- that silently revert protected fields to their original values when the
-- update is performed by a non-admin user.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3a. Protect nanny verification fields
-- Prevents non-admin users from modifying: wwcc_verified, identity_verified,
-- verification_tier, status, wwcc_expiry_date, and admin-managed timestamps.
-- ---------------------------------------------------------------------------
create or replace function protect_nanny_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.wwcc_verified := old.wwcc_verified;
    new.identity_verified := old.identity_verified;
    new.verification_tier := old.verification_tier;
    new.status := old.status;
    new.wwcc_expiry_date := old.wwcc_expiry_date;
    new.deactivated_at := old.deactivated_at;
    new.files_deleted_at := old.files_deleted_at;
    new.tier2_achieved_at := old.tier2_achieved_at;
    new.tier3_achieved_at := old.tier3_achieved_at;
  end if;
  return new;
end;
$$;

create trigger trg_protect_nanny_verification_fields
  before update on nannies
  for each row
  execute function protect_nanny_verification_fields();

comment on function protect_nanny_verification_fields() is 'Prevents non-admin users from modifying nanny verification and status fields';

-- ---------------------------------------------------------------------------
-- 3b. Protect verification record fields
-- Prevents non-admin users from modifying: wwcc_verified, identity_verified,
-- verification_status, and all *_verified_by / *_verified_at fields.
-- ---------------------------------------------------------------------------
create or replace function protect_verification_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.wwcc_verified := old.wwcc_verified;
    new.wwcc_verified_at := old.wwcc_verified_at;
    new.wwcc_verified_by := old.wwcc_verified_by;
    new.wwcc_rejection_reason := old.wwcc_rejection_reason;
    new.identity_verified := old.identity_verified;
    new.identity_verified_at := old.identity_verified_at;
    new.identity_verified_by := old.identity_verified_by;
    new.identity_rejection_reason := old.identity_rejection_reason;
    new.verification_status := old.verification_status;
  end if;
  return new;
end;
$$;

create trigger trg_protect_verification_admin_fields
  before update on verifications
  for each row
  execute function protect_verification_admin_fields();

comment on function protect_verification_admin_fields() is 'Prevents non-admin users from modifying verification status and approval fields';

-- ---------------------------------------------------------------------------
-- 3c. Protect nanny_credentials verified field
-- Prevents non-admin users from setting verified = true or modifying
-- verification-related fields.
-- ---------------------------------------------------------------------------
create or replace function protect_credential_verified_field()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.verified := old.verified;
    new.verified_at := old.verified_at;
    new.verified_by := old.verified_by;
    new.rejection_reason := old.rejection_reason;
  end if;
  return new;
end;
$$;

create trigger trg_protect_credential_verified_field
  before update on nanny_credentials
  for each row
  execute function protect_credential_verified_field();

comment on function protect_credential_verified_field() is 'Prevents non-admin users from modifying credential verification fields';

-- ---------------------------------------------------------------------------
-- 3d. Protect nanny_assurances verified field
-- Prevents non-admin users from setting verified = true or modifying
-- verification-related fields.
-- ---------------------------------------------------------------------------
create or replace function protect_assurance_verified_field()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.verified := old.verified;
    new.verified_at := old.verified_at;
    new.verified_by := old.verified_by;
  end if;
  return new;
end;
$$;

create trigger trg_protect_assurance_verified_field
  before update on nanny_assurances
  for each row
  execute function protect_assurance_verified_field();

comment on function protect_assurance_verified_field() is 'Prevents non-admin users from modifying assurance verification fields';

-- ---------------------------------------------------------------------------
-- 3e. Protect nanny_images approved field
-- Prevents non-admin users from setting approved = true or modifying
-- approval-related fields.
-- ---------------------------------------------------------------------------
create or replace function protect_image_approved_field()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.approved := old.approved;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
  end if;
  return new;
end;
$$;

create trigger trg_protect_image_approved_field
  before update on nanny_images
  for each row
  execute function protect_image_approved_field();

comment on function protect_image_approved_field() is 'Prevents non-admin users from modifying image approval fields';

-- ---------------------------------------------------------------------------
-- 3f. Protect nanny_placements status and core fields
-- Prevents nannies/parents from modifying placement status, source, or
-- ownership fields. They can only update their respective satisfaction ratings.
-- ---------------------------------------------------------------------------
create or replace function protect_placement_core_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
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
  end if;
  return new;
end;
$$;

create trigger trg_protect_placement_core_fields
  before update on nanny_placements
  for each row
  execute function protect_placement_core_fields();

comment on function protect_placement_core_fields() is 'Prevents non-admin users from modifying placement core/status fields';

-- ---------------------------------------------------------------------------
-- 3g. Protect interview_requests ownership fields
-- Prevents nannies from modifying parent_id, nanny_id, or position_id when
-- they respond to requests. Parents retain full update access to their own.
-- ---------------------------------------------------------------------------
create or replace function protect_interview_request_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    -- Nannies can only update response fields; lock ownership/structural fields
    if public.is_nanny() then
      new.parent_id := old.parent_id;
      new.nanny_id := old.nanny_id;
      new.position_id := old.position_id;
      new.message := old.message;
      new.requested_dates := old.requested_dates;
      new.created_at := old.created_at;
      new.expires_at := old.expires_at;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_protect_interview_request_ownership
  before update on interview_requests
  for each row
  execute function protect_interview_request_ownership();

comment on function protect_interview_request_ownership() is 'Prevents nannies from modifying ownership fields on interview requests';

-- ---------------------------------------------------------------------------
-- 3h. Protect bsr_notifications ownership fields
-- Prevents non-admin users from modifying babysitting_request_id, nanny_id,
-- and other system-set fields when responding to notifications.
-- ---------------------------------------------------------------------------
create or replace function protect_bsr_notification_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.babysitting_request_id := old.babysitting_request_id;
    new.nanny_id := old.nanny_id;
    new.notified_at := old.notified_at;
    new.notification_method := old.notification_method;
    new.distance_km := old.distance_km;
    new.created_at := old.created_at;
    -- Nannies may update: viewed_at, accepted_at, declined_at, declined_reason
    -- System/admin may update: notified_filled, notified_filled_at
  end if;
  return new;
end;
$$;

create trigger trg_protect_bsr_notification_ownership
  before update on bsr_notifications
  for each row
  execute function protect_bsr_notification_ownership();

comment on function protect_bsr_notification_ownership() is 'Prevents non-admin users from modifying BSR notification ownership fields';

-- ---------------------------------------------------------------------------
-- 3i. Protect nanny_placements satisfaction rating isolation
-- Nannies can only update nanny-side ratings; parents can only update
-- parent-side ratings. This trigger enforces the separation.
-- ---------------------------------------------------------------------------
create or replace function protect_placement_rating_isolation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    -- If the current user is a nanny, they cannot touch parent ratings
    if public.is_nanny() then
      new.parent_satisfaction_rating := old.parent_satisfaction_rating;
      new.would_rehire := old.would_rehire;
    end if;
    -- If the current user is a parent, they cannot touch nanny ratings
    if public.is_parent() then
      new.nanny_satisfaction_rating := old.nanny_satisfaction_rating;
      new.would_work_again := old.would_work_again;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_protect_placement_rating_isolation
  before update on nanny_placements
  for each row
  execute function protect_placement_rating_isolation();

comment on function protect_placement_rating_isolation() is 'Ensures nannies and parents can only update their own satisfaction ratings';


-- ============================================================================
-- SECTION 4: CORE IDENTITY POLICIES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 4a. user_roles
-- ---------------------------------------------------------------------------

-- Users can read their own role
create policy "user_roles: users read own role"
  on user_roles
  for select
  to authenticated
  using (user_id = auth.uid());

-- Super admin can read all roles
create policy "user_roles: super admin reads all"
  on user_roles
  for select
  to authenticated
  using (public.is_super_admin());

-- Super admin can insert new roles
create policy "user_roles: super admin inserts roles"
  on user_roles
  for insert
  to authenticated
  with check (public.is_super_admin());

-- Super admin can update roles
create policy "user_roles: super admin updates roles"
  on user_roles
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Super admin can delete roles
create policy "user_roles: super admin deletes roles"
  on user_roles
  for delete
  to authenticated
  using (public.is_super_admin());

-- Service role handles initial signup role assignment (bypasses RLS).
-- No explicit policy needed since service_role bypasses RLS.

-- ---------------------------------------------------------------------------
-- 4b. user_profiles
-- ---------------------------------------------------------------------------

-- Users can read their own profile
create policy "user_profiles: users read own profile"
  on user_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

-- Users can update their own profile
create policy "user_profiles: users update own profile"
  on user_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can insert their own profile during signup
create policy "user_profiles: users create own profile"
  on user_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Parents can read verified nanny profiles (for matching pages)
create policy "user_profiles: parents read verified nanny profiles"
  on user_profiles
  for select
  to authenticated
  using (
    public.is_parent()
    and exists (
      select 1 from nannies n
      where n.user_id = user_profiles.user_id
        and n.visible_in_match_making = true
    )
  );

-- Nannies can read profiles of parents who sent them interview requests
create policy "user_profiles: nannies read requesting parent profiles"
  on user_profiles
  for select
  to authenticated
  using (
    public.is_nanny()
    and exists (
      select 1 from interview_requests ir
      join parents p on ir.parent_id = p.id
      where p.user_id = user_profiles.user_id
        and ir.nanny_id = public.get_nanny_id()
    )
  );

-- Admin can read all profiles
create policy "user_profiles: admin reads all profiles"
  on user_profiles
  for select
  to authenticated
  using (public.is_admin());

-- Admin can update all profiles
create policy "user_profiles: admin updates all profiles"
  on user_profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
-- SECTION 5: NANNY DOMAIN POLICIES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5a. nannies
-- ---------------------------------------------------------------------------

-- Nannies can read their own record
create policy "nannies: nannies read own record"
  on nannies
  for select
  to authenticated
  using (user_id = auth.uid());

-- Nannies can create their own record during signup
create policy "nannies: nannies create own record"
  on nannies
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_nanny()
  );

-- Nannies can update their own record
-- (Protection trigger prevents modification of verification fields)
create policy "nannies: nannies update own record"
  on nannies
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_nanny()
  )
  with check (user_id = auth.uid());

-- Parents can read nannies visible in match making
create policy "nannies: parents read visible nannies"
  on nannies
  for select
  to authenticated
  using (
    public.is_parent()
    and visible_in_match_making = true
  );

-- Nannies can read other verified peers (visible in match making)
create policy "nannies: nannies read verified peers"
  on nannies
  for select
  to authenticated
  using (
    public.is_nanny()
    and visible_in_match_making = true
  );

-- Admin can read all nannies
create policy "nannies: admin reads all"
  on nannies
  for select
  to authenticated
  using (public.is_admin());

-- Admin can update any nanny (including verification fields)
create policy "nannies: admin updates all"
  on nannies
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can insert nannies (edge case: admin-created profiles)
create policy "nannies: admin inserts all"
  on nannies
  for insert
  to authenticated
  with check (public.is_admin());

-- Admin can delete nannies
create policy "nannies: admin deletes all"
  on nannies
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5b. nanny_availability
-- ---------------------------------------------------------------------------

-- Nannies can read their own availability
create policy "nanny_availability: nannies read own"
  on nanny_availability
  for select
  to authenticated
  using (nanny_id = public.get_nanny_id());

-- Nannies can insert their own availability
create policy "nanny_availability: nannies insert own"
  on nanny_availability
  for insert
  to authenticated
  with check (nanny_id = public.get_nanny_id());

-- Nannies can update their own availability
create policy "nanny_availability: nannies update own"
  on nanny_availability
  for update
  to authenticated
  using (nanny_id = public.get_nanny_id())
  with check (nanny_id = public.get_nanny_id());

-- Nannies can delete their own availability
create policy "nanny_availability: nannies delete own"
  on nanny_availability
  for delete
  to authenticated
  using (nanny_id = public.get_nanny_id());

-- Parents can read verified nanny availability
create policy "nanny_availability: parents read verified nanny availability"
  on nanny_availability
  for select
  to authenticated
  using (
    public.is_parent()
    and exists (
      select 1 from nannies n
      where n.id = nanny_availability.nanny_id
        and n.visible_in_match_making = true
    )
  );

-- Admin can read all availability
create policy "nanny_availability: admin reads all"
  on nanny_availability
  for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5c. nanny_credentials
-- ---------------------------------------------------------------------------

-- Nannies can read their own credentials
create policy "nanny_credentials: nannies read own"
  on nanny_credentials
  for select
  to authenticated
  using (nanny_id = public.get_nanny_id());

-- Nannies can insert their own credentials (verified defaults to false)
create policy "nanny_credentials: nannies insert own"
  on nanny_credentials
  for insert
  to authenticated
  with check (
    nanny_id = public.get_nanny_id()
    and (verified is null or verified = false)
  );

-- Nannies can update their own credentials
-- (Protection trigger prevents modification of verified field)
create policy "nanny_credentials: nannies update own"
  on nanny_credentials
  for update
  to authenticated
  using (nanny_id = public.get_nanny_id())
  with check (nanny_id = public.get_nanny_id());

-- Nannies can delete their own credentials
create policy "nanny_credentials: nannies delete own"
  on nanny_credentials
  for delete
  to authenticated
  using (nanny_id = public.get_nanny_id());

-- Parents can read verified credentials of visible nannies
create policy "nanny_credentials: parents read verified of visible nannies"
  on nanny_credentials
  for select
  to authenticated
  using (
    public.is_parent()
    and verified = true
    and exists (
      select 1 from nannies n
      where n.id = nanny_credentials.nanny_id
        and n.visible_in_match_making = true
    )
  );

-- Admin can read all credentials
create policy "nanny_credentials: admin reads all"
  on nanny_credentials
  for select
  to authenticated
  using (public.is_admin());

-- Admin can insert credentials
create policy "nanny_credentials: admin inserts all"
  on nanny_credentials
  for insert
  to authenticated
  with check (public.is_admin());

-- Admin can update all credentials (including verified field)
create policy "nanny_credentials: admin updates all"
  on nanny_credentials
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can delete credentials
create policy "nanny_credentials: admin deletes all"
  on nanny_credentials
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5d. nanny_assurances
-- ---------------------------------------------------------------------------

-- Nannies can read their own assurances
create policy "nanny_assurances: nannies read own"
  on nanny_assurances
  for select
  to authenticated
  using (nanny_id = public.get_nanny_id());

-- Nannies can insert their own assurances (verified defaults to false)
create policy "nanny_assurances: nannies insert own"
  on nanny_assurances
  for insert
  to authenticated
  with check (
    nanny_id = public.get_nanny_id()
    and (verified is null or verified = false)
  );

-- Nannies can update their own assurances
-- (Protection trigger prevents modification of verified field)
create policy "nanny_assurances: nannies update own"
  on nanny_assurances
  for update
  to authenticated
  using (nanny_id = public.get_nanny_id())
  with check (nanny_id = public.get_nanny_id());

-- Nannies can delete their own assurances
create policy "nanny_assurances: nannies delete own"
  on nanny_assurances
  for delete
  to authenticated
  using (nanny_id = public.get_nanny_id());

-- Parents can read verified assurances of visible nannies
create policy "nanny_assurances: parents read verified of visible nannies"
  on nanny_assurances
  for select
  to authenticated
  using (
    public.is_parent()
    and verified = true
    and exists (
      select 1 from nannies n
      where n.id = nanny_assurances.nanny_id
        and n.visible_in_match_making = true
    )
  );

-- Admin can read all assurances
create policy "nanny_assurances: admin reads all"
  on nanny_assurances
  for select
  to authenticated
  using (public.is_admin());

-- Admin can insert assurances
create policy "nanny_assurances: admin inserts all"
  on nanny_assurances
  for insert
  to authenticated
  with check (public.is_admin());

-- Admin can update all assurances (including verified field)
create policy "nanny_assurances: admin updates all"
  on nanny_assurances
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can delete assurances
create policy "nanny_assurances: admin deletes all"
  on nanny_assurances
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5e. nanny_images
-- ---------------------------------------------------------------------------

-- Nannies can read their own images
create policy "nanny_images: nannies read own"
  on nanny_images
  for select
  to authenticated
  using (nanny_id = public.get_nanny_id());

-- Nannies can insert their own images (approved defaults to false)
create policy "nanny_images: nannies insert own"
  on nanny_images
  for insert
  to authenticated
  with check (
    nanny_id = public.get_nanny_id()
    and (approved is null or approved = false)
  );

-- Nannies can update their own images
-- (Protection trigger prevents modification of approved field)
create policy "nanny_images: nannies update own"
  on nanny_images
  for update
  to authenticated
  using (nanny_id = public.get_nanny_id())
  with check (nanny_id = public.get_nanny_id());

-- Nannies can delete their own images
create policy "nanny_images: nannies delete own"
  on nanny_images
  for delete
  to authenticated
  using (nanny_id = public.get_nanny_id());

-- Parents can see approved images of visible nannies
create policy "nanny_images: parents read approved of visible nannies"
  on nanny_images
  for select
  to authenticated
  using (
    public.is_parent()
    and approved = true
    and exists (
      select 1 from nannies n
      where n.id = nanny_images.nanny_id
        and n.visible_in_match_making = true
    )
  );

-- Admin can read all images
create policy "nanny_images: admin reads all"
  on nanny_images
  for select
  to authenticated
  using (public.is_admin());

-- Admin can insert images
create policy "nanny_images: admin inserts all"
  on nanny_images
  for insert
  to authenticated
  with check (public.is_admin());

-- Admin can update all images (including approved field)
create policy "nanny_images: admin updates all"
  on nanny_images
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can delete images
create policy "nanny_images: admin deletes all"
  on nanny_images
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5f. nanny_ai_content
-- ---------------------------------------------------------------------------

-- Nannies can read their own AI content
create policy "nanny_ai_content: nannies read own"
  on nanny_ai_content
  for select
  to authenticated
  using (nanny_id = public.get_nanny_id());

-- Parents can read approved, active AI content of visible nannies
create policy "nanny_ai_content: parents read approved active of visible nannies"
  on nanny_ai_content
  for select
  to authenticated
  using (
    public.is_parent()
    and approved = true
    and is_active = true
    and exists (
      select 1 from nannies n
      where n.id = nanny_ai_content.nanny_id
        and n.visible_in_match_making = true
    )
  );

-- Admin can read all AI content
create policy "nanny_ai_content: admin reads all"
  on nanny_ai_content
  for select
  to authenticated
  using (public.is_admin());

-- Admin can insert AI content
create policy "nanny_ai_content: admin inserts all"
  on nanny_ai_content
  for insert
  to authenticated
  with check (public.is_admin());

-- Admin can update AI content
create policy "nanny_ai_content: admin updates all"
  on nanny_ai_content
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can delete AI content
create policy "nanny_ai_content: admin deletes all"
  on nanny_ai_content
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5g. verifications
-- ---------------------------------------------------------------------------

-- Nannies can read their own verification record
create policy "verifications: nannies read own"
  on verifications
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_nanny()
  );

-- Nannies can create their own verification record
create policy "verifications: nannies create own"
  on verifications
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_nanny()
  );

-- Nannies can update their own verification record
-- (Protection trigger prevents modification of verified/status fields)
create policy "verifications: nannies update own"
  on verifications
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_nanny()
  )
  with check (user_id = auth.uid());

-- Admin can read all verifications
create policy "verifications: admin reads all"
  on verifications
  for select
  to authenticated
  using (public.is_admin());

-- Admin can update any verification (including status fields)
create policy "verifications: admin updates all"
  on verifications
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can insert verifications
create policy "verifications: admin inserts all"
  on verifications
  for insert
  to authenticated
  with check (public.is_admin());


-- ============================================================================
-- SECTION 6: PARENT DOMAIN POLICIES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 6a. parents
-- ---------------------------------------------------------------------------

-- Parents can read their own record
create policy "parents: parents read own record"
  on parents
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_parent()
  );

-- Parents can create their own record during signup
create policy "parents: parents create own record"
  on parents
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_parent()
  );

-- Parents can update their own record
create policy "parents: parents update own record"
  on parents
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_parent()
  )
  with check (user_id = auth.uid());

-- Parents can delete their own record
create policy "parents: parents delete own record"
  on parents
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_parent()
  );

-- Nannies can read parents who sent them interview requests
create policy "parents: nannies read requesting parents"
  on parents
  for select
  to authenticated
  using (
    public.is_nanny()
    and exists (
      select 1 from interview_requests ir
      where ir.parent_id = parents.id
        and ir.nanny_id = public.get_nanny_id()
    )
  );

-- REMOVED: This policy caused infinite recursion (parents -> bsr_notifications -> get_parent_id -> parents)
-- When BSR is implemented, redesign using SECURITY DEFINER function to avoid circular reference
-- create policy "parents: nannies read bsr parents"
--   on parents
--   for select
--   to authenticated
--   using (
--     public.is_nanny()
--     and exists (
--       select 1 from bsr_notifications bn
--       join babysitting_requests br on bn.babysitting_request_id = br.id
--       where br.parent_id = parents.id
--         and bn.nanny_id = public.get_nanny_id()
--     )
--   );

-- Admin can read all parents
create policy "parents: admin reads all"
  on parents
  for select
  to authenticated
  using (public.is_admin());

-- Admin can insert parents
create policy "parents: admin inserts all"
  on parents
  for insert
  to authenticated
  with check (public.is_admin());

-- Admin can update all parents
create policy "parents: admin updates all"
  on parents
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can delete parents
create policy "parents: admin deletes all"
  on parents
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6b. nanny_positions
-- ---------------------------------------------------------------------------

-- Parents can read their own positions
create policy "nanny_positions: parents read own"
  on nanny_positions
  for select
  to authenticated
  using (parent_id = public.get_parent_id());

-- Parents can insert their own positions
create policy "nanny_positions: parents insert own"
  on nanny_positions
  for insert
  to authenticated
  with check (parent_id = public.get_parent_id());

-- Parents can update their own positions
create policy "nanny_positions: parents update own"
  on nanny_positions
  for update
  to authenticated
  using (parent_id = public.get_parent_id())
  with check (parent_id = public.get_parent_id());

-- Parents can delete their own positions
create policy "nanny_positions: parents delete own"
  on nanny_positions
  for delete
  to authenticated
  using (parent_id = public.get_parent_id());

-- Nannies can read positions linked to their interview requests
create policy "nanny_positions: nannies read interview positions"
  on nanny_positions
  for select
  to authenticated
  using (
    public.is_nanny()
    and exists (
      select 1 from interview_requests ir
      where ir.position_id = nanny_positions.id
        and ir.nanny_id = public.get_nanny_id()
    )
  );

-- Verified nannies can browse active positions
create policy "nanny_positions: verified nannies browse active"
  on nanny_positions
  for select
  to authenticated
  using (
    public.is_nanny()
    and status = 'active'
    and exists (
      select 1 from nannies n
      where n.id = public.get_nanny_id()
        and n.visible_in_match_making = true
    )
  );

-- Admin can read all positions
create policy "nanny_positions: admin reads all"
  on nanny_positions
  for select
  to authenticated
  using (public.is_admin());

-- Admin can insert positions
create policy "nanny_positions: admin inserts all"
  on nanny_positions
  for insert
  to authenticated
  with check (public.is_admin());

-- Admin can update all positions
create policy "nanny_positions: admin updates all"
  on nanny_positions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can delete positions
create policy "nanny_positions: admin deletes all"
  on nanny_positions
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6c. position_schedule
-- ---------------------------------------------------------------------------

-- Parents can read their own position schedules
create policy "position_schedule: parents read own"
  on position_schedule
  for select
  to authenticated
  using (
    exists (
      select 1 from nanny_positions np
      where np.id = position_schedule.position_id
        and np.parent_id = public.get_parent_id()
    )
  );

-- Parents can insert their own position schedules
create policy "position_schedule: parents insert own"
  on position_schedule
  for insert
  to authenticated
  with check (
    exists (
      select 1 from nanny_positions np
      where np.id = position_schedule.position_id
        and np.parent_id = public.get_parent_id()
    )
  );

-- Parents can update their own position schedules
create policy "position_schedule: parents update own"
  on position_schedule
  for update
  to authenticated
  using (
    exists (
      select 1 from nanny_positions np
      where np.id = position_schedule.position_id
        and np.parent_id = public.get_parent_id()
    )
  )
  with check (
    exists (
      select 1 from nanny_positions np
      where np.id = position_schedule.position_id
        and np.parent_id = public.get_parent_id()
    )
  );

-- Parents can delete their own position schedules
create policy "position_schedule: parents delete own"
  on position_schedule
  for delete
  to authenticated
  using (
    exists (
      select 1 from nanny_positions np
      where np.id = position_schedule.position_id
        and np.parent_id = public.get_parent_id()
    )
  );

-- Nannies can read schedules for their interview request positions
create policy "position_schedule: nannies read interview schedules"
  on position_schedule
  for select
  to authenticated
  using (
    public.is_nanny()
    and exists (
      select 1 from interview_requests ir
      where ir.position_id = position_schedule.position_id
        and ir.nanny_id = public.get_nanny_id()
    )
  );

-- Admin can read all schedules
create policy "position_schedule: admin reads all"
  on position_schedule
  for select
  to authenticated
  using (public.is_admin());

-- Admin can manage all schedules
create policy "position_schedule: admin inserts all"
  on position_schedule
  for insert
  to authenticated
  with check (public.is_admin());

create policy "position_schedule: admin updates all"
  on position_schedule
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "position_schedule: admin deletes all"
  on position_schedule
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6d. position_children
-- ---------------------------------------------------------------------------

-- Parents can read their own position children
create policy "position_children: parents read own"
  on position_children
  for select
  to authenticated
  using (
    exists (
      select 1 from nanny_positions np
      where np.id = position_children.position_id
        and np.parent_id = public.get_parent_id()
    )
  );

-- Parents can insert their own position children
create policy "position_children: parents insert own"
  on position_children
  for insert
  to authenticated
  with check (
    exists (
      select 1 from nanny_positions np
      where np.id = position_children.position_id
        and np.parent_id = public.get_parent_id()
    )
  );

-- Parents can update their own position children
create policy "position_children: parents update own"
  on position_children
  for update
  to authenticated
  using (
    exists (
      select 1 from nanny_positions np
      where np.id = position_children.position_id
        and np.parent_id = public.get_parent_id()
    )
  )
  with check (
    exists (
      select 1 from nanny_positions np
      where np.id = position_children.position_id
        and np.parent_id = public.get_parent_id()
    )
  );

-- Parents can delete their own position children
create policy "position_children: parents delete own"
  on position_children
  for delete
  to authenticated
  using (
    exists (
      select 1 from nanny_positions np
      where np.id = position_children.position_id
        and np.parent_id = public.get_parent_id()
    )
  );

-- Nannies can read children info for their interview request positions
create policy "position_children: nannies read interview children"
  on position_children
  for select
  to authenticated
  using (
    public.is_nanny()
    and exists (
      select 1 from interview_requests ir
      where ir.position_id = position_children.position_id
        and ir.nanny_id = public.get_nanny_id()
    )
  );

-- Admin can read all children
create policy "position_children: admin reads all"
  on position_children
  for select
  to authenticated
  using (public.is_admin());

-- Admin can manage all children
create policy "position_children: admin inserts all"
  on position_children
  for insert
  to authenticated
  with check (public.is_admin());

create policy "position_children: admin updates all"
  on position_children
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "position_children: admin deletes all"
  on position_children
  for delete
  to authenticated
  using (public.is_admin());


-- ============================================================================
-- SECTION 7: MATCHING & REQUEST POLICIES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 7a. interview_requests
-- ---------------------------------------------------------------------------

-- Parents can read their own interview requests
create policy "interview_requests: parents read own"
  on interview_requests
  for select
  to authenticated
  using (parent_id = public.get_parent_id());

-- Parents can insert their own interview requests
create policy "interview_requests: parents insert own"
  on interview_requests
  for insert
  to authenticated
  with check (parent_id = public.get_parent_id());

-- Parents can update their own interview requests
create policy "interview_requests: parents update own"
  on interview_requests
  for update
  to authenticated
  using (parent_id = public.get_parent_id())
  with check (parent_id = public.get_parent_id());

-- Parents can delete their own interview requests
create policy "interview_requests: parents delete own"
  on interview_requests
  for delete
  to authenticated
  using (parent_id = public.get_parent_id());

-- Nannies can read interview requests sent to them
create policy "interview_requests: nannies read own"
  on interview_requests
  for select
  to authenticated
  using (nanny_id = public.get_nanny_id());

-- Nannies can update response fields on their interview requests
-- (Protection trigger prevents modification of ownership fields)
create policy "interview_requests: nannies respond to requests"
  on interview_requests
  for update
  to authenticated
  using (nanny_id = public.get_nanny_id())
  with check (nanny_id = public.get_nanny_id());

-- Admin can read all interview requests
create policy "interview_requests: admin reads all"
  on interview_requests
  for select
  to authenticated
  using (public.is_admin());

-- Admin can insert interview requests
create policy "interview_requests: admin inserts all"
  on interview_requests
  for insert
  to authenticated
  with check (public.is_admin());

-- Admin can update all interview requests
create policy "interview_requests: admin updates all"
  on interview_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can delete interview requests
create policy "interview_requests: admin deletes all"
  on interview_requests
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7b. babysitting_requests
-- ---------------------------------------------------------------------------

-- Parents can read their own babysitting requests
create policy "babysitting_requests: parents read own"
  on babysitting_requests
  for select
  to authenticated
  using (parent_id = public.get_parent_id());

-- Parents can insert their own babysitting requests
create policy "babysitting_requests: parents insert own"
  on babysitting_requests
  for insert
  to authenticated
  with check (parent_id = public.get_parent_id());

-- Parents can update their own babysitting requests
create policy "babysitting_requests: parents update own"
  on babysitting_requests
  for update
  to authenticated
  using (parent_id = public.get_parent_id())
  with check (parent_id = public.get_parent_id());

-- Parents can delete their own babysitting requests
create policy "babysitting_requests: parents delete own"
  on babysitting_requests
  for delete
  to authenticated
  using (parent_id = public.get_parent_id());

-- Nannies can read babysitting requests they were notified about
create policy "babysitting_requests: nannies read notified"
  on babysitting_requests
  for select
  to authenticated
  using (
    public.is_nanny()
    and exists (
      select 1 from bsr_notifications bn
      where bn.babysitting_request_id = babysitting_requests.id
        and bn.nanny_id = public.get_nanny_id()
    )
  );

-- Admin can read all babysitting requests
create policy "babysitting_requests: admin reads all"
  on babysitting_requests
  for select
  to authenticated
  using (public.is_admin());

-- Admin can insert babysitting requests
create policy "babysitting_requests: admin inserts all"
  on babysitting_requests
  for insert
  to authenticated
  with check (public.is_admin());

-- Admin can update all babysitting requests
create policy "babysitting_requests: admin updates all"
  on babysitting_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can delete babysitting requests
create policy "babysitting_requests: admin deletes all"
  on babysitting_requests
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7c. bsr_time_slots
-- ---------------------------------------------------------------------------

-- Parents can read time slots for their own babysitting requests
create policy "bsr_time_slots: parents read own"
  on bsr_time_slots
  for select
  to authenticated
  using (
    exists (
      select 1 from babysitting_requests br
      where br.id = bsr_time_slots.babysitting_request_id
        and br.parent_id = public.get_parent_id()
    )
  );

-- Parents can insert time slots for their own babysitting requests
create policy "bsr_time_slots: parents insert own"
  on bsr_time_slots
  for insert
  to authenticated
  with check (
    exists (
      select 1 from babysitting_requests br
      where br.id = bsr_time_slots.babysitting_request_id
        and br.parent_id = public.get_parent_id()
    )
  );

-- Parents can update time slots for their own babysitting requests
create policy "bsr_time_slots: parents update own"
  on bsr_time_slots
  for update
  to authenticated
  using (
    exists (
      select 1 from babysitting_requests br
      where br.id = bsr_time_slots.babysitting_request_id
        and br.parent_id = public.get_parent_id()
    )
  )
  with check (
    exists (
      select 1 from babysitting_requests br
      where br.id = bsr_time_slots.babysitting_request_id
        and br.parent_id = public.get_parent_id()
    )
  );

-- Parents can delete time slots for their own babysitting requests
create policy "bsr_time_slots: parents delete own"
  on bsr_time_slots
  for delete
  to authenticated
  using (
    exists (
      select 1 from babysitting_requests br
      where br.id = bsr_time_slots.babysitting_request_id
        and br.parent_id = public.get_parent_id()
    )
  );

-- Nannies can read time slots for BSR they were notified about
create policy "bsr_time_slots: nannies read notified"
  on bsr_time_slots
  for select
  to authenticated
  using (
    public.is_nanny()
    and exists (
      select 1 from bsr_notifications bn
      where bn.babysitting_request_id = bsr_time_slots.babysitting_request_id
        and bn.nanny_id = public.get_nanny_id()
    )
  );

-- Admin can read all time slots
create policy "bsr_time_slots: admin reads all"
  on bsr_time_slots
  for select
  to authenticated
  using (public.is_admin());

-- Admin can manage all time slots
create policy "bsr_time_slots: admin inserts all"
  on bsr_time_slots
  for insert
  to authenticated
  with check (public.is_admin());

create policy "bsr_time_slots: admin updates all"
  on bsr_time_slots
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "bsr_time_slots: admin deletes all"
  on bsr_time_slots
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7d. bsr_notifications
-- ---------------------------------------------------------------------------

-- Parents can read notifications for their own babysitting requests
create policy "bsr_notifications: parents read own bsr notifications"
  on bsr_notifications
  for select
  to authenticated
  using (
    exists (
      select 1 from babysitting_requests br
      where br.id = bsr_notifications.babysitting_request_id
        and br.parent_id = public.get_parent_id()
    )
  );

-- Nannies can read their own notifications
create policy "bsr_notifications: nannies read own"
  on bsr_notifications
  for select
  to authenticated
  using (nanny_id = public.get_nanny_id());

-- Nannies can update response fields (accept/decline) on their notifications
-- (Protection trigger prevents modification of ownership fields)
create policy "bsr_notifications: nannies respond to notifications"
  on bsr_notifications
  for update
  to authenticated
  using (nanny_id = public.get_nanny_id())
  with check (nanny_id = public.get_nanny_id());

-- System/service role creates notifications (bypasses RLS).
-- No explicit insert policy for regular users.

-- Admin can read all notifications
create policy "bsr_notifications: admin reads all"
  on bsr_notifications
  for select
  to authenticated
  using (public.is_admin());

-- Admin can insert notifications
create policy "bsr_notifications: admin inserts all"
  on bsr_notifications
  for insert
  to authenticated
  with check (public.is_admin());

-- Admin can update all notifications
create policy "bsr_notifications: admin updates all"
  on bsr_notifications
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can delete notifications
create policy "bsr_notifications: admin deletes all"
  on bsr_notifications
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7e. nanny_placements
-- ---------------------------------------------------------------------------

-- Nannies can read their own placements
create policy "nanny_placements: nannies read own"
  on nanny_placements
  for select
  to authenticated
  using (nanny_id = public.get_nanny_id());

-- Parents can read their own placements
create policy "nanny_placements: parents read own"
  on nanny_placements
  for select
  to authenticated
  using (parent_id = public.get_parent_id());

-- Nannies can update their satisfaction ratings on their placements
-- (Protection triggers prevent modification of core fields and parent ratings)
create policy "nanny_placements: nannies update own ratings"
  on nanny_placements
  for update
  to authenticated
  using (nanny_id = public.get_nanny_id())
  with check (nanny_id = public.get_nanny_id());

-- Parents can update their satisfaction ratings on their placements
-- (Protection triggers prevent modification of core fields and nanny ratings)
create policy "nanny_placements: parents update own ratings"
  on nanny_placements
  for update
  to authenticated
  using (parent_id = public.get_parent_id())
  with check (parent_id = public.get_parent_id());

-- Admin can read all placements
create policy "nanny_placements: admin reads all"
  on nanny_placements
  for select
  to authenticated
  using (public.is_admin());

-- Admin can insert placements (admin creates placements)
create policy "nanny_placements: admin inserts all"
  on nanny_placements
  for insert
  to authenticated
  with check (public.is_admin());

-- Admin can update all placements
create policy "nanny_placements: admin updates all"
  on nanny_placements
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can delete placements
create policy "nanny_placements: admin deletes all"
  on nanny_placements
  for delete
  to authenticated
  using (public.is_admin());


-- ============================================================================
-- SECTION 8: LOGGING & REFERENCE POLICIES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 8a. sydney_postcodes
-- ---------------------------------------------------------------------------

-- All authenticated users can read postcodes (reference data)
create policy "sydney_postcodes: authenticated users read all"
  on sydney_postcodes
  for select
  to authenticated
  using (true);

-- Only super_admin can insert postcodes
create policy "sydney_postcodes: super admin inserts"
  on sydney_postcodes
  for insert
  to authenticated
  with check (public.is_super_admin());

-- Only super_admin can update postcodes
create policy "sydney_postcodes: super admin updates"
  on sydney_postcodes
  for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Only super_admin can delete postcodes
create policy "sydney_postcodes: super admin deletes"
  on sydney_postcodes
  for delete
  to authenticated
  using (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 8b. activity_logs
-- ---------------------------------------------------------------------------

-- Users can read their own activity logs
create policy "activity_logs: users read own"
  on activity_logs
  for select
  to authenticated
  using (user_id = auth.uid());

-- Authenticated users can insert their own activity logs
create policy "activity_logs: users insert own"
  on activity_logs
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Admin can read all activity logs
create policy "activity_logs: admin reads all"
  on activity_logs
  for select
  to authenticated
  using (public.is_admin());

-- Admin can insert activity logs (for system-generated entries)
create policy "activity_logs: admin inserts all"
  on activity_logs
  for insert
  to authenticated
  with check (public.is_admin());

-- No update or delete policies for activity_logs (immutable audit trail)

-- ---------------------------------------------------------------------------
-- 8c. email_logs
-- ---------------------------------------------------------------------------

-- Users can read their own email logs
create policy "email_logs: users read own"
  on email_logs
  for select
  to authenticated
  using (recipient_user_id = auth.uid());

-- Admin can read all email logs
create policy "email_logs: admin reads all"
  on email_logs
  for select
  to authenticated
  using (public.is_admin());

-- Admin can update email log status (e.g., mark as sent/failed)
create policy "email_logs: admin updates status"
  on email_logs
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin can insert email logs (system-generated)
create policy "email_logs: admin inserts all"
  on email_logs
  for insert
  to authenticated
  with check (public.is_admin());

-- No user insert, update, or delete policies for email_logs

-- ---------------------------------------------------------------------------
-- 8d. user_progress
-- ---------------------------------------------------------------------------

-- Users can read their own progress
create policy "user_progress: users read own"
  on user_progress
  for select
  to authenticated
  using (user_id = auth.uid());

-- Admin can read all progress for analytics
create policy "user_progress: admin reads all"
  on user_progress
  for select
  to authenticated
  using (public.is_admin());

-- Admin can insert progress records (system-generated)
create policy "user_progress: admin inserts all"
  on user_progress
  for insert
  to authenticated
  with check (public.is_admin());

-- System/service role handles progress inserts (bypasses RLS)

-- ---------------------------------------------------------------------------
-- 8e. file_retention_log
-- ---------------------------------------------------------------------------

-- Admin only - full access to file retention logs
create policy "file_retention_log: admin reads all"
  on file_retention_log
  for select
  to authenticated
  using (public.is_admin());

create policy "file_retention_log: admin inserts all"
  on file_retention_log
  for insert
  to authenticated
  with check (public.is_admin());

create policy "file_retention_log: admin updates all"
  on file_retention_log
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "file_retention_log: admin deletes all"
  on file_retention_log
  for delete
  to authenticated
  using (public.is_admin());


-- ============================================================================
-- POLICY SUMMARY
-- ============================================================================
--
-- Total policies: 166 across 23 tables
--
-- Per-table breakdown:
--   user_roles .............. 5  (select own, super_admin: select all/insert/update/delete)
--   user_profiles ........... 7  (select own, update own, insert own, parents select nanny profiles,
--                                 nannies select requesting parents, admin select, admin update)
--   sydney_postcodes ........ 4  (select all auth, super_admin insert/update/delete)
--   verifications ........... 6  (nanny select/insert/update, admin select/update/insert)
--   activity_logs ........... 4  (select own, insert own, admin select, admin insert)
--   email_logs .............. 4  (select own, admin select/update/insert)
--   user_progress ........... 3  (select own, admin select, admin insert)
--   nannies ................. 9  (nanny select/insert/update, parent select visible,
--                                 nanny select peers, admin select/update/insert/delete)
--   nanny_availability ...... 6  (nanny select/insert/update/delete, parent select, admin select)
--   nanny_credentials ....... 9  (nanny select/insert/update/delete, parent select verified,
--                                 admin select/insert/update/delete)
--   nanny_assurances ........ 9  (nanny select/insert/update/delete, parent select verified,
--                                 admin select/insert/update/delete)
--   nanny_images ............ 9  (nanny select/insert/update/delete, parent select approved,
--                                 admin select/insert/update/delete)
--   nanny_ai_content ........ 6  (nanny select, parent select approved,
--                                 admin select/insert/update/delete)
--   parents ................ 10  (parent select/insert/update/delete, nanny select requesting,
--                                 nanny select bsr, admin select/insert/update/delete)
--   nanny_positions ........ 10  (parent select/insert/update/delete, nanny select interview,
--                                 nanny browse active, admin select/insert/update/delete)
--   position_schedule ....... 9  (parent select/insert/update/delete, nanny select interview,
--                                 admin select/insert/update/delete)
--   position_children ....... 9  (parent select/insert/update/delete, nanny select interview,
--                                 admin select/insert/update/delete)
--   interview_requests ..... 10  (parent select/insert/update/delete, nanny select/update,
--                                 admin select/insert/update/delete)
--   babysitting_requests .... 9  (parent select/insert/update/delete, nanny select notified,
--                                 admin select/insert/update/delete)
--   bsr_time_slots .......... 9  (parent select/insert/update/delete, nanny select notified,
--                                 admin select/insert/update/delete)
--   bsr_notifications ....... 7  (parent select own bsr, nanny select/update,
--                                 admin select/insert/update/delete)
--   nanny_placements ........ 8  (nanny select/update, parent select/update,
--                                 admin select/insert/update/delete)
--   file_retention_log ...... 4  (admin select/insert/update/delete)
--
-- Protection triggers: 9
--   1. protect_nanny_verification_fields (nannies)
--   2. protect_verification_admin_fields (verifications)
--   3. protect_credential_verified_field (nanny_credentials)
--   4. protect_assurance_verified_field (nanny_assurances)
--   5. protect_image_approved_field (nanny_images)
--   6. protect_placement_core_fields (nanny_placements)
--   7. protect_placement_rating_isolation (nanny_placements)
--   8. protect_interview_request_ownership (interview_requests)
--   9. protect_bsr_notification_ownership (bsr_notifications)
--
-- Helper functions: 7
--   1. get_user_role()
--   2. is_nanny()
--   3. is_parent()
--   4. is_admin()
--   5. is_super_admin()
--   6. get_nanny_id()
--   7. get_parent_id()
--
-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
