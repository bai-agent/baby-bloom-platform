-- ============================================================================
-- BABY BLOOM SYDNEY - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- Version: 3.0
-- Created: 2026-02-05
-- Platform: Supabase (PostgreSQL 15+)
-- Tables: 24
--
-- This migration creates all tables, indexes, constraints, triggers, and
-- reference data for the Baby Bloom Sydney nanny matching platform.
--
-- IMPORTANT: Run this script in a fresh Supabase project or ensure no
-- conflicting tables exist.
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

-- Enable case-insensitive text for email comparisons
CREATE EXTENSION IF NOT EXISTS citext;

-- Enable cryptographic functions (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- SECTION 2: HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 3: CORE IDENTITY TABLES (3 tables)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLE 1: user_roles
-- Purpose: Extends Supabase auth.users with role information
-- ---------------------------------------------------------------------------
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('nanny', 'parent', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_roles_role ON user_roles(role);

COMMENT ON TABLE user_roles IS 'User role assignments - one role per user';
COMMENT ON COLUMN user_roles.role IS 'User role: nanny, parent, admin, or super_admin';

-- ---------------------------------------------------------------------------
-- TABLE 2: user_profiles
-- Purpose: Common profile data for all users (nannies and parents)
-- ---------------------------------------------------------------------------
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email CITEXT NOT NULL, -- Case-insensitive for email lookups
  mobile_number TEXT,
  date_of_birth DATE,

  -- Location
  suburb TEXT NOT NULL,
  postcode TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  state TEXT DEFAULT 'NSW',

  -- Profile Picture (Cloudinary - single source of truth)
  profile_picture_url TEXT,
  profile_picture_cloudinary_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_suburb ON user_profiles(suburb);
CREATE INDEX idx_user_profiles_postcode ON user_profiles(postcode);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- Auto-update updated_at
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_profiles IS 'Common profile information for all users';
COMMENT ON COLUMN user_profiles.email IS 'Case-insensitive email (CITEXT type)';

-- ============================================================================
-- SECTION 4: REFERENCE DATA TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLE 3: sydney_postcodes
-- Purpose: Reference data for Sydney suburbs with geolocation
-- ---------------------------------------------------------------------------
CREATE TABLE sydney_postcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suburb TEXT NOT NULL,
  postcode TEXT NOT NULL,
  latitude DECIMAL(10, 6) NOT NULL,
  longitude DECIMAL(10, 6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sydney_postcodes_suburb ON sydney_postcodes(suburb);
CREATE INDEX idx_sydney_postcodes_postcode ON sydney_postcodes(postcode);
CREATE INDEX idx_sydney_postcodes_location ON sydney_postcodes(latitude, longitude);
CREATE UNIQUE INDEX idx_sydney_postcodes_unique ON sydney_postcodes(suburb, postcode);

COMMENT ON TABLE sydney_postcodes IS 'Sydney suburb reference data with geolocation for BSR matching';

-- ============================================================================
-- SECTION 5: VERIFICATION & LOGGING TABLES (4 tables)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLE 4: verifications
-- Purpose: WWCC and identity verification records for nannies
-- ---------------------------------------------------------------------------
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- WWCC VERIFICATION
  wwcc_verification_method TEXT CHECK (wwcc_verification_method IN ('grant_email', 'service_nsw_app', 'manual_entry')),
  wwcc_grant_email_url TEXT,
  wwcc_service_nsw_screenshot_url TEXT,
  wwcc_number TEXT,
  wwcc_declaration BOOLEAN DEFAULT false,

  wwcc_verified BOOLEAN DEFAULT false,
  wwcc_verified_at TIMESTAMPTZ,
  wwcc_verified_by UUID REFERENCES auth.users(id),
  wwcc_expiry_date DATE,
  wwcc_rejection_reason TEXT,

  -- IDENTITY VERIFICATION
  surname TEXT,
  given_names TEXT,
  date_of_birth DATE,
  passport_country TEXT,
  passport_upload_url TEXT,
  identification_photo_url TEXT,
  passport_declaration BOOLEAN DEFAULT false,

  identity_verified BOOLEAN DEFAULT false,
  identity_verified_at TIMESTAMPTZ,
  identity_verified_by UUID REFERENCES auth.users(id),
  passport_expiry_date DATE,
  identity_rejection_reason TEXT,

  -- OVERALL STATUS
  verification_status TEXT CHECK (verification_status IN ('pending', 'wwcc_verified', 'fully_verified', 'rejected', 'expired')) DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: If method selected, corresponding proof must be provided
  CONSTRAINT valid_wwcc_method CHECK (
    wwcc_verification_method IS NULL OR
    (wwcc_verification_method = 'grant_email' AND wwcc_grant_email_url IS NOT NULL) OR
    (wwcc_verification_method = 'service_nsw_app' AND wwcc_service_nsw_screenshot_url IS NOT NULL) OR
    (wwcc_verification_method = 'manual_entry' AND wwcc_number IS NOT NULL)
  )
);

CREATE INDEX idx_verifications_user ON verifications(user_id);
CREATE INDEX idx_verifications_wwcc_verified ON verifications(wwcc_verified);
CREATE INDEX idx_verifications_identity_verified ON verifications(identity_verified);
CREATE INDEX idx_verifications_status ON verifications(verification_status);
CREATE INDEX idx_verifications_wwcc_expiry ON verifications(wwcc_expiry_date) WHERE wwcc_verified = true;

CREATE TRIGGER trg_verifications_updated_at
  BEFORE UPDATE ON verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE verifications IS 'WWCC and identity verification records';
COMMENT ON COLUMN verifications.wwcc_verification_method IS 'How WWCC was verified: grant_email, service_nsw_app, or manual_entry';

-- ---------------------------------------------------------------------------
-- TABLE 5: activity_logs
-- Purpose: Complete audit trail of all user actions
-- ---------------------------------------------------------------------------
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  action_type TEXT NOT NULL CHECK (action_type IN (
    -- Auth & Profile
    'signup', 'login', 'profile_updated', 'profile_deactivated',
    -- Nanny
    'nanny_profile_created', 'nanny_verification_submitted', 'nanny_tier_upgraded',
    'nanny_availability_updated', 'wwcc_expired', 'wwcc_renewed',
    -- Parent
    'parent_profile_created', 'position_created', 'position_updated', 'position_closed',
    -- Babysitting
    'babysitting_request_created', 'babysitting_request_cancelled',
    -- Interview
    'interview_requested', 'interview_accepted', 'interview_declined', 'interview_completed',
    -- Placement
    'placement_created', 'placement_ended', 'placement_paused', 'placement_resumed',
    -- Admin
    'admin_override', 'verification_approved', 'verification_rejected',
    'user_suspended', 'user_reinstated',
    -- System
    'email_sent', 'notification_sent', 'file_deleted'
  )),

  action_details JSONB,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX idx_activity_logs_details ON activity_logs USING GIN (action_details);

COMMENT ON TABLE activity_logs IS 'Complete audit trail for compliance and debugging';

-- ---------------------------------------------------------------------------
-- TABLE 6: email_logs
-- Purpose: Track all system emails sent
-- ---------------------------------------------------------------------------
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,

  email_type TEXT NOT NULL CHECK (email_type IN (
    -- Onboarding
    'welcome', 'verification_pending', 'verification_approved', 'verification_rejected',
    -- Interview
    'interview_request', 'interview_confirmed', 'interview_reminder',
    -- Babysitting
    'babysitting_notification', 'babysitting_accepted', 'babysitting_cancelled',
    -- Matching & WWCC
    'position_matched', 'wwcc_expiring_soon', 'wwcc_expired',
    -- Placement
    'placement_created', 'placement_ended',
    -- Admin
    'admin_notification'
  )),

  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,

  status TEXT CHECK (status IN ('queued', 'sent', 'failed', 'bounced')) DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,

  provider_message_id TEXT,
  provider_response JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_logs_recipient_user ON email_logs(recipient_user_id);
CREATE INDEX idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created ON email_logs(created_at);

COMMENT ON TABLE email_logs IS 'Email delivery tracking for all system communications';

-- ---------------------------------------------------------------------------
-- TABLE 7: user_progress
-- Purpose: Track user journey through conversion funnel
-- ---------------------------------------------------------------------------
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  stage TEXT NOT NULL CHECK (stage IN (
    -- Nanny funnel
    'nanny_signup', 'nanny_profile_created', 'nanny_verification_started',
    'nanny_tier2_achieved', 'nanny_tier3_achieved',
    'nanny_first_interview_received', 'nanny_first_babysitting_received', 'nanny_first_hire',
    -- Parent funnel
    'parent_signup', 'parent_browsing', 'parent_position_created',
    'parent_first_interview_requested', 'parent_first_babysitting_posted', 'parent_first_hire'
  )),

  reached_at TIMESTAMPTZ DEFAULT NOW(),
  stage_data JSONB
);

CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_stage ON user_progress(stage);
CREATE INDEX idx_user_progress_reached ON user_progress(reached_at);
CREATE UNIQUE INDEX idx_user_progress_unique ON user_progress(user_id, stage);

COMMENT ON TABLE user_progress IS 'Conversion funnel tracking - each stage reached once per user';

-- ============================================================================
-- SECTION 6: NANNY PROFILE TABLES (7 tables)
-- Note: nannies table created WITHOUT current_placement_id FK initially
--       (circular dependency - will add FK after nanny_placements is created)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLE 8: nannies
-- Purpose: Main nanny entity with all profile data
-- ---------------------------------------------------------------------------
CREATE TABLE nannies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Demographics
  gender TEXT CHECK (gender IN ('female', 'male', 'non_binary', 'prefer_not_to_say')),
  nationality TEXT,
  languages TEXT[],

  -- Experience (ALL IN YEARS)
  total_experience_years INT,
  nanny_experience_years INT,
  under_3_experience_years INT,
  newborn_experience_years INT,
  experience_details TEXT,

  -- Preferences - What nanny wants to do
  role_types_preferred TEXT[],
  level_of_support_offered TEXT[],

  -- Work Preferences - Pay & Schedule
  hourly_rate_min DECIMAL(10,2),
  pay_frequency TEXT[],
  immediate_start_available BOOLEAN DEFAULT false,
  placement_ongoing_preferred BOOLEAN DEFAULT false,
  start_date_earliest DATE,
  end_date_latest DATE,

  -- Capabilities - Who they can work with
  max_children INT CHECK (max_children IN (1, 2, 3)),
  min_child_age_months INT,
  max_child_age_months INT,
  additional_needs_ok BOOLEAN DEFAULT false,

  -- Logistics
  sydney_resident BOOLEAN,
  residency_status TEXT CHECK (residency_status IN ('Australian Citizen', 'Permanent Resident', 'Working Holiday', 'Other')),
  right_to_work BOOLEAN,
  drivers_license BOOLEAN,
  has_car BOOLEAN,
  comfortable_with_pets BOOLEAN,
  vaccination_status BOOLEAN,
  non_smoker BOOLEAN,

  -- Personal - About You section
  hobbies_interests TEXT,
  strengths_traits TEXT,
  skills_training TEXT,

  -- Status & Verification
  status TEXT CHECK (status IN ('active', 'inactive', 'suspended', 'pending_verification', 'deactivated')) DEFAULT 'pending_verification',
  verification_tier TEXT CHECK (verification_tier IN ('tier1', 'tier2', 'tier3')) DEFAULT 'tier1',

  -- WWCC Status (drives MM/BSR visibility)
  wwcc_verified BOOLEAN DEFAULT false,
  wwcc_expiry_date DATE,
  identity_verified BOOLEAN DEFAULT false,

  -- Computed Verification Status
  fully_verified BOOLEAN GENERATED ALWAYS AS (wwcc_verified AND identity_verified) STORED,

  -- Computed Visibility Flags (CRITICAL for Match Making/BSR)
  visible_in_match_making BOOLEAN GENERATED ALWAYS AS (
    status = 'active' AND wwcc_verified AND identity_verified
  ) STORED,

  visible_in_bsr BOOLEAN GENERATED ALWAYS AS (
    status = 'active' AND wwcc_verified AND identity_verified
  ) STORED,

  -- Profile visibility (unverified nannies can view their own profile)
  profile_visible BOOLEAN GENERATED ALWAYS AS (
    status IN ('active', 'pending_verification')
  ) STORED,

  -- Deactivation tracking (for 5-year file retention)
  deactivated_at TIMESTAMPTZ,
  files_deleted_at TIMESTAMPTZ,

  -- Current Placement - FK added later due to circular dependency
  current_placement_id UUID, -- Will add FK constraint after nanny_placements table

  -- Wix Integration (migration from old system)
  wix_contact_id TEXT UNIQUE,
  wix_submission_id TEXT,
  wix_submission_link TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tier2_achieved_at TIMESTAMPTZ,
  tier3_achieved_at TIMESTAMPTZ
);

CREATE INDEX idx_nannies_user_id ON nannies(user_id);
CREATE INDEX idx_nannies_status ON nannies(status);
CREATE INDEX idx_nannies_tier ON nannies(verification_tier);
CREATE INDEX idx_nannies_visible_mm ON nannies(visible_in_match_making) WHERE visible_in_match_making = true;
CREATE INDEX idx_nannies_visible_bsr ON nannies(visible_in_bsr) WHERE visible_in_bsr = true;
CREATE INDEX idx_nannies_profile_visible ON nannies(profile_visible) WHERE profile_visible = true;
CREATE INDEX idx_nannies_wix_contact ON nannies(wix_contact_id);
CREATE INDEX idx_nannies_hourly_rate ON nannies(hourly_rate_min);
CREATE INDEX idx_nannies_wwcc_expiry ON nannies(wwcc_expiry_date) WHERE wwcc_verified = true;
CREATE INDEX idx_nannies_deactivated ON nannies(deactivated_at) WHERE deactivated_at IS NOT NULL AND files_deleted_at IS NULL;
CREATE INDEX idx_nannies_current_placement ON nannies(current_placement_id) WHERE current_placement_id IS NOT NULL;

CREATE TRIGGER trg_nannies_updated_at
  BEFORE UPDATE ON nannies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE nannies IS 'Main nanny profile entity';
COMMENT ON COLUMN nannies.visible_in_match_making IS 'Computed: Only active, fully verified nannies visible in match making';
COMMENT ON COLUMN nannies.visible_in_bsr IS 'Computed: Only active, fully verified nannies receive BSR notifications';
COMMENT ON COLUMN nannies.fully_verified IS 'Computed: WWCC verified AND identity verified';

-- ---------------------------------------------------------------------------
-- TABLE 9: nanny_availability
-- Purpose: Weekly availability schedule for nannies
-- ---------------------------------------------------------------------------
CREATE TABLE nanny_availability (
  nanny_id UUID PRIMARY KEY REFERENCES nannies(id) ON DELETE CASCADE,

  -- Days available (denormalized for quick filtering)
  days_available TEXT[],

  -- Detailed schedule grid (JSONB for flexibility)
  schedule JSONB NOT NULL,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nanny_availability_schedule ON nanny_availability USING GIN (schedule);
CREATE INDEX idx_nanny_availability_days ON nanny_availability USING GIN (days_available);

CREATE TRIGGER trg_nanny_availability_updated_at
  BEFORE UPDATE ON nanny_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE nanny_availability IS 'Weekly availability schedule - one record per nanny';
COMMENT ON COLUMN nanny_availability.schedule IS 'JSONB schedule grid with time slots per day';

-- ---------------------------------------------------------------------------
-- TABLE 10: nanny_credentials
-- Purpose: Qualifications and certifications (merged table)
-- ---------------------------------------------------------------------------
CREATE TABLE nanny_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nanny_id UUID NOT NULL REFERENCES nannies(id) ON DELETE CASCADE,

  -- Credential Type
  credential_category TEXT NOT NULL CHECK (credential_category IN ('qualification', 'certification')),

  -- QUALIFICATIONS (Permanent Education)
  qualification_type TEXT CHECK (qualification_type IN (
    'Certificate III in Early Childhood Education and Care',
    'Certificate IV in Education Support',
    'Diploma of Early Childhood Education and Care',
    'Bachelor of Early Childhood Education (Or Equivalent)',
    'No Qualifications',
    'Other'
  )),

  -- Optional details for qualifications
  institution TEXT,
  year_obtained INT,

  -- CERTIFICATIONS (Time-Limited)
  certification_type TEXT CHECK (certification_type IN (
    'CPR',
    'First Aid',
    'First Aid in Education & Care Setting',
    'Child Protection',
    'Anaphylaxis and Asthma Management'
  )),

  -- File upload (Supabase Storage)
  file_url TEXT,
  file_name TEXT,
  issue_date DATE,
  expiry_date DATE,

  -- VERIFICATION (Admin Review)
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: qualification_type required for qualifications
  CONSTRAINT valid_qualification CHECK (
    (credential_category = 'qualification' AND qualification_type IS NOT NULL) OR
    (credential_category = 'certification' AND certification_type IS NOT NULL)
  ),

  -- Constraint: certifications must have issue and expiry dates
  CONSTRAINT valid_certification_dates CHECK (
    credential_category = 'qualification' OR
    (credential_category = 'certification' AND issue_date IS NOT NULL AND expiry_date IS NOT NULL)
  )
);

CREATE INDEX idx_nanny_credentials_nanny_id ON nanny_credentials(nanny_id);
CREATE INDEX idx_nanny_credentials_category ON nanny_credentials(credential_category);
CREATE INDEX idx_nanny_credentials_qual_type ON nanny_credentials(qualification_type);
CREATE INDEX idx_nanny_credentials_cert_type ON nanny_credentials(certification_type);
CREATE INDEX idx_nanny_credentials_expiry ON nanny_credentials(expiry_date) WHERE credential_category = 'certification';
CREATE INDEX idx_nanny_credentials_verified ON nanny_credentials(verified);

CREATE TRIGGER trg_nanny_credentials_updated_at
  BEFORE UPDATE ON nanny_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE nanny_credentials IS 'Nanny qualifications (permanent) and certifications (time-limited)';

-- ---------------------------------------------------------------------------
-- TABLE 11: nanny_assurances
-- Purpose: Police checks and references
-- ---------------------------------------------------------------------------
CREATE TABLE nanny_assurances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nanny_id UUID NOT NULL REFERENCES nannies(id) ON DELETE CASCADE,

  assurance_type TEXT NOT NULL CHECK (assurance_type IN (
    'National Police Check',
    'References',
    'Professional References'
  )),

  file_url TEXT,
  file_name TEXT,
  issue_date DATE,
  expiry_date DATE,
  reference_details TEXT,

  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nanny_assurances_nanny_id ON nanny_assurances(nanny_id);
CREATE INDEX idx_nanny_assurances_type ON nanny_assurances(assurance_type);

COMMENT ON TABLE nanny_assurances IS 'Police checks and references for nannies';

-- ---------------------------------------------------------------------------
-- TABLE 12: nanny_images
-- Purpose: Profile and ad images stored in Cloudinary
-- ---------------------------------------------------------------------------
CREATE TABLE nanny_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nanny_id UUID NOT NULL REFERENCES nannies(id) ON DELETE CASCADE,

  image_type TEXT NOT NULL CHECK (image_type IN ('ad_primary', 'ad_secondary', 'ad_gallery')),

  cloudinary_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_format TEXT,
  cloudinary_width INT,
  cloudinary_height INT,

  is_primary BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  alt_text TEXT,

  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nanny_images_nanny_id ON nanny_images(nanny_id);
CREATE INDEX idx_nanny_images_type ON nanny_images(image_type);
CREATE INDEX idx_nanny_images_approved ON nanny_images(approved) WHERE image_type LIKE 'ad_%';

-- Only one primary image per nanny
CREATE UNIQUE INDEX idx_nanny_images_one_primary
  ON nanny_images(nanny_id, is_primary)
  WHERE is_primary = true;

CREATE TRIGGER trg_nanny_images_updated_at
  BEFORE UPDATE ON nanny_images
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE nanny_images IS 'Nanny ad images stored in Cloudinary';

-- ---------------------------------------------------------------------------
-- TABLE 13: nanny_ai_content
-- Purpose: AI-generated content for nanny profiles
-- ---------------------------------------------------------------------------
CREATE TABLE nanny_ai_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nanny_id UUID NOT NULL REFERENCES nannies(id) ON DELETE CASCADE,

  content_type TEXT NOT NULL CHECK (content_type IN (
    'bio_summary',
    'headline',
    'experience_summary',
    'skills_highlight',
    'parent_pitch'
  )),

  content TEXT NOT NULL,
  ai_model TEXT,
  prompt_used TEXT,

  is_active BOOLEAN DEFAULT true,
  approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nanny_ai_content_nanny_id ON nanny_ai_content(nanny_id);
CREATE INDEX idx_nanny_ai_content_type ON nanny_ai_content(content_type);
CREATE INDEX idx_nanny_ai_content_active ON nanny_ai_content(is_active) WHERE is_active = true;

CREATE TRIGGER trg_nanny_ai_content_updated_at
  BEFORE UPDATE ON nanny_ai_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE nanny_ai_content IS 'AI-generated content for nanny profile enhancement';

-- ============================================================================
-- SECTION 7: PARENT PROFILE TABLES (4 tables)
-- Note: parents table created WITHOUT current_nanny_id and current_placement_id
--       FKs initially (circular dependency - will add after nanny_placements)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLE 14: parents
-- Purpose: Main parent entity
-- ---------------------------------------------------------------------------
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Wix Integration
  wix_contact_id TEXT UNIQUE,
  wix_submission_id TEXT,
  wix_submission_link TEXT,

  -- Family Info
  number_of_children INT CHECK (number_of_children IN (1, 2, 3)),
  child_needs BOOLEAN DEFAULT false,
  child_needs_details TEXT,
  about_family TEXT,

  -- Current Hire - FKs added later due to circular dependency
  current_nanny_id UUID, -- Will add FK constraint after this table exists
  current_placement_id UUID, -- Will add FK constraint after nanny_placements table

  -- Status
  status TEXT CHECK (status IN ('active', 'inactive', 'paused')) DEFAULT 'active',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parents_user_id ON parents(user_id);
CREATE INDEX idx_parents_status ON parents(status);
CREATE INDEX idx_parents_wix_contact ON parents(wix_contact_id);
CREATE INDEX idx_parents_current_nanny ON parents(current_nanny_id) WHERE current_nanny_id IS NOT NULL;
CREATE INDEX idx_parents_current_placement ON parents(current_placement_id) WHERE current_placement_id IS NOT NULL;

CREATE TRIGGER trg_parents_updated_at
  BEFORE UPDATE ON parents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE parents IS 'Main parent profile entity';

-- ---------------------------------------------------------------------------
-- TABLE 15: nanny_positions
-- Purpose: Job positions posted by parents (ONE active per parent)
-- ---------------------------------------------------------------------------
CREATE TABLE nanny_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,

  title TEXT DEFAULT 'Nanny Position',
  description TEXT,

  -- TIMELINE
  urgency TEXT CHECK (urgency IN ('Immediately', 'At a later date')),
  start_date DATE,
  placement_length TEXT CHECK (placement_length IN ('Ongoing', 'Until a certain date')),
  end_date DATE,

  -- SCHEDULE
  schedule_type TEXT CHECK (schedule_type IN ('Yes', 'No', 'I''m Flexible')),
  hours_per_week INT,
  days_required TEXT[],
  schedule_details TEXT,

  -- NANNY REQUIREMENTS
  language_preference TEXT CHECK (language_preference IN ('English', 'Foreign language', 'Multiple')),
  language_preference_details TEXT,
  minimum_age_requirement INT CHECK (minimum_age_requirement IN (18, 21, 25, 28, 35)),
  years_of_experience INT CHECK (years_of_experience IN (1, 2, 3, 5)),
  qualification_requirement TEXT,
  certificate_requirements TEXT[],
  assurances_required TEXT[],
  residency_status_requirement TEXT CHECK (residency_status_requirement IN ('Permanent Resident', 'Any Status')),

  -- BOOLEAN REQUIREMENTS
  vaccination_required BOOLEAN,
  drivers_license_required BOOLEAN,
  car_required BOOLEAN,
  comfortable_with_pets_required BOOLEAN,
  non_smoker_required BOOLEAN,
  other_requirements_exist BOOLEAN DEFAULT false,
  other_requirements_details TEXT,

  -- COMPENSATION
  hourly_rate DECIMAL(10,2),
  pay_frequency TEXT[],

  -- REASON & SUPPORT
  reason_for_nanny TEXT[],
  level_of_support TEXT[],

  -- STATUS
  status TEXT CHECK (status IN ('draft', 'active', 'paused', 'filled', 'cancelled')) DEFAULT 'active',
  filled_at TIMESTAMPTZ,
  filled_by_nanny_id UUID REFERENCES nannies(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nanny_positions_parent ON nanny_positions(parent_id);
CREATE INDEX idx_nanny_positions_status ON nanny_positions(status);
CREATE INDEX idx_nanny_positions_active ON nanny_positions(status) WHERE status = 'active';
CREATE INDEX idx_nanny_positions_start_date ON nanny_positions(start_date);
CREATE INDEX idx_nanny_positions_hourly_rate ON nanny_positions(hourly_rate);
CREATE INDEX idx_nanny_positions_days ON nanny_positions USING GIN (days_required);

-- CRITICAL: Only ONE active position per parent
CREATE UNIQUE INDEX idx_nanny_positions_one_active_per_parent
  ON nanny_positions(parent_id)
  WHERE status = 'active';

CREATE TRIGGER trg_nanny_positions_updated_at
  BEFORE UPDATE ON nanny_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE nanny_positions IS 'Job positions posted by parents';
COMMENT ON COLUMN nanny_positions.status IS 'Only ONE active position allowed per parent (enforced by unique index)';

-- ---------------------------------------------------------------------------
-- TABLE 16: position_schedule
-- Purpose: Detailed weekly schedule for positions
-- ---------------------------------------------------------------------------
CREATE TABLE position_schedule (
  position_id UUID PRIMARY KEY REFERENCES nanny_positions(id) ON DELETE CASCADE,
  schedule JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_position_schedule_jsonb ON position_schedule USING GIN (schedule);

CREATE TRIGGER trg_position_schedule_updated_at
  BEFORE UPDATE ON position_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE position_schedule IS 'Detailed weekly schedule requirements for positions';

-- ---------------------------------------------------------------------------
-- TABLE 17: position_children
-- Purpose: Children associated with a position (ages in months)
-- ---------------------------------------------------------------------------
CREATE TABLE position_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES nanny_positions(id) ON DELETE CASCADE,

  child_label TEXT NOT NULL CHECK (child_label IN ('A', 'B', 'C')),
  age_months INT NOT NULL CHECK (age_months >= 0 AND age_months <= 216), -- 0-18 years
  gender TEXT CHECK (gender IN ('Female', 'Male', 'Rather Not Say')),
  display_order INT NOT NULL CHECK (display_order IN (1, 2, 3)),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_position_children_position ON position_children(position_id);
CREATE INDEX idx_position_children_age ON position_children(age_months);
CREATE UNIQUE INDEX idx_position_children_unique ON position_children(position_id, child_label);
CREATE UNIQUE INDEX idx_position_children_order ON position_children(position_id, display_order);

COMMENT ON TABLE position_children IS 'Children in position - ages stored in months (0-216)';
COMMENT ON COLUMN position_children.age_months IS 'Age in months for precise matching (0-216 = 0-18 years)';

-- ============================================================================
-- SECTION 8: MATCHING & REQUEST TABLES (5 tables)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLE 18: interview_requests
-- Purpose: Interview coordination between parents and nannies
-- ---------------------------------------------------------------------------
CREATE TABLE interview_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  nanny_id UUID NOT NULL REFERENCES nannies(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  position_id UUID REFERENCES nanny_positions(id) ON DELETE SET NULL,

  -- Request Details
  message TEXT,
  requested_dates JSONB, -- Array of preferred dates/times

  -- Status
  status TEXT NOT NULL CHECK (status IN (
    'pending',
    'accepted',
    'declined',
    'completed',
    'cancelled',
    'expired'
  )) DEFAULT 'pending',

  -- Response
  nanny_response_message TEXT,
  responded_at TIMESTAMPTZ,

  -- Interview Details (after acceptance)
  interview_date DATE,
  interview_time TIME,
  interview_location TEXT,
  interview_type TEXT CHECK (interview_type IN ('in_person', 'video_call', 'phone_call')),

  -- Completion
  completed_at TIMESTAMPTZ,
  outcome TEXT CHECK (outcome IN ('hired', 'not_hired', 'pending_decision', 'cancelled')),
  outcome_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_interview_requests_nanny ON interview_requests(nanny_id);
CREATE INDEX idx_interview_requests_parent ON interview_requests(parent_id);
CREATE INDEX idx_interview_requests_position ON interview_requests(position_id);
CREATE INDEX idx_interview_requests_status ON interview_requests(status);
CREATE INDEX idx_interview_requests_created ON interview_requests(created_at);

CREATE TRIGGER trg_interview_requests_updated_at
  BEFORE UPDATE ON interview_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE interview_requests IS 'Interview coordination between parents and nannies';

-- ---------------------------------------------------------------------------
-- TABLE 19: babysitting_requests
-- Purpose: One-time babysitting jobs posted by parents
-- ---------------------------------------------------------------------------
CREATE TABLE babysitting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,

  -- Request Details
  title TEXT DEFAULT 'Babysitting Request',
  description TEXT,
  special_requirements TEXT,

  -- Location
  suburb TEXT NOT NULL,
  postcode TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),

  -- Compensation
  hourly_rate DECIMAL(10,2),
  estimated_hours DECIMAL(4,1),

  -- Status
  status TEXT NOT NULL CHECK (status IN (
    'draft',
    'open',
    'filled',
    'completed',
    'cancelled',
    'expired'
  )) DEFAULT 'open',

  -- Accepted Nanny
  accepted_nanny_id UUID REFERENCES nannies(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,

  -- Completion
  completed_at TIMESTAMPTZ,
  parent_rating INT CHECK (parent_rating BETWEEN 1 AND 5),
  parent_review TEXT,
  nanny_rating INT CHECK (nanny_rating BETWEEN 1 AND 5),
  nanny_review TEXT,

  -- Notifications
  nannies_notified_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_babysitting_requests_parent ON babysitting_requests(parent_id);
CREATE INDEX idx_babysitting_requests_status ON babysitting_requests(status);
CREATE INDEX idx_babysitting_requests_suburb ON babysitting_requests(suburb);
CREATE INDEX idx_babysitting_requests_postcode ON babysitting_requests(postcode);
CREATE INDEX idx_babysitting_requests_location ON babysitting_requests(latitude, longitude);
CREATE INDEX idx_babysitting_requests_accepted_nanny ON babysitting_requests(accepted_nanny_id) WHERE accepted_nanny_id IS NOT NULL;
CREATE INDEX idx_babysitting_requests_created ON babysitting_requests(created_at);

CREATE TRIGGER trg_babysitting_requests_updated_at
  BEFORE UPDATE ON babysitting_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE babysitting_requests IS 'One-time babysitting jobs - first-come-first-serve';

-- ---------------------------------------------------------------------------
-- TABLE 20: bsr_time_slots
-- Purpose: Available time slots for babysitting requests
-- ---------------------------------------------------------------------------
CREATE TABLE bsr_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  babysitting_request_id UUID NOT NULL REFERENCES babysitting_requests(id) ON DELETE CASCADE,

  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  is_selected BOOLEAN DEFAULT false, -- Selected slot after nanny accepts

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bsr_time_slots_request ON bsr_time_slots(babysitting_request_id);
CREATE INDEX idx_bsr_time_slots_date ON bsr_time_slots(slot_date);

COMMENT ON TABLE bsr_time_slots IS 'Time slot options for babysitting requests';

-- ---------------------------------------------------------------------------
-- TABLE 21: bsr_notifications
-- Purpose: Track which nannies were notified about BSR (20 closest)
-- ---------------------------------------------------------------------------
CREATE TABLE bsr_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  babysitting_request_id UUID NOT NULL REFERENCES babysitting_requests(id) ON DELETE CASCADE,
  nanny_id UUID NOT NULL REFERENCES nannies(id) ON DELETE CASCADE,

  -- Notification Status
  notified_at TIMESTAMPTZ DEFAULT NOW(),
  notification_method TEXT CHECK (notification_method IN ('email', 'push', 'sms', 'in_app')),

  -- Response
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ, -- First to accept wins
  declined_at TIMESTAMPTZ,
  declined_reason TEXT,

  -- Post-fill notification
  notified_filled BOOLEAN DEFAULT false,
  notified_filled_at TIMESTAMPTZ,

  -- Distance
  distance_km DECIMAL(6,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bsr_notifications_request ON bsr_notifications(babysitting_request_id);
CREATE INDEX idx_bsr_notifications_nanny ON bsr_notifications(nanny_id);
CREATE INDEX idx_bsr_notifications_accepted ON bsr_notifications(accepted_at) WHERE accepted_at IS NOT NULL;
CREATE INDEX idx_bsr_notifications_distance ON bsr_notifications(distance_km);

-- Prevent duplicate notifications
CREATE UNIQUE INDEX idx_bsr_notifications_unique ON bsr_notifications(babysitting_request_id, nanny_id);

COMMENT ON TABLE bsr_notifications IS 'Tracks 20 closest nannies notified for each BSR';
COMMENT ON COLUMN bsr_notifications.accepted_at IS 'First nanny to have accepted_at wins (first-come-first-serve)';

-- ---------------------------------------------------------------------------
-- TABLE 22: nanny_placements
-- Purpose: Track successful hires between nannies and parents
-- ---------------------------------------------------------------------------
CREATE TABLE nanny_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  nanny_id UUID NOT NULL REFERENCES nannies(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  position_id UUID REFERENCES nanny_positions(id) ON DELETE SET NULL,

  -- Source of placement
  source TEXT NOT NULL CHECK (source IN (
    'interview_request',
    'babysitting_job',
    'direct_hire',
    'referral'
  )),
  interview_request_id UUID REFERENCES interview_requests(id) ON DELETE SET NULL,
  babysitting_request_id UUID REFERENCES babysitting_requests(id) ON DELETE SET NULL,

  -- Placement Timeline
  hired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  start_date DATE,

  -- Status
  status TEXT NOT NULL CHECK (status IN (
    'active',
    'ended',
    'paused'
  )) DEFAULT 'active',

  -- End Details
  ended_at TIMESTAMPTZ,
  end_reason TEXT CHECK (end_reason IN (
    'parent_no_longer_needs',
    'nanny_left',
    'mutual_agreement',
    'relocation',
    'child_aged_out',
    'other'
  )),
  end_notes TEXT,

  -- Computed duration
  placement_duration_days INT GENERATED ALWAYS AS (
    EXTRACT(DAY FROM COALESCE(ended_at, NOW()) - hired_at)::INT
  ) STORED,

  -- Satisfaction Ratings (future feature)
  parent_satisfaction_rating INT CHECK (parent_satisfaction_rating BETWEEN 1 AND 5),
  nanny_satisfaction_rating INT CHECK (nanny_satisfaction_rating BETWEEN 1 AND 5),
  would_rehire BOOLEAN,
  would_work_again BOOLEAN,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_placements_nanny ON nanny_placements(nanny_id);
CREATE INDEX idx_placements_parent ON nanny_placements(parent_id);
CREATE INDEX idx_placements_status ON nanny_placements(status);
CREATE INDEX idx_placements_source ON nanny_placements(source);
CREATE INDEX idx_placements_hired_date ON nanny_placements(hired_at);

-- Only ONE active placement per parent
CREATE UNIQUE INDEX idx_placements_one_active_per_parent
  ON nanny_placements(parent_id)
  WHERE status = 'active';

-- Prevent duplicate active placements (same nanny+parent combo)
CREATE UNIQUE INDEX idx_placements_unique_active
  ON nanny_placements(nanny_id, parent_id)
  WHERE status = 'active';

CREATE TRIGGER trg_nanny_placements_updated_at
  BEFORE UPDATE ON nanny_placements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE nanny_placements IS 'Successful hires - tracks who worked for whom';
COMMENT ON COLUMN nanny_placements.placement_duration_days IS 'Computed: Days from hired_at to ended_at (or now if active)';

-- ---------------------------------------------------------------------------
-- TABLE 23: file_retention_log
-- Purpose: Track files for 5-year retention policy after nanny deactivation
-- ---------------------------------------------------------------------------
CREATE TABLE file_retention_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nanny_id UUID REFERENCES nannies(id) ON DELETE SET NULL,

  file_type TEXT NOT NULL CHECK (file_type IN (
    'wwcc_document',
    'passport_document',
    'identification_photo',
    'police_check',
    'certification',
    'reference',
    'profile_picture',
    'ad_image'
  )),

  file_url TEXT NOT NULL,
  file_storage_provider TEXT CHECK (file_storage_provider IN ('supabase', 'cloudinary')),
  cloudinary_public_id TEXT,

  created_at TIMESTAMPTZ NOT NULL,
  nanny_deactivated_at TIMESTAMPTZ,
  scheduled_deletion_date DATE, -- 5 years after deactivation
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),

  reason_for_deletion TEXT CHECK (reason_for_deletion IN ('retention_expired', 'manual_deletion', 'gdpr_request'))
);

CREATE INDEX idx_file_retention_nanny ON file_retention_log(nanny_id);
CREATE INDEX idx_file_retention_scheduled ON file_retention_log(scheduled_deletion_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_file_retention_deleted ON file_retention_log(deleted_at);

COMMENT ON TABLE file_retention_log IS 'Tracks files for 5-year retention after nanny deactivation';

-- ============================================================================
-- SECTION 9: ADD CIRCULAR FOREIGN KEY CONSTRAINTS
-- These couldn't be added during table creation due to dependencies
-- ============================================================================

-- Add FK from nannies.current_placement_id to nanny_placements
ALTER TABLE nannies
ADD CONSTRAINT fk_nannies_current_placement
FOREIGN KEY (current_placement_id) REFERENCES nanny_placements(id) ON DELETE SET NULL;

-- Add FK from parents.current_nanny_id to nannies
ALTER TABLE parents
ADD CONSTRAINT fk_parents_current_nanny
FOREIGN KEY (current_nanny_id) REFERENCES nannies(id) ON DELETE SET NULL;

-- Add FK from parents.current_placement_id to nanny_placements
ALTER TABLE parents
ADD CONSTRAINT fk_parents_current_placement
FOREIGN KEY (current_placement_id) REFERENCES nanny_placements(id) ON DELETE SET NULL;

-- ============================================================================
-- SECTION 10: TRIGGERS FOR DATA CONSISTENCY
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trigger: Auto-sync placement references when placement status changes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_placement_references()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ended' AND (OLD.status IS NULL OR OLD.status != 'ended') THEN
    -- Clear nanny's current placement reference
    UPDATE nannies
    SET current_placement_id = NULL, updated_at = NOW()
    WHERE current_placement_id = NEW.id;

    -- Clear parent's references
    UPDATE parents
    SET current_placement_id = NULL, current_nanny_id = NULL, updated_at = NOW()
    WHERE current_placement_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_placement_status_change
  AFTER UPDATE ON nanny_placements
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_placement_references();

COMMENT ON FUNCTION sync_placement_references IS 'Auto-clears nanny/parent references when placement ends';

-- ============================================================================
-- SECTION 11: SCHEDULED FUNCTIONS (For Cron Jobs)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Function: Check and expire WWCC (run daily)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_wwcc_expiry()
RETURNS void AS $$
DECLARE
  affected_nannies UUID[];
BEGIN
  -- Get list of nannies being expired
  SELECT ARRAY_AGG(user_id) INTO affected_nannies
  FROM nannies
  WHERE wwcc_verified = true AND wwcc_expiry_date <= CURRENT_DATE;

  -- Update nannies with expired WWCC
  UPDATE nannies
  SET wwcc_verified = false, updated_at = NOW()
  WHERE wwcc_verified = true AND wwcc_expiry_date <= CURRENT_DATE;

  -- Log the expiry events
  INSERT INTO activity_logs (user_id, action_type, action_details, created_at)
  SELECT user_id, 'wwcc_expired', jsonb_build_object('expiry_date', wwcc_expiry_date), NOW()
  FROM nannies
  WHERE user_id = ANY(affected_nannies);

  -- Also update verifications table
  UPDATE verifications v
  SET wwcc_verified = false,
      verification_status = 'expired',
      updated_at = NOW()
  FROM nannies n
  WHERE v.user_id = n.user_id
    AND n.user_id = ANY(affected_nannies);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_wwcc_expiry IS 'Daily cron: Expires WWCC and hides nanny from MM/BSR';

-- ---------------------------------------------------------------------------
-- Function: Cleanup expired files (run daily)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_expired_files()
RETURNS void AS $$
DECLARE
  file_record RECORD;
BEGIN
  FOR file_record IN
    SELECT * FROM file_retention_log
    WHERE scheduled_deletion_date <= CURRENT_DATE AND deleted_at IS NULL
  LOOP
    -- Mark file as deleted
    UPDATE file_retention_log
    SET deleted_at = NOW(),
        reason_for_deletion = 'retention_expired'
    WHERE id = file_record.id;

    -- Log the deletion
    INSERT INTO activity_logs (user_id, action_type, action_details, created_at)
    VALUES (
      (SELECT user_id FROM nannies WHERE id = file_record.nanny_id),
      'file_deleted',
      jsonb_build_object(
        'file_type', file_record.file_type,
        'reason', 'retention_expired',
        'file_url', file_record.file_url
      ),
      NOW()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_files IS 'Daily cron: Marks files for deletion after 5-year retention';

-- ---------------------------------------------------------------------------
-- Function: Send WWCC expiry warnings (run daily)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION send_wwcc_expiry_warnings()
RETURNS void AS $$
BEGIN
  -- Queue emails for nannies with WWCC expiring in 30 days
  INSERT INTO email_logs (recipient_user_id, recipient_email, email_type, subject, status, created_at)
  SELECT
    n.user_id,
    up.email,
    'wwcc_expiring_soon',
    'Your WWCC expires in 30 days - Action required',
    'queued',
    NOW()
  FROM nannies n
  JOIN user_profiles up ON n.user_id = up.user_id
  WHERE n.wwcc_verified = true
    AND n.wwcc_expiry_date = CURRENT_DATE + INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM email_logs el
      WHERE el.recipient_user_id = n.user_id
        AND el.email_type = 'wwcc_expiring_soon'
        AND el.created_at > CURRENT_DATE - INTERVAL '7 days'
    );

  -- Queue emails for nannies with WWCC expiring in 7 days
  INSERT INTO email_logs (recipient_user_id, recipient_email, email_type, subject, status, created_at)
  SELECT
    n.user_id,
    up.email,
    'wwcc_expiring_soon',
    'URGENT: Your WWCC expires in 7 days',
    'queued',
    NOW()
  FROM nannies n
  JOIN user_profiles up ON n.user_id = up.user_id
  WHERE n.wwcc_verified = true
    AND n.wwcc_expiry_date = CURRENT_DATE + INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION send_wwcc_expiry_warnings IS 'Daily cron: Sends warnings at 30 and 7 days before WWCC expires';

-- ============================================================================
-- SECTION 12: UTILITY FUNCTIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Function: Calculate distance between two coordinates (Haversine formula)
-- Used for finding nearest nannies for BSR
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  R DECIMAL := 6371; -- Earth's radius in km
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);

  a := SIN(dlat/2) * SIN(dlat/2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlon/2) * SIN(dlon/2);

  c := 2 * ATAN2(SQRT(a), SQRT(1-a));

  RETURN ROUND((R * c)::DECIMAL, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_distance_km IS 'Haversine formula for distance between coordinates in km';

-- ---------------------------------------------------------------------------
-- Function: Get 20 nearest verified nannies for BSR
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_nearest_nannies_for_bsr(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  nanny_id UUID,
  user_id UUID,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id as nanny_id,
    n.user_id,
    calculate_distance_km(
      p_latitude, p_longitude,
      sp.latitude, sp.longitude
    ) as distance_km
  FROM nannies n
  JOIN user_profiles up ON n.user_id = up.user_id
  JOIN sydney_postcodes sp ON up.suburb = sp.suburb
  WHERE n.visible_in_bsr = true
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_nearest_nannies_for_bsr IS 'Returns 20 nearest verified nannies for BSR notifications';

-- ============================================================================
-- SECTION 13: REFERENCE DATA - SYDNEY POSTCODES (194 suburbs)
-- ============================================================================

INSERT INTO sydney_postcodes (suburb, postcode, latitude, longitude) VALUES
('Sydney', '2000', -33.8688, 151.2093),
('Ultimo', '2007', -33.8822, 151.1987),
('Chippendale', '2008', -33.8872, 151.2007),
('Pyrmont', '2009', -33.8733, 151.1963),
('Surry Hills', '2010', -33.8861, 151.2111),
('Potts Point', '2011', -33.8708, 151.2263),
('Alexandria', '2015', -33.908, 151.1905),
('Redfern', '2016', -33.8929, 151.2053),
('Waterloo', '2017', -33.9001, 151.2115),
('Rosebery', '2018', -33.9213, 151.2045),
('Botany', '2019', -33.9392, 151.2069),
('Mascot', '2020', -33.9312, 151.1894),
('Paddington', '2021', -33.8837, 151.2296),
('Bondi Junction', '2022', -33.8915, 151.2466),
('Bellevue Hill', '2023', -33.8821, 151.2514),
('Waverley', '2024', -33.9014, 151.2541),
('Woollahra', '2025', -33.8885, 151.2394),
('Bondi', '2026', -33.891, 151.2646),
('Edgecliff', '2027', -33.8794, 151.2356),
('Double Bay', '2028', -33.877, 151.2415),
('Rose Bay', '2029', -33.8761, 151.2574),
('Vaucluse', '2030', -33.8566, 151.2721),
('Randwick', '2031', -33.9144, 151.2415),
('Kingsford', '2032', -33.9238, 151.2312),
('Kensington', '2033', -33.9097, 151.2227),
('Coogee', '2034', -33.9192, 151.2536),
('Maroubra', '2035', -33.9458, 151.2403),
('Little Bay', '2036', -33.9782, 151.2443),
('Glebe', '2037', -33.8778, 151.1852),
('Annandale', '2038', -33.8817, 151.1714),
('Rozelle', '2039', -33.8647, 151.1738),
('Leichhardt', '2040', -33.8845, 151.1561),
('Balmain', '2041', -33.8583, 151.1788),
('Newtown', '2042', -33.897, 151.1793),
('Erskineville', '2043', -33.9005, 151.1853),
('St Peters', '2044', -33.909, 151.182),
('Haberfield', '2045', -33.8803, 151.1396),
('Five Dock', '2046', -33.8648, 151.1293),
('Drummoyne', '2047', -33.853, 151.1555),
('Stanmore', '2048', -33.8933, 151.1648),
('Petersham', '2049', -33.8953, 151.1561),
('Camperdown', '2050', -33.8883, 151.1751),
('North Sydney', '2060', -33.8358, 151.2069),
('Kirribilli', '2061', -33.8491, 151.2166),
('Cammeray', '2062', -33.8242, 151.2127),
('Northbridge', '2063', -33.8122, 151.2155),
('Artarmon', '2064', -33.8087, 151.1852),
('Crows Nest', '2065', -33.8256, 151.2014),
('Lane Cove', '2066', -33.8157, 151.1728),
('Chatswood', '2067', -33.7961, 151.178),
('Willoughby', '2068', -33.8078, 151.2015),
('Roseville', '2069', -33.785, 151.1785),
('Lindfield', '2070', -33.7744, 151.1687),
('Killara', '2071', -33.7667, 151.1627),
('Gordon', '2072', -33.7562, 151.1534),
('Pymble', '2073', -33.7438, 151.1422),
('Turramurra', '2074', -33.7319, 151.1306),
('St Ives', '2075', -33.7275, 151.1725),
('Wahroonga', '2076', -33.7196, 151.1182),
('Hornsby', '2077', -33.7033, 151.0978),
('Mount Colah', '2079', -33.6933, 151.1122),
('Mount Kuring-Gai', '2080', -33.6822, 151.1211),
('Berowra', '2081', -33.6667, 151.1333),
('Cowan', '2082', -33.65, 151.15),
('Brooklyn', '2083', -33.6167, 151.15),
('Cottage Point', '2084', -33.6, 151.2333),
('Belrose', '2085', -33.7333, 151.2167),
('Frenchs Forest', '2086', -33.75, 151.2167),
('Forestville', '2087', -33.7667, 151.2167),
('Mosman', '2088', -33.829, 151.2427),
('Neutral Bay', '2089', -33.8329, 151.2227),
('Cremorne', '2090', -33.8293, 151.2289),
('Seaforth', '2092', -33.8048, 151.2435),
('Balgowlah', '2093', -33.7964, 151.2612),
('Fairlight', '2094', -33.7972, 151.2721),
('Manly', '2095', -33.7963, 151.2878),
('Freshwater', '2096', -33.7801, 151.2863),
('Collaroy', '2097', -33.7333, 151.3),
('Dee Why', '2099', -33.7507, 151.2954),
('Brookvale', '2100', -33.7656, 151.2707),
('Narrabeen', '2101', -33.7193, 151.2959),
('Warriewood', '2102', -33.6922, 151.3044),
('Mona Vale', '2103', -33.6749, 151.306),
('Bayview', '2104', -33.65, 151.3167),
('Church Point', '2105', -33.6333, 151.3167),
('Newport', '2106', -33.6333, 151.3),
('Avalon', '2107', -33.6333, 151.3333),
('Palm Beach', '2108', -33.5986, 151.3204),
('Hunters Hill', '2110', -33.8333, 151.15),
('Gladesville', '2111', -33.8167, 151.1333),
('Ryde', '2112', -33.8153, 151.1011),
('North Ryde', '2113', -33.7925, 151.1333),
('West Ryde', '2114', -33.805, 151.085),
('Meadowbank', '2115', -33.805, 151.07),
('Rydalmere', '2116', -33.8, 151.0667),
('Dundas', '2117', -33.7833, 151.0667),
('Carlingford', '2118', -33.7833, 151.05),
('Beecroft', '2119', -33.7667, 151.05),
('Pennant Hills', '2120', -33.75, 151.0667),
('Epping', '2121', -33.7744, 151.0822),
('Eastwood', '2122', -33.7833, 151.1),
('West Pennant Hills', '2125', -33.7833, 151.0333),
('Cherrybrook', '2126', -33.7333, 151.0333),
('Newington', '2127', -33.8427, 151.0664),
('Silverwater', '2128', -33.8422, 151.0475),
('Summer Hill', '2130', -33.8893, 151.1378),
('Ashfield', '2131', -33.8889, 151.1256),
('Croydon', '2132', -33.8833, 151.1167),
('Croydon Park', '2133', -33.8833, 151.1),
('Burwood', '2134', -33.8774, 151.1038),
('Strathfield', '2135', -33.8797, 151.0827),
('Enfield', '2136', -33.875, 151.075),
('Concord', '2137', -33.8542, 151.1031),
('Rhodes', '2138', -33.8297, 151.0872),
('Homebush', '2140', -33.8667, 151.0833),
('Lidcombe', '2141', -33.8642, 151.0428),
('Granville', '2142', -33.8333, 151.0167),
('Regents Park', '2143', -33.8833, 151),
('Auburn', '2144', -33.8497, 151.0336),
('Wentworthville', '2145', -33.8167, 150.9333),
('Toongabbie', '2146', -33.7833, 150.95),
('Seven Hills', '2147', -33.7833, 150.9333),
('Blacktown', '2148', -33.771, 150.9063),
('Parramatta', '2150', -33.815, 151.0011),
('North Rocks', '2151', -33.78, 151.0183),
('Northmead', '2152', -33.7833, 151),
('Baulkham Hills', '2153', -33.7578, 150.9906),
('Castle Hill', '2154', -33.7297, 151.0069),
('Kellyville', '2155', -33.7126, 150.9507),
('Annangrove', '2156', -33.6833, 150.95),
('Glenorie', '2157', -33.65, 151.0333),
('Dural', '2158', -33.6667, 151),
('Galston', '2159', -33.6333, 151.0333),
('Merrylands', '2160', -33.85, 150.9333),
('Guildford', '2161', -33.85, 150.9167),
('Chester Hill', '2162', -33.8667, 150.9667),
('Villawood', '2163', -33.8833, 150.9667),
('Smithfield', '2164', -33.8667, 150.9167),
('Fairfield', '2165', -33.8667, 150.8833),
('Canley Vale', '2166', -33.8833, 150.9167),
('Green Valley', '2168', -33.9167, 150.8833),
('Liverpool', '2170', -33.9167, 150.9167),
('Hoxton Park', '2171', -33.9333, 150.85),
('Bossley Park', '2176', -33.8667, 150.85),
('Greenacre', '2190', -33.9167, 151.0667),
('Belfield', '2191', -33.8967, 151.0967),
('Belmore', '2192', -33.892, 151.116),
('Canterbury', '2193', -33.91, 151.114),
('Campsie', '2194', -33.9125, 151.1278),
('Lakemba', '2195', -33.9214, 151.0822),
('Punchbowl', '2196', -33.9358, 151.0736),
('Bass Hill', '2197', -33.92, 151.09),
('Georges Hall', '2198', -33.92, 151.05),
('Yagoona', '2199', -33.93, 151.03),
('Bankstown', '2200', -33.9167, 151.0333),
('Dulwich Hill', '2203', -33.9103, 151.1408),
('Marrickville', '2204', -33.9111, 151.1573),
('Wolli Creek', '2205', -33.9312, 151.1565),
('Earlwood', '2206', -33.9229, 151.1293),
('Bexley', '2207', -33.9482, 151.126),
('Kingsgrove', '2208', -33.9372, 151.1062),
('Beverly Hills', '2209', -33.9515, 151.0825),
('Peakhurst', '2210', -33.95, 151.0667),
('Padstow', '2211', -33.95, 151.0167),
('Revesby', '2212', -33.9667, 151.0167),
('Panania', '2213', -33.9667, 150.9833),
('Milperra', '2214', -33.9667, 150.9667),
('Rockdale', '2216', -33.9517, 151.1388),
('Kogarah', '2217', -33.965, 151.135),
('Carlton', '2218', -33.9667, 151.1167),
('Sans Souci', '2219', -33.9833, 151.1333),
('Hurstville', '2220', -33.9678, 151.1036),
('Carss Park', '2221', -33.9833, 151.1),
('Penshurst', '2222', -33.9833, 151.0833),
('Oatley', '2223', -33.9833, 151.0667),
('Sylvania', '2224', -34, 151.0667),
('Oyster Bay', '2225', -34.0167, 151.0667),
('Jannali', '2226', -34.0167, 151.05),
('Gymea', '2227', -34.0333, 151.05),
('Miranda', '2228', -34.0361, 151.1028),
('Caringbah', '2229', -34.0333, 151.1167),
('Cronulla', '2230', -34.0574, 151.1522),
('Kurnell', '2231', -34.0167, 151.15),
('Sutherland', '2232', -34.0315, 151.0583),
('Engadine', '2233', -34.05, 151),
('Menai', '2234', -34, 151.0167),
('Campbelltown', '2560', -34.0667, 150.8167),
('Camden', '2570', -34.05, 150.7),
('Glenmore Park', '2745', -33.7333, 150.6833),
('Kingswood', '2747', -33.7667, 150.7167),
('Penrith', '2750', -33.7507, 150.6877),
('St Marys', '2760', -33.7667, 150.7833),
('Quakers Hill', '2763', -33.7333, 150.8333),
('Glenwood', '2768', -33.7167, 150.9167);

-- ============================================================================
-- SECTION 14: FINAL VERIFICATION
-- ============================================================================

-- Count tables (should be 24)
DO $$
DECLARE
  table_count INT;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

  RAISE NOTICE 'Total tables created: %', table_count;

  IF table_count < 23 THEN
    RAISE EXCEPTION 'Expected at least 23 tables, got %', table_count;
  END IF;
END $$;

-- Count Sydney postcodes (should be 194)
DO $$
DECLARE
  postcode_count INT;
BEGIN
  SELECT COUNT(*) INTO postcode_count FROM sydney_postcodes;

  RAISE NOTICE 'Sydney postcodes inserted: %', postcode_count;

  IF postcode_count != 194 THEN
    RAISE WARNING 'Expected 194 postcodes, got %', postcode_count;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Tables Created: 24
-- - Core Identity: user_roles, user_profiles
-- - Reference: sydney_postcodes
-- - Verification & Logging: verifications, activity_logs, email_logs, user_progress
-- - Nanny Profile: nannies, nanny_availability, nanny_credentials, nanny_assurances,
--                  nanny_images, nanny_ai_content
-- - Parent Profile: parents, nanny_positions, position_schedule, position_children
-- - Matching: interview_requests, babysitting_requests, bsr_time_slots,
--             bsr_notifications, nanny_placements
-- - File Management: file_retention_log
--
-- Functions Created:
-- - update_updated_at_column (trigger)
-- - sync_placement_references (trigger)
-- - check_wwcc_expiry (cron)
-- - cleanup_expired_files (cron)
-- - send_wwcc_expiry_warnings (cron)
-- - calculate_distance_km (utility)
-- - get_nearest_nannies_for_bsr (utility)
--
-- Sydney Postcodes: 194 suburbs with lat/lng
--
-- Next Steps:
-- 1. Set up Supabase Cron jobs for daily functions
-- 2. Configure Row Level Security (RLS) policies
-- 3. Set up Supabase Storage buckets
-- 4. Configure Cloudinary integration
--
-- ============================================================================
