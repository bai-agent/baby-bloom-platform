# CLAUDE.md - Baby Bloom Sydney

## Project Overview
Baby Bloom Sydney is a nanny matching platform for Sydney, Australia. We're rebuilding it from a manual Wix + Google Sheets system into a modern automated web app with AI-powered features.

**Tech Stack:** Next.js 14 (App Router), Supabase (PostgreSQL + Auth + Storage), Anthropic Claude API, Cloudinary (images), Vercel (hosting)

---

## Architecture Summary

### Database: 24 Tables across 6 domains

**Core Identity (3 tables):**
- `users` - Supabase Auth managed
- `user_roles` - nanny, parent, admin
- `user_profiles` - shared data (name, email, location, profile pic)

**Nanny Domain (7 tables):**
- `nannies` - profile, experience, rates, status, verification tier
- `nanny_availability` - weekly schedule (JSONB)
- `nanny_credentials` - qualifications + certifications
- `nanny_assurances` - police checks, references
- `nanny_images` - ad images (Cloudinary URLs)
- `nanny_ai_content` - AI-generated bios, Facebook posts
- `verifications` - WWCC + passport verification tracking

**Parent Domain (4 tables):**
- `parents` - family info, current_nanny_id
- `nanny_positions` - open positions (ONE active per parent, enforced by unique index)
- `position_schedule` - weekly needs (JSONB)
- `position_children` - 1-3 children, ages stored in months (INTEGER)

**Matching & Requests (5 tables):**
- `interview_requests` - parent → nanny interview coordination
- `babysitting_requests` - one-time jobs
- `bsr_time_slots` - multiple time slots per babysitting request
- `bsr_notifications` - 20 closest nannies notified per job
- `nanny_placements` - hired nanny tracking (permanent record)

**Reference & Logs (5 tables):**
- `sydney_postcodes` - 194 suburbs with lat/lng for geolocation
- `activity_logs` - complete audit trail
- `email_logs` - all system emails
- `user_progress` - funnel tracking
- `file_retention_log` - 5-year file deletion tracking

---

## Key Business Rules

### Verification Tiers (enforced by computed columns):
- **Tier 1:** Profile created → `profile_visible = true`
- **Tier 2:** WWCC + Passport verified → `visible_in_match_making = true`
- **Tier 3:** Facebook post verified → `visible_in_bsr = true`

### Constraints:
- ONE active position per parent (unique index)
- ONE active placement per parent (unique index)
- WWCC expiry auto-disables via daily cron → `wwcc_verified = false`
- File retention: 5 years after account deactivation, then auto-delete

### Matching Algorithm:
**Regular Matching (nanny positions):**
- Hard filters: availability overlap, location proximity, child age experience
- Weighted scoring: Rate 30%, Experience 25%, Qualifications 20%, Skills 15%, Other 10%

**Babysitting Matching (one-time jobs):**
- Find all Tier 3 nannies available at requested time
- Calculate distance using sydney_postcodes lat/lng
- Select 20 closest, notify all simultaneously
- First to accept wins (timestamp determines)

---

## Database Design Decisions
- CITEXT for email fields (case-insensitive)
- UUID primary keys on all tables
- Child ages as INTEGER in months (0-180+)
- Merged qualifications + certifications into single `nanny_credentials` table
- Computed columns enforce business rules (visibility flags)
- Nanny placements have bidirectional references (parent.current_nanny_id ↔ nanny.current_placement_id)
- Partial indexes on active records only (performance)
- GIN indexes on JSONB columns (availability schedules)
- Foreign key cascades for referential integrity
- `updated_at` auto-update triggers on every table

---

## User Journeys

### Nanny Flow:
Signup (40 fields) → AI bio generated → Profile live (Tier 1) → Upload passport + WWCC → AI verifies → Tier 2 → Share AI-generated Facebook post → Upload screenshot → Tier 3 → Receive interview requests → Get hired → Placement tracked → Available for babysitting jobs

### Parent Flow:
Browse nannies publicly → Signup → See availability calendars → Create position (42-field form, ONE at a time) → See matched nannies → Request interview (pick 3 times) → AI emails nanny → Interview → Hire → Placement created → Can also post babysitting requests

### Admin Flow:
Monitor signups → Review/override AI verifications → Handle disputes → Track conversion metrics

---

## AI Integration Points
- **Content generation:** Nanny bios (from 40-field form), Facebook posts (viral growth), interview emails
- **Verification:** Passport photo matching, WWCC document parsing, Facebook screenshot validation
- **Coordination:** Email sequencing (request → accept → confirm → remind), calendar invite generation

---

## File Structure

```
~/Desktop/BB/nanny-platform/
├── docs/
│   ├── 01-business/          ← business model, revenue (COMPLETE)
│   ├── 02-users/             ← user journeys, permissions (COMPLETE)
│   ├── 04-technical/
│   │   ├── database/         ← schema.md, relationships.md (COMPLETE), SQL + RLS (TODO)
│   │   ├── api/              ← Phase 2 (TODO)
│   │   └── frontend/         ← Phase 3 (TODO)
│   ├── 05-ai-integration/    ← AI overview
│   └── 07-business-rules/    ← verification, access control, matching rules (COMPLETE)
└── planning/                 ← roadmap, blueprint, roles doc
```

---

## Current Progress
- **Phase 0:** Business Foundation ✅ COMPLETE
- **Phase 1:** Database Schema ✅ COMPLETE (schema.md, relationships.md, supabase-setup.sql, rls-policies.md)
- **Phase 2:** API Endpoints — NOT STARTED
- **Phase 3:** Frontend Structure — NOT STARTED
- **Phase 4:** Build Sequence — NOT STARTED
- **Phase 5:** Implementation — NOT STARTED

---

## Important Context for Agents
- All existing documentation is in `~/Desktop/BB/nanny-platform/docs/`
- Read `docs/04-technical/database/schema.md` for complete table definitions
- Read `docs/04-technical/database/relationships.md` for entity relationships
- Read `docs/04-technical/database/supabase-setup.sql` for the complete migration script
- Read `docs/04-technical/database/rls-policies.md` for Row Level Security policies
- The postcodes CSV has 194 Sydney suburbs with lat/lng — already loaded in SQL migration
- Storage: Cloudinary for images, Supabase Storage for documents (WWCC, passports)
- Row Level Security (RLS) is defined for every table in rls-policies.md
- Supabase Auth manages the `users` table — we don't create it manually

---

## Code Style & Conventions
- PostgreSQL with Supabase extensions (uuid-ossp, citext, pg_trgm)
- SQL: lowercase keywords, snake_case table/column names
- Use `TIMESTAMPTZ` for all timestamps (UTC)
- All tables get: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`
- Use `REFERENCES` with `ON DELETE` clauses for all foreign keys
- Comment all tables and complex columns in SQL
