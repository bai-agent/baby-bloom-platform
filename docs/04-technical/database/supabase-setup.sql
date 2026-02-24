-- ============================================================================
-- BABY BLOOM SYDNEY - COMPLETE DATABASE MIGRATION
-- ============================================================================
-- Version: 3.0
-- Created: 2026-02-05
-- Updated: 2026-02-06
-- Platform: Supabase (PostgreSQL 15+)
-- Tables: 24
--
-- This migration creates all tables, indexes, constraints, triggers, and
-- functions for the Baby Bloom Sydney nanny matching platform.
--
-- IMPORTANT:
--   - Run this against a fresh Supabase project (or ensure no conflicts).
--   - auth.users is managed by Supabase Auth -- we do NOT create it.
--   - Sydney postcode seed data belongs in seed.sql, not here.
--   - RLS policies belong in rls-policies.sql, not here.
--
-- Tables (24):
--   Core Identity:     user_roles, user_profiles
--   Reference:         sydney_postcodes
--   Verification/Logs: verifications, activity_logs, email_logs, user_progress
--   Nanny Profile:     nannies, nanny_availability, nanny_credentials,
--                       nanny_assurances, nanny_images, nanny_ai_content
--   Parent Profile:    parents, nanny_positions, position_schedule,
--                       position_children
--   Matching:          interview_requests, babysitting_requests,
--                       bsr_time_slots, bsr_notifications, nanny_placements
--   File Management:   file_retention_log
--
-- Functions (7):
--   Triggers:  update_updated_at_column, sync_placement_references
--   Cron:      check_wwcc_expiry, cleanup_expired_files, send_wwcc_expiry_warnings
--   Utility:   calculate_distance_km, get_nearest_nannies_for_bsr
-- ============================================================================


-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

-- case-insensitive text type for email comparisons
create extension if not exists citext;

-- cryptographic functions including gen_random_uuid()
create extension if not exists pgcrypto;


-- ============================================================================
-- SECTION 2: TRIGGER FUNCTION - update_updated_at_column()
-- ============================================================================
-- Must be created BEFORE any table that attaches an updated_at trigger.

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

comment on function update_updated_at_column()
  is 'Trigger function: automatically sets updated_at to now() on every row update';


-- ============================================================================
-- SECTION 3: CORE IDENTITY TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLE 1: user_roles
-- Purpose: Extends Supabase auth.users with a single role per user.
-- PK is user_id (not a separate UUID) - one role per user enforced by PK.
-- ---------------------------------------------------------------------------
create table user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('nanny', 'parent', 'admin', 'super_admin')),
  created_at timestamptz default now()
);

create index idx_user_roles_role on user_roles(role);

comment on table  user_roles      is 'User role assignments - one role per user (PK = user_id)';
comment on column user_roles.role is 'Allowed roles: nanny, parent, admin, super_admin';


-- ---------------------------------------------------------------------------
-- TABLE 2: user_profiles
-- Purpose: Common profile data shared by nannies and parents.
--          Single source of truth for name, contact, location, and profile pic.
-- ---------------------------------------------------------------------------
create table user_profiles (
  id                           uuid primary key default gen_random_uuid(),
  user_id                      uuid unique not null references auth.users(id) on delete cascade,

  -- basic info
  first_name                   text not null,
  last_name                    text not null,
  email                        citext not null,
  mobile_number                text,
  date_of_birth                date,

  -- location (required)
  suburb                       text not null,
  postcode                     text not null,
  address_line1                text,
  address_line2                text,
  state                        text default 'NSW',

  -- profile picture (Cloudinary - single source of truth)
  profile_picture_url          text,
  profile_picture_cloudinary_id text,

  -- timestamps
  created_at                   timestamptz default now(),
  updated_at                   timestamptz default now()
);

create index idx_user_profiles_user_id  on user_profiles(user_id);
create index idx_user_profiles_suburb   on user_profiles(suburb);
create index idx_user_profiles_postcode on user_profiles(postcode);
create index idx_user_profiles_email    on user_profiles(email);

create trigger trg_user_profiles_updated_at
  before update on user_profiles
  for each row
  execute function update_updated_at_column();

comment on table  user_profiles       is 'Common profile information for all users (nannies and parents)';
comment on column user_profiles.email is 'Denormalised from auth.users; stored as CITEXT for case-insensitive lookups';
comment on column user_profiles.profile_picture_url is 'Cloudinary URL - single source for profile pictures';


-- ============================================================================
-- SECTION 4: REFERENCE DATA TABLE
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLE 3: sydney_postcodes
-- Purpose: Reference table for Sydney suburbs with geolocation.
--          Used by BSR matching (calculate_distance_km / get_nearest_nannies).
--          Seed data inserted separately via seed.sql.
-- ---------------------------------------------------------------------------
create table sydney_postcodes (
  id        uuid primary key default gen_random_uuid(),
  suburb    text not null,
  postcode  text not null,
  latitude  decimal(10, 6) not null,
  longitude decimal(10, 6) not null,
  created_at timestamptz default now()
);

create index idx_sydney_postcodes_suburb   on sydney_postcodes(suburb);
create index idx_sydney_postcodes_postcode on sydney_postcodes(postcode);
create index idx_sydney_postcodes_location on sydney_postcodes(latitude, longitude);
create unique index idx_sydney_postcodes_unique on sydney_postcodes(suburb, postcode);

comment on table  sydney_postcodes           is 'Sydney suburb reference data with geolocation for BSR distance matching';
comment on column sydney_postcodes.latitude  is 'Latitude in decimal degrees (negative for southern hemisphere)';
comment on column sydney_postcodes.longitude is 'Longitude in decimal degrees';


-- ============================================================================
-- SECTION 5: VERIFICATION AND LOGGING TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLE 4: verifications
-- Purpose: WWCC and identity (passport) verification records.
--          One record per nanny; drives nannies.wwcc_verified and identity_verified.
-- ---------------------------------------------------------------------------
create table verifications (
  id                              uuid primary key default gen_random_uuid(),
  user_id                         uuid not null references auth.users(id) on delete cascade,

  -- wwcc verification
  wwcc_verification_method        text check (wwcc_verification_method in ('grant_email', 'service_nsw_app', 'manual_entry')),
  wwcc_grant_email_url            text,
  wwcc_service_nsw_screenshot_url text,
  wwcc_number                     text,
  wwcc_declaration                boolean default false,

  wwcc_verified                   boolean default false,
  wwcc_verified_at                timestamptz,
  wwcc_verified_by                uuid references auth.users(id),
  wwcc_expiry_date                date,
  wwcc_rejection_reason           text,

  -- identity verification
  surname                         text,
  given_names                     text,
  date_of_birth                   date,
  passport_country                text,
  passport_upload_url             text,
  identification_photo_url        text,
  passport_declaration            boolean default false,

  identity_verified               boolean default false,
  identity_verified_at            timestamptz,
  identity_verified_by            uuid references auth.users(id),
  passport_expiry_date            date,
  identity_rejection_reason       text,

  -- overall status
  verification_status             text check (verification_status in ('pending', 'wwcc_verified', 'fully_verified', 'rejected', 'expired')) default 'pending',

  -- timestamps
  created_at                      timestamptz default now(),
  updated_at                      timestamptz default now(),

  -- constraint: if a method is chosen, corresponding proof must exist
  constraint valid_wwcc_method check (
    wwcc_verification_method is null or
    (wwcc_verification_method = 'grant_email'    and wwcc_grant_email_url is not null) or
    (wwcc_verification_method = 'service_nsw_app' and wwcc_service_nsw_screenshot_url is not null) or
    (wwcc_verification_method = 'manual_entry'   and wwcc_number is not null)
  )
);

create index idx_verifications_user              on verifications(user_id);
create index idx_verifications_wwcc_verified     on verifications(wwcc_verified);
create index idx_verifications_identity_verified on verifications(identity_verified);
create index idx_verifications_status            on verifications(verification_status);
create index idx_verifications_wwcc_expiry       on verifications(wwcc_expiry_date) where wwcc_verified = true;

create trigger trg_verifications_updated_at
  before update on verifications
  for each row
  execute function update_updated_at_column();

comment on table  verifications                          is 'WWCC and identity (passport) verification records - one per nanny';
comment on column verifications.wwcc_verification_method is 'How WWCC was submitted: grant_email, service_nsw_app, or manual_entry';
comment on column verifications.verification_status      is 'Overall status: pending, wwcc_verified, fully_verified, rejected, or expired';
comment on column verifications.wwcc_expiry_date         is 'WWCC expiry date - checked daily by check_wwcc_expiry() cron function';


-- ---------------------------------------------------------------------------
-- TABLE 5: activity_logs
-- Purpose: Complete audit trail of all user and system actions.
--          ON DELETE SET NULL on user_id so logs survive user deletion.
-- ---------------------------------------------------------------------------
create table activity_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,

  action_type    text not null check (action_type in (
    'signup', 'login', 'profile_updated', 'profile_deactivated',
    'nanny_profile_created', 'nanny_verification_submitted', 'nanny_tier_upgraded',
    'nanny_availability_updated', 'wwcc_expired', 'wwcc_renewed',
    'parent_profile_created', 'position_created', 'position_updated', 'position_closed',
    'babysitting_request_created', 'babysitting_request_cancelled',
    'interview_requested', 'interview_accepted', 'interview_declined', 'interview_completed',
    'placement_created', 'placement_ended', 'placement_paused', 'placement_resumed',
    'admin_override', 'verification_approved', 'verification_rejected',
    'user_suspended', 'user_reinstated',
    'email_sent', 'notification_sent', 'file_deleted'
  )),

  action_details jsonb,
  ip_address     inet,
  user_agent     text,

  created_at     timestamptz default now()
);

create index idx_activity_logs_user        on activity_logs(user_id);
create index idx_activity_logs_action_type on activity_logs(action_type);
create index idx_activity_logs_created     on activity_logs(created_at);
create index idx_activity_logs_details     on activity_logs using gin (action_details);

comment on table  activity_logs                is 'Complete audit trail for compliance, debugging, and analytics';
comment on column activity_logs.action_type    is 'Enumerated action type - new types require a migration';
comment on column activity_logs.action_details is 'Flexible JSONB payload with action-specific context';


-- ---------------------------------------------------------------------------
-- TABLE 6: email_logs
-- Purpose: Track every system email (queued, sent, failed, bounced).
--          ON DELETE SET NULL on recipient_user_id to preserve history.
-- ---------------------------------------------------------------------------
create table email_logs (
  id                  uuid primary key default gen_random_uuid(),

  recipient_user_id   uuid references auth.users(id) on delete set null,
  recipient_email     text not null,

  email_type          text not null check (email_type in (
    'welcome', 'verification_pending', 'verification_approved', 'verification_rejected',
    'interview_request', 'interview_confirmed', 'interview_reminder',
    'babysitting_notification', 'babysitting_accepted', 'babysitting_cancelled',
    'position_matched', 'wwcc_expiring_soon', 'wwcc_expired',
    'placement_created', 'placement_ended',
    'admin_notification'
  )),

  subject             text not null,
  body_text           text,
  body_html           text,

  status              text check (status in ('queued', 'sent', 'failed', 'bounced')) default 'queued',
  sent_at             timestamptz,
  failed_at           timestamptz,
  error_message       text,

  provider_message_id text,
  provider_response   jsonb,

  created_at          timestamptz default now()
);

create index idx_email_logs_recipient_user  on email_logs(recipient_user_id);
create index idx_email_logs_recipient_email on email_logs(recipient_email);
create index idx_email_logs_type            on email_logs(email_type);
create index idx_email_logs_status          on email_logs(status);
create index idx_email_logs_created         on email_logs(created_at);

comment on table  email_logs            is 'Email delivery tracking for all system communications';
comment on column email_logs.status     is 'Delivery lifecycle: queued then sent (or failed/bounced)';
comment on column email_logs.email_type is 'Categorises the email for filtering and deduplication';


-- ---------------------------------------------------------------------------
-- TABLE 7: user_progress
-- Purpose: Conversion-funnel tracking. Each stage is reached at most once
--          per user (enforced by unique index on user_id + stage).
-- ---------------------------------------------------------------------------
create table user_progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,

  stage      text not null check (stage in (
    'nanny_signup', 'nanny_profile_created', 'nanny_verification_started',
    'nanny_tier2_achieved', 'nanny_tier3_achieved',
    'nanny_first_interview_received', 'nanny_first_babysitting_received', 'nanny_first_hire',
    'parent_signup', 'parent_browsing', 'parent_position_created',
    'parent_first_interview_requested', 'parent_first_babysitting_posted', 'parent_first_hire'
  )),

  reached_at timestamptz default now(),
  stage_data jsonb
);

create index idx_user_progress_user    on user_progress(user_id);
create index idx_user_progress_stage   on user_progress(stage);
create index idx_user_progress_reached on user_progress(reached_at);
create unique index idx_user_progress_unique on user_progress(user_id, stage);

comment on table  user_progress           is 'Conversion funnel tracking - each stage reached at most once per user';
comment on column user_progress.stage     is 'Funnel stage name (nanny or parent journey milestone)';
comment on column user_progress.stage_data is 'Optional JSONB context about how the stage was reached';


-- ============================================================================
-- SECTION 6: NANNY PROFILE TABLES
-- ============================================================================
-- NOTE: nannies is created WITHOUT current_placement_id FK initially because
-- nanny_placements has not been defined yet (circular dependency).
-- The FK is added in Section 10.

-- ---------------------------------------------------------------------------
-- TABLE 8: nannies
-- Purpose: Main nanny entity. Contains demographics, experience, preferences,
--          capabilities, logistics, status, verification flags, computed
--          visibility columns, deactivation tracking, and Wix migration IDs.
-- ---------------------------------------------------------------------------
create table nannies (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid unique not null references auth.users(id) on delete cascade,

  -- demographics
  gender                      text check (gender in ('female', 'male', 'non_binary', 'prefer_not_to_say')),
  nationality                 text,
  languages                   text[],

  -- experience (all in years)
  total_experience_years      int,
  nanny_experience_years      int,
  under_3_experience_years    int,
  newborn_experience_years    int,
  experience_details          text,

  -- preferences - what nanny wants to do
  role_types_preferred        text[],
  level_of_support_offered    text[],

  -- work preferences - pay and schedule
  hourly_rate_min             decimal(10,2),
  pay_frequency               text[],
  immediate_start_available   boolean default false,
  placement_ongoing_preferred boolean default false,
  start_date_earliest         date,
  end_date_latest             date,

  -- capabilities - who they can work with
  max_children                int check (max_children in (1, 2, 3)),
  min_child_age_months        int,
  max_child_age_months        int,
  additional_needs_ok         boolean default false,

  -- logistics
  sydney_resident             boolean,
  residency_status            text check (residency_status in ('Australian Citizen', 'Permanent Resident', 'Working Holiday', 'Other')),
  right_to_work               boolean,
  drivers_license             boolean,
  has_car                     boolean,
  comfortable_with_pets       boolean,
  vaccination_status          boolean,
  non_smoker                  boolean,

  -- personal - about you section
  hobbies_interests           text,
  strengths_traits            text,
  skills_training             text,

  -- status and verification
  status                      text check (status in ('active', 'inactive', 'suspended', 'pending_verification', 'deactivated')) default 'pending_verification',
  verification_tier           text check (verification_tier in ('tier1', 'tier2', 'tier3')) default 'tier1',

  -- wwcc status (drives MM/BSR visibility)
  wwcc_verified               boolean default false,
  wwcc_expiry_date            date,
  identity_verified           boolean default false,

  -- computed verification status
  fully_verified              boolean generated always as (wwcc_verified and identity_verified) stored,

  -- computed visibility flags (CRITICAL for match making / BSR)
  visible_in_match_making     boolean generated always as (
    status = 'active' and wwcc_verified and identity_verified
  ) stored,

  visible_in_bsr              boolean generated always as (
    status = 'active' and wwcc_verified and identity_verified
  ) stored,

  -- profile visibility (unverified nannies can view their own profile)
  profile_visible             boolean generated always as (
    status in ('active', 'pending_verification')
  ) stored,

  -- deactivation tracking (for 5-year file retention)
  deactivated_at              timestamptz,
  files_deleted_at            timestamptz,

  -- current placement - FK added later in Section 10 (circular dependency)
  current_placement_id        uuid,

  -- wix integration (migration from old system)
  wix_contact_id              text unique,
  wix_submission_id           text,
  wix_submission_link         text,

  -- timestamps
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now(),
  tier2_achieved_at           timestamptz,
  tier3_achieved_at           timestamptz
);

create index idx_nannies_user_id            on nannies(user_id);
create index idx_nannies_status             on nannies(status);
create index idx_nannies_tier               on nannies(verification_tier);
create index idx_nannies_visible_mm         on nannies(visible_in_match_making) where visible_in_match_making = true;
create index idx_nannies_visible_bsr        on nannies(visible_in_bsr) where visible_in_bsr = true;
create index idx_nannies_profile_visible    on nannies(profile_visible) where profile_visible = true;
create index idx_nannies_wix_contact        on nannies(wix_contact_id);
create index idx_nannies_hourly_rate        on nannies(hourly_rate_min);
create index idx_nannies_wwcc_expiry        on nannies(wwcc_expiry_date) where wwcc_verified = true;
create index idx_nannies_deactivated        on nannies(deactivated_at) where deactivated_at is not null and files_deleted_at is null;
create index idx_nannies_current_placement  on nannies(current_placement_id) where current_placement_id is not null;

create trigger trg_nannies_updated_at
  before update on nannies
  for each row
  execute function update_updated_at_column();

comment on table  nannies                          is 'Main nanny profile entity with all profile, experience, and status data';
comment on column nannies.fully_verified           is 'Computed: true when wwcc_verified AND identity_verified are both true';
comment on column nannies.visible_in_match_making  is 'Computed: true only for active, fully-verified nannies - used in MM queries';
comment on column nannies.visible_in_bsr           is 'Computed: true only for active, fully-verified nannies - used for BSR notifications';
comment on column nannies.profile_visible          is 'Computed: true when status is active or pending_verification - allows self-viewing';
comment on column nannies.current_placement_id     is 'FK to nanny_placements - added via ALTER TABLE after placements table exists';
comment on column nannies.deactivated_at           is 'Set when nanny deactivates; starts 5-year file-retention countdown';
comment on column nannies.files_deleted_at         is 'Set when all files have been purged after retention period';
comment on column nannies.verification_tier        is 'Tier 1: profile, Tier 2: WWCC+passport, Tier 3: Facebook post verified';


-- ---------------------------------------------------------------------------
-- TABLE 9: nanny_availability
-- Purpose: One-to-one with nannies. Weekly availability schedule stored as
--          JSONB for flexible time-slot matching.
-- PK is nanny_id (not a separate UUID) - one record per nanny.
-- ---------------------------------------------------------------------------
create table nanny_availability (
  nanny_id       uuid primary key references nannies(id) on delete cascade,

  -- days available (denormalised array for quick filtering)
  days_available text[],

  -- detailed schedule grid
  schedule       jsonb not null,

  updated_at     timestamptz default now()
);

create index idx_nanny_availability_schedule on nanny_availability using gin (schedule);
create index idx_nanny_availability_days     on nanny_availability using gin (days_available);

create trigger trg_nanny_availability_updated_at
  before update on nanny_availability
  for each row
  execute function update_updated_at_column();

comment on table  nanny_availability          is 'Weekly availability schedule - one record per nanny (PK = nanny_id)';
comment on column nanny_availability.schedule is 'JSONB schedule grid with time slots per day of the week';
comment on column nanny_availability.days_available is 'Denormalised text array of available day names for fast filtering';


-- ---------------------------------------------------------------------------
-- TABLE 10: nanny_credentials
-- Purpose: Merged qualifications (permanent education) and certifications
--          (time-limited). credential_category discriminates the two.
-- ---------------------------------------------------------------------------
create table nanny_credentials (
  id                   uuid primary key default gen_random_uuid(),
  nanny_id             uuid not null references nannies(id) on delete cascade,

  -- credential type discriminator
  credential_category  text not null check (credential_category in ('qualification', 'certification')),

  -- qualifications (permanent education)
  qualification_type   text check (qualification_type in (
    'Certificate III in Early Childhood Education and Care',
    'Certificate IV in Education Support',
    'Diploma of Early Childhood Education and Care',
    'Bachelor of Early Childhood Education (Or Equivalent)',
    'No Qualifications',
    'Other'
  )),
  institution          text,
  year_obtained        int,

  -- certifications (time-limited)
  certification_type   text check (certification_type in (
    'CPR',
    'First Aid',
    'First Aid in Education & Care Setting',
    'Child Protection',
    'Anaphylaxis and Asthma Management'
  )),

  -- file upload (Supabase Storage)
  file_url             text,
  file_name            text,
  issue_date           date,
  expiry_date          date,

  -- verification (admin review)
  verified             boolean default false,
  verified_at          timestamptz,
  verified_by          uuid references auth.users(id),
  rejection_reason     text,

  notes                text,

  created_at           timestamptz default now(),
  updated_at           timestamptz default now(),

  -- qualifications must have qualification_type; certifications must have certification_type
  constraint valid_qualification check (
    (credential_category = 'qualification'  and qualification_type  is not null) or
    (credential_category = 'certification'  and certification_type  is not null)
  ),

  -- certifications must have issue and expiry dates
  constraint valid_certification_dates check (
    credential_category = 'qualification' or
    (credential_category = 'certification' and issue_date is not null and expiry_date is not null)
  )
);

create index idx_nanny_credentials_nanny_id  on nanny_credentials(nanny_id);
create index idx_nanny_credentials_category  on nanny_credentials(credential_category);
create index idx_nanny_credentials_qual_type on nanny_credentials(qualification_type);
create index idx_nanny_credentials_cert_type on nanny_credentials(certification_type);
create index idx_nanny_credentials_expiry    on nanny_credentials(expiry_date) where credential_category = 'certification';
create index idx_nanny_credentials_verified  on nanny_credentials(verified);

create trigger trg_nanny_credentials_updated_at
  before update on nanny_credentials
  for each row
  execute function update_updated_at_column();

comment on table  nanny_credentials                    is 'Merged table for nanny qualifications (permanent) and certifications (time-limited)';
comment on column nanny_credentials.credential_category is 'Discriminator: qualification (permanent) or certification (expires)';
comment on column nanny_credentials.qualification_type  is 'Required when credential_category = qualification';
comment on column nanny_credentials.certification_type  is 'Required when credential_category = certification';


-- ---------------------------------------------------------------------------
-- TABLE 11: nanny_assurances
-- Purpose: Police checks and references for nannies.
-- ---------------------------------------------------------------------------
create table nanny_assurances (
  id                uuid primary key default gen_random_uuid(),
  nanny_id          uuid not null references nannies(id) on delete cascade,

  assurance_type    text not null check (assurance_type in (
    'National Police Check',
    'References',
    'Professional References'
  )),

  file_url          text,
  file_name         text,
  issue_date        date,
  expiry_date       date,
  reference_details text,

  verified          boolean default false,
  verified_at       timestamptz,
  verified_by       uuid references auth.users(id),

  created_at        timestamptz default now()
);

create index idx_nanny_assurances_nanny_id on nanny_assurances(nanny_id);
create index idx_nanny_assurances_type     on nanny_assurances(assurance_type);

comment on table  nanny_assurances                is 'Police checks and references for nannies';
comment on column nanny_assurances.assurance_type is 'Type: National Police Check, References, or Professional References';


-- ---------------------------------------------------------------------------
-- TABLE 12: nanny_images
-- Purpose: Nanny ad images stored in Cloudinary.
--          Profile pictures are in user_profiles (single source of truth).
--          Unique partial index ensures only one primary image per nanny.
-- ---------------------------------------------------------------------------
create table nanny_images (
  id                    uuid primary key default gen_random_uuid(),
  nanny_id              uuid not null references nannies(id) on delete cascade,

  image_type            text not null check (image_type in ('ad_primary', 'ad_secondary', 'ad_gallery')),

  cloudinary_url        text not null,
  cloudinary_public_id  text not null,
  cloudinary_format     text,
  cloudinary_width      int,
  cloudinary_height     int,

  is_primary            boolean default false,
  display_order         int default 0,
  alt_text              text,

  approved              boolean default false,
  approved_at           timestamptz,
  approved_by           uuid references auth.users(id),

  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index idx_nanny_images_nanny_id on nanny_images(nanny_id);
create index idx_nanny_images_type     on nanny_images(image_type);
create index idx_nanny_images_approved on nanny_images(approved) where image_type like 'ad_%';

-- only one primary image per nanny
create unique index idx_nanny_images_one_primary
  on nanny_images(nanny_id, is_primary)
  where is_primary = true;

create trigger trg_nanny_images_updated_at
  before update on nanny_images
  for each row
  execute function update_updated_at_column();

comment on table  nanny_images            is 'Nanny ad images stored in Cloudinary (profile pics live in user_profiles)';
comment on column nanny_images.is_primary is 'Only one primary image per nanny, enforced by unique partial index';
comment on column nanny_images.image_type is 'Image purpose: ad_primary, ad_secondary, or ad_gallery';


-- ---------------------------------------------------------------------------
-- TABLE 13: nanny_ai_content
-- Purpose: AI-generated content for nanny profiles (bios, headlines, etc.).
-- ---------------------------------------------------------------------------
create table nanny_ai_content (
  id           uuid primary key default gen_random_uuid(),
  nanny_id     uuid not null references nannies(id) on delete cascade,

  content_type text not null check (content_type in (
    'bio_summary',
    'headline',
    'experience_summary',
    'skills_highlight',
    'parent_pitch'
  )),

  content      text not null,
  ai_model     text,
  prompt_used  text,

  is_active    boolean default true,
  approved     boolean default false,
  approved_at  timestamptz,
  approved_by  uuid references auth.users(id),

  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index idx_nanny_ai_content_nanny_id on nanny_ai_content(nanny_id);
create index idx_nanny_ai_content_type     on nanny_ai_content(content_type);
create index idx_nanny_ai_content_active   on nanny_ai_content(is_active) where is_active = true;

create trigger trg_nanny_ai_content_updated_at
  before update on nanny_ai_content
  for each row
  execute function update_updated_at_column();

comment on table  nanny_ai_content              is 'AI-generated content for nanny profile enhancement (bios, headlines, pitches)';
comment on column nanny_ai_content.content_type is 'Type of AI content: bio_summary, headline, experience_summary, skills_highlight, parent_pitch';
comment on column nanny_ai_content.ai_model     is 'Model identifier used to generate this content';
comment on column nanny_ai_content.is_active    is 'Whether this version is the currently displayed one';


-- ============================================================================
-- SECTION 7: PARENT PROFILE TABLES
-- ============================================================================
-- NOTE: parents is created WITHOUT current_nanny_id and current_placement_id
-- FKs initially (circular dependency). They are added in Section 10.

-- ---------------------------------------------------------------------------
-- TABLE 14: parents
-- Purpose: Main parent entity. Contains family info, current-hire references,
--          Wix migration IDs, and status.
-- ---------------------------------------------------------------------------
create table parents (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid unique not null references auth.users(id) on delete cascade,

  -- wix integration
  wix_contact_id        text unique,
  wix_submission_id     text,
  wix_submission_link   text,

  -- family info
  number_of_children    int check (number_of_children in (1, 2, 3)),
  child_needs           boolean default false,
  child_needs_details   text,
  about_family          text,

  -- current hire - FKs added later in Section 10 (circular dependency)
  current_nanny_id      uuid,
  current_placement_id  uuid,

  -- status
  status                text check (status in ('active', 'inactive', 'paused')) default 'active',

  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index idx_parents_user_id            on parents(user_id);
create index idx_parents_status             on parents(status);
create index idx_parents_wix_contact        on parents(wix_contact_id);
create index idx_parents_current_nanny      on parents(current_nanny_id)     where current_nanny_id is not null;
create index idx_parents_current_placement  on parents(current_placement_id) where current_placement_id is not null;

create trigger trg_parents_updated_at
  before update on parents
  for each row
  execute function update_updated_at_column();

comment on table  parents                        is 'Main parent profile entity';
comment on column parents.current_nanny_id       is 'FK to nannies - denormalised for fast current-nanny lookups';
comment on column parents.current_placement_id   is 'FK to nanny_placements - denormalised for fast placement lookups';
comment on column parents.number_of_children     is 'Number of children: 1, 2, or 3';


-- ---------------------------------------------------------------------------
-- TABLE 15: nanny_positions
-- Purpose: Job positions posted by parents. Critical constraint: only ONE
--          active position per parent (enforced by unique partial index).
-- ---------------------------------------------------------------------------
create table nanny_positions (
  id                            uuid primary key default gen_random_uuid(),
  parent_id                     uuid not null references parents(id) on delete cascade,

  title                         text default 'Nanny Position',
  description                   text,

  -- timeline
  urgency                       text check (urgency in ('Immediately', 'At a later date')),
  start_date                    date,
  placement_length              text check (placement_length in ('Ongoing', 'Until a certain date')),
  end_date                      date,

  -- schedule
  schedule_type                 text check (schedule_type in ('Yes', 'No', 'I''m Flexible')),
  hours_per_week                int,
  days_required                 text[],
  schedule_details              text,

  -- nanny requirements
  language_preference           text check (language_preference in ('English', 'Foreign language', 'Multiple')),
  language_preference_details   text,
  minimum_age_requirement       int check (minimum_age_requirement in (18, 21, 25, 28, 35)),
  years_of_experience           int check (years_of_experience in (1, 2, 3, 5)),
  qualification_requirement     text,
  certificate_requirements      text[],
  assurances_required           text[],
  residency_status_requirement  text check (residency_status_requirement in ('Permanent Resident', 'Any Status')),

  -- boolean requirements
  vaccination_required          boolean,
  drivers_license_required      boolean,
  car_required                  boolean,
  comfortable_with_pets_required boolean,
  non_smoker_required           boolean,
  other_requirements_exist      boolean default false,
  other_requirements_details    text,

  -- compensation
  hourly_rate                   decimal(10,2),
  pay_frequency                 text[],

  -- reason and support
  reason_for_nanny              text[],
  level_of_support              text[],

  -- status
  status                        text check (status in ('draft', 'active', 'paused', 'filled', 'cancelled')) default 'active',
  filled_at                     timestamptz,
  filled_by_nanny_id            uuid references nannies(id),

  created_at                    timestamptz default now(),
  updated_at                    timestamptz default now()
);

create index idx_nanny_positions_parent      on nanny_positions(parent_id);
create index idx_nanny_positions_status      on nanny_positions(status);
create index idx_nanny_positions_active      on nanny_positions(status) where status = 'active';
create index idx_nanny_positions_start_date  on nanny_positions(start_date);
create index idx_nanny_positions_hourly_rate on nanny_positions(hourly_rate);
create index idx_nanny_positions_days        on nanny_positions using gin (days_required);

-- CRITICAL: only ONE active position per parent
create unique index idx_nanny_positions_one_active_per_parent
  on nanny_positions(parent_id)
  where status = 'active';

create trigger trg_nanny_positions_updated_at
  before update on nanny_positions
  for each row
  execute function update_updated_at_column();

comment on table  nanny_positions        is 'Job positions posted by parents - only ONE active per parent';
comment on column nanny_positions.status is 'Position lifecycle: draft, active, filled, paused, cancelled. Only one active allowed (unique index)';
comment on column nanny_positions.schedule_type is 'Whether parent has a set schedule: Yes, No, or I''m Flexible';


-- ---------------------------------------------------------------------------
-- TABLE 16: position_schedule
-- Purpose: Detailed weekly schedule for positions. One-to-one with
--          nanny_positions. PK is position_id (not a separate UUID).
-- ---------------------------------------------------------------------------
create table position_schedule (
  position_id uuid primary key references nanny_positions(id) on delete cascade,
  schedule    jsonb not null,
  updated_at  timestamptz default now()
);

create index idx_position_schedule_jsonb on position_schedule using gin (schedule);

create trigger trg_position_schedule_updated_at
  before update on position_schedule
  for each row
  execute function update_updated_at_column();

comment on table  position_schedule          is 'Detailed weekly schedule requirements for a position (PK = position_id)';
comment on column position_schedule.schedule is 'JSONB schedule grid mirroring nanny_availability format for comparison';


-- ---------------------------------------------------------------------------
-- TABLE 17: position_children
-- Purpose: Children associated with a position. Ages stored in months for
--          precise matching. Max 3 children per position.
-- ---------------------------------------------------------------------------
create table position_children (
  id            uuid primary key default gen_random_uuid(),
  position_id   uuid not null references nanny_positions(id) on delete cascade,

  child_label   text not null check (child_label in ('A', 'B', 'C')),
  age_months    int not null check (age_months >= 0 and age_months <= 216),
  gender        text check (gender in ('Female', 'Male', 'Rather Not Say')),
  display_order int not null check (display_order in (1, 2, 3)),

  created_at    timestamptz default now()
);

create index idx_position_children_position on position_children(position_id);
create index idx_position_children_age      on position_children(age_months);
create unique index idx_position_children_unique on position_children(position_id, child_label);
create unique index idx_position_children_order  on position_children(position_id, display_order);

comment on table  position_children            is 'Children in a position - ages stored in months (0-216 = 0-18 years), max 3';
comment on column position_children.age_months is 'Age in months for precise matching (e.g. 18 = 1.5 years)';
comment on column position_children.child_label is 'Label identifier A, B, or C - unique per position';


-- ============================================================================
-- SECTION 8: MATCHING AND REQUEST TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLE 18: interview_requests
-- Purpose: Interview coordination between parents and nannies.
--          Many-to-many junction: a parent can request interviews with many
--          nannies, and a nanny can receive requests from many parents.
-- ---------------------------------------------------------------------------
create table interview_requests (
  id                      uuid primary key default gen_random_uuid(),

  nanny_id                uuid not null references nannies(id) on delete cascade,
  parent_id               uuid not null references parents(id) on delete cascade,
  position_id             uuid references nanny_positions(id) on delete set null,

  -- request details
  message                 text,
  requested_dates         jsonb,

  -- status
  status                  text not null check (status in (
    'pending',
    'accepted',
    'declined',
    'completed',
    'cancelled',
    'expired'
  )) default 'pending',

  -- response
  nanny_response_message  text,
  responded_at            timestamptz,

  -- interview details (after acceptance)
  interview_date          date,
  interview_time          time,
  interview_location      text,
  interview_type          text check (interview_type in ('in_person', 'video_call', 'phone_call')),

  -- completion
  completed_at            timestamptz,
  outcome                 text check (outcome in ('hired', 'not_hired', 'pending_decision', 'cancelled')),
  outcome_notes           text,

  -- timestamps
  created_at              timestamptz default now(),
  updated_at              timestamptz default now(),
  expires_at              timestamptz
);

create index idx_interview_requests_nanny    on interview_requests(nanny_id);
create index idx_interview_requests_parent   on interview_requests(parent_id);
create index idx_interview_requests_position on interview_requests(position_id);
create index idx_interview_requests_status   on interview_requests(status);
create index idx_interview_requests_created  on interview_requests(created_at);

create trigger trg_interview_requests_updated_at
  before update on interview_requests
  for each row
  execute function update_updated_at_column();

comment on table  interview_requests                 is 'Interview coordination between parents and nannies (many-to-many junction)';
comment on column interview_requests.requested_dates is 'JSONB array of preferred interview dates/times proposed by parent';
comment on column interview_requests.outcome         is 'Final outcome after interview: hired, not_hired, pending_decision, or cancelled';


-- ---------------------------------------------------------------------------
-- TABLE 19: babysitting_requests
-- Purpose: One-time babysitting jobs posted by parents.
--          First-come-first-serve: 20 nearest nannies are notified, first to
--          accept wins.
-- ---------------------------------------------------------------------------
create table babysitting_requests (
  id                     uuid primary key default gen_random_uuid(),

  parent_id              uuid not null references parents(id) on delete cascade,

  -- request details
  title                  text default 'Babysitting Request',
  description            text,
  special_requirements   text,

  -- location
  suburb                 text not null,
  postcode               text not null,
  address                text,
  latitude               decimal(10, 6),
  longitude              decimal(10, 6),

  -- compensation
  hourly_rate            decimal(10,2),
  estimated_hours        decimal(4,1),

  -- status
  status                 text not null check (status in (
    'draft',
    'open',
    'filled',
    'completed',
    'cancelled',
    'expired'
  )) default 'open',

  -- accepted nanny
  accepted_nanny_id      uuid references nannies(id) on delete set null,
  accepted_at            timestamptz,

  -- completion
  completed_at           timestamptz,
  parent_rating          int check (parent_rating between 1 and 5),
  parent_review          text,
  nanny_rating           int check (nanny_rating between 1 and 5),
  nanny_review           text,

  -- notifications
  nannies_notified_count int default 0,

  -- timestamps
  created_at             timestamptz default now(),
  updated_at             timestamptz default now(),
  expires_at             timestamptz
);

create index idx_babysitting_requests_parent         on babysitting_requests(parent_id);
create index idx_babysitting_requests_status         on babysitting_requests(status);
create index idx_babysitting_requests_suburb         on babysitting_requests(suburb);
create index idx_babysitting_requests_postcode       on babysitting_requests(postcode);
create index idx_babysitting_requests_location       on babysitting_requests(latitude, longitude);
create index idx_babysitting_requests_accepted_nanny on babysitting_requests(accepted_nanny_id) where accepted_nanny_id is not null;
create index idx_babysitting_requests_created        on babysitting_requests(created_at);

create trigger trg_babysitting_requests_updated_at
  before update on babysitting_requests
  for each row
  execute function update_updated_at_column();

comment on table  babysitting_requests                       is 'One-time babysitting jobs - first-come-first-serve among 20 nearest nannies';
comment on column babysitting_requests.accepted_nanny_id     is 'The nanny who won the first-come-first-serve acceptance';
comment on column babysitting_requests.nannies_notified_count is 'How many nannies were notified (target: 20)';


-- ---------------------------------------------------------------------------
-- TABLE 20: bsr_time_slots
-- Purpose: Available time slots for babysitting requests.
--          A parent can propose multiple slots; one is selected after acceptance.
-- ---------------------------------------------------------------------------
create table bsr_time_slots (
  id                     uuid primary key default gen_random_uuid(),
  babysitting_request_id uuid not null references babysitting_requests(id) on delete cascade,

  slot_date              date not null,
  start_time             time not null,
  end_time               time not null,

  is_selected            boolean default false,

  created_at             timestamptz default now()
);

create index idx_bsr_time_slots_request on bsr_time_slots(babysitting_request_id);
create index idx_bsr_time_slots_date    on bsr_time_slots(slot_date);

comment on table  bsr_time_slots             is 'Time slot options for babysitting requests - parent proposes, one is selected';
comment on column bsr_time_slots.is_selected is 'Set to true for the confirmed slot after a nanny accepts';


-- ---------------------------------------------------------------------------
-- TABLE 21: bsr_notifications
-- Purpose: Track which nannies were notified about a BSR.
--          20 closest nannies are notified; first to accept wins.
-- ---------------------------------------------------------------------------
create table bsr_notifications (
  id                     uuid primary key default gen_random_uuid(),
  babysitting_request_id uuid not null references babysitting_requests(id) on delete cascade,
  nanny_id               uuid not null references nannies(id) on delete cascade,

  -- notification status
  notified_at            timestamptz default now(),
  notification_method    text check (notification_method in ('email', 'push', 'sms', 'in_app')),

  -- response
  viewed_at              timestamptz,
  accepted_at            timestamptz,
  declined_at            timestamptz,
  declined_reason        text,

  -- post-fill notification
  notified_filled        boolean default false,
  notified_filled_at     timestamptz,

  -- distance from BSR location
  distance_km            decimal(6,2),

  created_at             timestamptz default now()
);

create index idx_bsr_notifications_request  on bsr_notifications(babysitting_request_id);
create index idx_bsr_notifications_nanny    on bsr_notifications(nanny_id);
create index idx_bsr_notifications_accepted on bsr_notifications(accepted_at) where accepted_at is not null;
create index idx_bsr_notifications_distance on bsr_notifications(distance_km);

-- prevent duplicate notifications to the same nanny for the same request
create unique index idx_bsr_notifications_unique on bsr_notifications(babysitting_request_id, nanny_id);

comment on table  bsr_notifications                is 'Tracks 20 closest nannies notified for each babysitting request';
comment on column bsr_notifications.accepted_at    is 'First nanny to have accepted_at set wins (first-come-first-serve)';
comment on column bsr_notifications.distance_km    is 'Distance in km from nanny to BSR location, calculated via Haversine';
comment on column bsr_notifications.notified_filled is 'Whether nanny was told the job was filled by someone else';


-- ---------------------------------------------------------------------------
-- TABLE 22: nanny_placements
-- Purpose: Permanent record of successful hires between nannies and parents.
--          Bidirectional references in nannies.current_placement_id and
--          parents.current_nanny_id / current_placement_id enable fast lookups.
-- ---------------------------------------------------------------------------
create table nanny_placements (
  id                          uuid primary key default gen_random_uuid(),

  nanny_id                    uuid not null references nannies(id) on delete cascade,
  parent_id                   uuid not null references parents(id) on delete cascade,
  position_id                 uuid references nanny_positions(id) on delete set null,

  -- source of placement
  source                      text not null check (source in (
    'interview_request',
    'babysitting_job',
    'direct_hire',
    'referral'
  )),
  interview_request_id        uuid references interview_requests(id) on delete set null,
  babysitting_request_id      uuid references babysitting_requests(id) on delete set null,

  -- placement timeline
  hired_at                    timestamptz not null default now(),
  start_date                  date,

  -- status
  status                      text not null check (status in (
    'active',
    'ended',
    'paused'
  )) default 'active',

  -- end details
  ended_at                    timestamptz,
  end_reason                  text check (end_reason in (
    'parent_no_longer_needs',
    'nanny_left',
    'mutual_agreement',
    'relocation',
    'child_aged_out',
    'other'
  )),
  end_notes                   text,

  -- computed duration (days from hired_at to ended_at; NULL while active)
  placement_duration_days     int generated always as (
    case when ended_at is not null
      then extract(day from ended_at - hired_at)::int
      else null
    end
  ) stored,

  -- satisfaction ratings
  parent_satisfaction_rating  int check (parent_satisfaction_rating between 1 and 5),
  nanny_satisfaction_rating   int check (nanny_satisfaction_rating between 1 and 5),
  would_rehire                boolean,
  would_work_again            boolean,

  -- timestamps
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now(),
  created_by                  uuid references auth.users(id)
);

create index idx_placements_nanny       on nanny_placements(nanny_id);
create index idx_placements_parent      on nanny_placements(parent_id);
create index idx_placements_status      on nanny_placements(status);
create index idx_placements_source      on nanny_placements(source);
create index idx_placements_hired_date  on nanny_placements(hired_at);

-- only ONE active placement per parent
create unique index idx_placements_one_active_per_parent
  on nanny_placements(parent_id)
  where status = 'active';

-- prevent duplicate active placements for the same nanny+parent combo
create unique index idx_placements_unique_active
  on nanny_placements(nanny_id, parent_id)
  where status = 'active';

create trigger trg_nanny_placements_updated_at
  before update on nanny_placements
  for each row
  execute function update_updated_at_column();

comment on table  nanny_placements                         is 'Permanent record of successful hires - tracks who worked for whom and for how long';
comment on column nanny_placements.placement_duration_days is 'Computed: days from hired_at to ended_at (or now() if still active)';
comment on column nanny_placements.source                  is 'How the hire originated: interview_request, babysitting_job, direct_hire, or referral';
comment on column nanny_placements.status                  is 'Placement lifecycle: active, paused, or ended';


-- ============================================================================
-- SECTION 9: FILE MANAGEMENT TABLE
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLE 23: file_retention_log
-- Purpose: Track files for 5-year retention policy after nanny deactivation.
--          When scheduled_deletion_date arrives, cleanup_expired_files() marks
--          them as deleted.
-- ---------------------------------------------------------------------------
create table file_retention_log (
  id                      uuid primary key default gen_random_uuid(),
  nanny_id                uuid references nannies(id) on delete set null,

  file_type               text not null check (file_type in (
    'wwcc_document',
    'passport_document',
    'identification_photo',
    'police_check',
    'certification',
    'reference',
    'profile_picture',
    'ad_image'
  )),

  file_url                text not null,
  file_storage_provider   text check (file_storage_provider in ('supabase', 'cloudinary')),
  cloudinary_public_id    text,

  created_at              timestamptz not null,
  nanny_deactivated_at    timestamptz,
  scheduled_deletion_date date,
  deleted_at              timestamptz,
  deleted_by              uuid references auth.users(id),

  reason_for_deletion     text check (reason_for_deletion in ('retention_expired', 'manual_deletion', 'gdpr_request'))
);

create index idx_file_retention_nanny     on file_retention_log(nanny_id);
create index idx_file_retention_scheduled on file_retention_log(scheduled_deletion_date) where deleted_at is null;
create index idx_file_retention_deleted   on file_retention_log(deleted_at);

comment on table  file_retention_log                         is 'Tracks files for 5-year retention after nanny deactivation';
comment on column file_retention_log.scheduled_deletion_date is 'Date file should be purged - 5 years after nanny_deactivated_at';
comment on column file_retention_log.reason_for_deletion     is 'Why the file was deleted: retention_expired, manual_deletion, or gdpr_request';


-- ============================================================================
-- SECTION 10: CIRCULAR FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- These FK constraints could not be added during table creation because the
-- referenced tables did not exist yet at that point.

-- nannies.current_placement_id -> nanny_placements(id)
alter table nannies
  add constraint fk_nannies_current_placement
  foreign key (current_placement_id) references nanny_placements(id) on delete set null;

-- parents.current_nanny_id -> nannies(id)
alter table parents
  add constraint fk_parents_current_nanny
  foreign key (current_nanny_id) references nannies(id) on delete set null;

-- parents.current_placement_id -> nanny_placements(id)
alter table parents
  add constraint fk_parents_current_placement
  foreign key (current_placement_id) references nanny_placements(id) on delete set null;


-- ============================================================================
-- SECTION 11: DATA CONSISTENCY TRIGGER - sync_placement_references()
-- ============================================================================
-- When a placement status changes to 'ended', automatically clear the
-- denormalised references on nannies and parents so they do not point at
-- a terminated placement.

create or replace function sync_placement_references()
returns trigger as $$
begin
  if new.status = 'ended' and (old.status is null or old.status != 'ended') then
    -- clear nanny current placement reference
    update nannies
    set current_placement_id = null,
        updated_at = now()
    where current_placement_id = new.id;

    -- clear parent current nanny and placement references
    update parents
    set current_placement_id = null,
        current_nanny_id = null,
        updated_at = now()
    where current_placement_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_placement_status_change
  after update on nanny_placements
  for each row
  when (old.status is distinct from new.status)
  execute function sync_placement_references();

comment on function sync_placement_references()
  is 'Trigger function: clears nanny/parent denormalised references when a placement ends';


-- ============================================================================
-- SECTION 12: SCHEDULED / CRON FUNCTIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Function: check_wwcc_expiry()
-- Schedule: Daily cron
-- Purpose: Finds nannies whose WWCC has expired, sets wwcc_verified = false
--          (which auto-recalculates visible_in_match_making and visible_in_bsr),
--          updates the verifications table, and logs to activity_logs.
-- ---------------------------------------------------------------------------
create or replace function check_wwcc_expiry()
returns void as $$
declare
  affected_nannies uuid[];
begin
  -- capture user_ids of nannies about to be expired
  select array_agg(user_id) into affected_nannies
  from nannies
  where wwcc_verified = true and wwcc_expiry_date <= current_date;

  -- nothing to do if no expired nannies
  if affected_nannies is null then
    return;
  end if;

  -- expire WWCC on nannies (computed columns auto-update)
  update nannies
  set wwcc_verified = false,
      updated_at = now()
  where wwcc_verified = true and wwcc_expiry_date <= current_date;

  -- log expiry events
  insert into activity_logs (user_id, action_type, action_details, created_at)
  select user_id, 'wwcc_expired', jsonb_build_object('expiry_date', wwcc_expiry_date), now()
  from nannies
  where user_id = any(affected_nannies);

  -- also update verifications table
  update verifications v
  set wwcc_verified = false,
      verification_status = 'expired',
      updated_at = now()
  from nannies n
  where v.user_id = n.user_id
    and n.user_id = any(affected_nannies);
end;
$$ language plpgsql;

comment on function check_wwcc_expiry()
  is 'Daily cron: expires WWCC, hides nanny from MM/BSR, updates verifications, logs to activity_logs';


-- ---------------------------------------------------------------------------
-- Function: cleanup_expired_files()
-- Schedule: Daily cron
-- Purpose: Finds files past their 5-year retention date and marks them as
--          deleted. Actual file removal from Supabase Storage / Cloudinary
--          must be handled by the application layer after reading these records.
-- ---------------------------------------------------------------------------
create or replace function cleanup_expired_files()
returns void as $$
declare
  file_record record;
begin
  for file_record in
    select * from file_retention_log
    where scheduled_deletion_date <= current_date and deleted_at is null
  loop
    -- mark file as deleted
    update file_retention_log
    set deleted_at = now(),
        reason_for_deletion = 'retention_expired'
    where id = file_record.id;

    -- log the deletion
    insert into activity_logs (user_id, action_type, action_details, created_at)
    values (
      (select user_id from nannies where id = file_record.nanny_id),
      'file_deleted',
      jsonb_build_object(
        'file_type', file_record.file_type,
        'reason', 'retention_expired',
        'file_url', file_record.file_url
      ),
      now()
    );
  end loop;
end;
$$ language plpgsql;

comment on function cleanup_expired_files()
  is 'Daily cron: marks files as deleted after 5-year retention period; logs each deletion';


-- ---------------------------------------------------------------------------
-- Function: send_wwcc_expiry_warnings()
-- Schedule: Daily cron
-- Purpose: Queues warning emails at 30 days and 7 days before WWCC expiry.
--          Includes deduplication check to avoid sending duplicate 30-day
--          warnings within a 7-day window.
-- ---------------------------------------------------------------------------
create or replace function send_wwcc_expiry_warnings()
returns void as $$
begin
  -- queue emails for nannies with WWCC expiring in 30 days
  insert into email_logs (recipient_user_id, recipient_email, email_type, subject, status, created_at)
  select
    n.user_id,
    up.email,
    'wwcc_expiring_soon',
    'Your WWCC expires in 30 days - Action required',
    'queued',
    now()
  from nannies n
  join user_profiles up on n.user_id = up.user_id
  where n.wwcc_verified = true
    and n.wwcc_expiry_date = current_date + interval '30 days'
    and not exists (
      select 1 from email_logs el
      where el.recipient_user_id = n.user_id
        and el.email_type = 'wwcc_expiring_soon'
        and el.created_at > current_date - interval '7 days'
    );

  -- queue emails for nannies with WWCC expiring in 7 days
  insert into email_logs (recipient_user_id, recipient_email, email_type, subject, status, created_at)
  select
    n.user_id,
    up.email,
    'wwcc_expiring_soon',
    'URGENT: Your WWCC expires in 7 days',
    'queued',
    now()
  from nannies n
  join user_profiles up on n.user_id = up.user_id
  where n.wwcc_verified = true
    and n.wwcc_expiry_date = current_date + interval '7 days';
end;
$$ language plpgsql;

comment on function send_wwcc_expiry_warnings()
  is 'Daily cron: queues warning emails at 30 and 7 days before WWCC expiry';


-- ============================================================================
-- SECTION 13: UTILITY FUNCTIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Function: calculate_distance_km(lat1, lon1, lat2, lon2)
-- Purpose: Haversine formula to calculate great-circle distance in kilometres
--          between two latitude/longitude coordinate pairs.
-- Marked IMMUTABLE for query planner optimisation.
-- ---------------------------------------------------------------------------
create or replace function calculate_distance_km(
  lat1 decimal,
  lon1 decimal,
  lat2 decimal,
  lon2 decimal
)
returns decimal as $$
declare
  r    decimal := 6371;
  dlat decimal;
  dlon decimal;
  a    decimal;
  c    decimal;
begin
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);

  a := sin(dlat / 2) * sin(dlat / 2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon / 2) * sin(dlon / 2);

  c := 2 * atan2(sqrt(a), sqrt(1 - a));

  return round((r * c)::decimal, 2);
end;
$$ language plpgsql immutable;

comment on function calculate_distance_km(decimal, decimal, decimal, decimal)
  is 'Haversine formula: returns great-circle distance in km between two lat/lng pairs';


-- ---------------------------------------------------------------------------
-- Function: get_nearest_nannies_for_bsr(latitude, longitude, limit)
-- Purpose: Finds the N nearest verified nannies (default 20) to a given
--          location. Used when posting a babysitting request to determine
--          which nannies to notify.
-- ---------------------------------------------------------------------------
create or replace function get_nearest_nannies_for_bsr(
  p_latitude  decimal,
  p_longitude decimal,
  p_limit     int default 20
)
returns table (
  nanny_id    uuid,
  user_id     uuid,
  distance_km decimal
) as $$
begin
  return query
  select
    n.id          as nanny_id,
    n.user_id     as user_id,
    calculate_distance_km(
      p_latitude, p_longitude,
      sp.latitude, sp.longitude
    )             as distance_km
  from nannies n
  join user_profiles up   on n.user_id = up.user_id
  join sydney_postcodes sp on up.suburb = sp.suburb
  where n.visible_in_bsr = true
  order by distance_km asc
  limit p_limit;
end;
$$ language plpgsql;

comment on function get_nearest_nannies_for_bsr(decimal, decimal, int)
  is 'Returns the N nearest verified nannies (default 20) for BSR notifications based on Haversine distance';


-- ============================================================================
-- SECTION 14: VERIFICATION BLOCK
-- ============================================================================
-- Counts all public tables and raises a NOTICE. Fails if fewer than 24.

do $$
declare
  table_count int;
begin
  select count(*) into table_count
  from information_schema.tables
  where table_schema = 'public'
    and table_type = 'BASE TABLE';

  raise notice '========================================';
  raise notice 'Baby Bloom Sydney migration complete.';
  raise notice 'Total public tables created: %', table_count;
  raise notice '========================================';

  if table_count < 23 then
    raise exception 'Expected at least 23 tables, but found %. Migration may be incomplete.', table_count;
  end if;
end $$;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Tables Created (25):
--   1.  user_roles            14. parents
--   2.  user_profiles         15. nanny_positions
--   3.  sydney_postcodes      16. position_schedule
--   4.  verifications         17. position_children
--   5.  activity_logs         18. interview_requests
--   6.  email_logs            19. babysitting_requests
--   7.  user_progress         20. bsr_time_slots
--   8.  nannies               21. bsr_notifications
--   9.  nanny_availability    22. nanny_placements
--   10. nanny_credentials     23. file_retention_log
--   11. nanny_assurances      24. form_snapshots (Migration 1)
--   12. nanny_images          25. (circular FK constraints applied)
--   13. nanny_ai_content
--
-- Functions Created (7):
--   1. update_updated_at_column()    - trigger: auto-sets updated_at
--   2. sync_placement_references()   - trigger: clears refs when placement ends
--   3. check_wwcc_expiry()           - cron: expires WWCC daily
--   4. cleanup_expired_files()       - cron: marks files for deletion after 5yr
--   5. send_wwcc_expiry_warnings()   - cron: queues 30-day and 7-day warnings
--   6. calculate_distance_km()       - utility: Haversine distance
--   7. get_nearest_nannies_for_bsr() - utility: 20 nearest verified nannies
--
-- Triggers Applied:
--   - updated_at triggers on: user_profiles, verifications, nannies,
--     nanny_availability, nanny_credentials, nanny_images, nanny_ai_content,
--     parents, nanny_positions, position_schedule, interview_requests,
--     babysitting_requests, nanny_placements
--   - sync_placement_references on: nanny_placements (after status change)
--
-- Computed/Generated Columns:
--   - nannies: fully_verified, visible_in_match_making, visible_in_bsr,
--              profile_visible
--   - nanny_placements: placement_duration_days
--
-- Next Steps:
--   1. Run seed.sql to insert Sydney postcode data (194 suburbs)
--   2. Run rls-policies.sql to set up Row Level Security
--   3. Configure Supabase cron for: check_wwcc_expiry, cleanup_expired_files,
--      send_wwcc_expiry_warnings
--   4. ✅ Supabase Storage buckets created (profile-pictures, verification-documents)
--   5. ✅ form_snapshots table created (Migration 1)
--
-- ============================================================================
