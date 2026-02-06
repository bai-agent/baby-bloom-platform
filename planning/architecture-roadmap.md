# Baby Bloom Sydney - Technical Architecture Roadmap

## Overview
This document tracks our progress in building the complete technical architecture for the Baby Bloom platform. Each phase builds on the previous, creating a comprehensive blueprint for implementation.

**Current Status:** Business Foundation Complete ✅
**Next Phase:** Database Schema Design

---

## ✅ COMPLETED PHASES

### Phase 0: Business Foundation
**Completed:** [Date]
**Saved Location:** `~/Desktop/BB/nanny-platform/docs/01-business/`, `docs/02-users/`, `docs/07-business-rules/`

**What We Built:**
- Business model and revenue strategy
- Complete user journeys (Nanny, Parent, Admin)
- User types and permission matrix
- Verification rules and access control
- Core business rules
- High-level AI integration points

**Key Deliverables:**
- ✅ business-model.md
- ✅ revenue-model.md
- ✅ competitive-analysis.md
- ✅ nanny-journey.md
- ✅ parent-journey.md
- ✅ admin-workflow.md
- ✅ user-types.md
- ✅ user-permissions.md
- ✅ verification-rules.md
- ✅ access-control-rules.md
- ✅ matching-rules.md
- ✅ AI integration overview.md

**Status:** Ready to build technical architecture on this foundation

---

## 🔄 IN PROGRESS PHASES

### Phase 1: Database Schema Design
**Status:** Not Started
**Estimated Time:** 2-3 hours
**Save Location:** `~/Desktop/BB/nanny-platform/docs/04-technical/database/`

**Objective:**
Design the complete database structure including all tables, fields, relationships, and constraints needed to support the entire platform.

**What We'll Define:**

#### 1.1 Core User Tables
**Tables to Design:**
- `users` (base authentication table)
- `nannies` (nanny-specific data)
- `parents` (parent-specific data)
- `admins` (admin users)

**For Each Table, Define:**
- Primary key
- Core fields (high-level, not every tiny detail)
- Relationships to other tables
- Key constraints (unique, required, etc.)
- Indexes for performance

**Questions to Answer:**
- How do we handle authentication? (Supabase Auth integration)
- How do we differentiate user types? (role field vs separate tables)
- What user data is required vs optional?
- How do we handle soft deletes vs hard deletes?

---

#### 1.2 Nanny Profile & Verification Tables
**Tables to Design:**
- `nanny_profiles` (profile data, AI-generated bio)
- `nanny_verifications` (passport, WWCC, Facebook post status)
- `verification_documents` (stored passport/WWCC images)
- `nanny_availability` (schedule/calendar data)

**For Each Table, Define:**
- Relationship to nannies table
- Verification status tracking (pending, approved, rejected)
- Document storage references (Supabase Storage URLs)
- Tier/badge tracking

**Questions to Answer:**
- How do we track verification progress? (separate rows per verification type? JSON field?)
- How do we store availability? (recurring schedule vs calendar events)
- Where are document images stored? (Supabase Storage paths)
- How do we handle verification expiry? (WWCC expiration dates)

---

#### 1.3 Parent & Position Tables
**Tables to Design:**
- `parent_profiles` (parent data)
- `nanny_positions` (Open Nanny Position data)
- `position_preferences` (what parent wants in a nanny)

**For Each Table, Define:**
- Relationship to parents table
- Position status (open, closed, filled)
- Preference data structure
- Closure tracking (when/why closed)

**Questions to Answer:**
- One position per parent at a time - how to enforce? (DB constraint vs app logic)
- How do we store complex preferences? (JSON vs normalized tables)
- How do we track position history? (soft delete vs archive table)

---

#### 1.4 Interview & Matching Tables
**Tables to Design:**
- `interview_requests` (parent requests interview with nanny)
- `interview_schedules` (confirmed interview times)
- `nanny_matches` (algorithm results - which nannies match which positions)

**For Each Table, Define:**
- Who initiated (parent)
- Who received (nanny)
- Status tracking (pending, accepted, declined, completed)
- Scheduling data (proposed times, confirmed time)

**Questions to Answer:**
- Do we pre-calculate matches and store them? Or calculate on-demand?
- How do we track interview outcomes? (hired, rejected, ghosted)
- How do we prevent duplicate requests?

---

#### 1.5 Babysitting Request Tables
**Tables to Design:**
- `babysitting_requests` (parent posts job)
- `babysitting_notifications` (which 20 nannies were notified)
- `babysitting_acceptances` (nanny accepts job)

**For Each Table, Define:**
- Request details (date/time slots, location, children, rate)
- Notification tracking (who was notified, when)
- Acceptance tracking (who accepted, timestamp)
- Job status (open, filled, cancelled, completed)

**Questions to Answer:**
- How do we store multiple time slots per request? (array vs separate rows)
- How do we handle "first to accept" race conditions? (DB transaction, timestamp)
- How do we track geolocation for matching? (lat/lng fields, PostGIS extension?)

---

#### 1.6 AI & Communication Tables
**Tables to Design:**
- `ai_generated_content` (bios, Facebook posts)
- `email_logs` (all emails sent by system)
- `notifications` (SMS/email notification queue)

**For Each Table, Define:**
- What AI generated (bio, post, email)
- When it was generated
- Quality metrics (regeneration count, user edits)
- Delivery status (sent, failed, bounced)

**Questions to Answer:**
- Do we version AI-generated content? (track regenerations)
- How do we queue emails? (immediate send vs background job)
- How do we handle email failures? (retry logic, tracking)

---

#### 1.7 Admin & Audit Tables
**Tables to Design:**
- `admin_actions` (admin overrides, edits, approvals)
- `audit_logs` (track all important state changes)

**For Each Table, Define:**
- Who (admin user)
- What (action taken)
- When (timestamp)
- Why (reason/notes)
- Target (which user/record affected)

**Questions to Answer:**
- What actions need audit trails?
- How long do we keep audit logs?
- Do we need GDPR-compliant data deletion tracking?

---

#### 1.8 Database Relationships Map
**Deliverable:** Visual relationship diagram (text-based)

**Key Relationships to Document:**
- One-to-One (user → nanny profile)
- One-to-Many (parent → interview requests)
- Many-to-Many (nannies ↔ babysitting requests via notifications)

**Questions to Answer:**
- What are foreign key constraints?
- What should cascade on delete?
- What needs referential integrity?

---

#### 1.9 Supabase-Specific Considerations
**Security:**
- Row Level Security (RLS) policies for each table
- Who can read/write what data?

**Performance:**
- What indexes do we need?
- What queries will be most common?

**Real-time:**
- What tables need real-time subscriptions?
- Do we need triggers or functions?

---

**Phase 1 Deliverables:**
- [ ] `schema.md` - Complete database schema documentation
- [ ] `relationships.md` - Entity relationship diagram and explanations
- [ ] `supabase-setup.sql` - SQL script to create all tables
- [ ] `rls-policies.md` - Row Level Security policy definitions

**Next Step After Phase 1:** Design API endpoints that interact with this database

---

## 📋 UPCOMING PHASES

### Phase 2: API Endpoint Structure
**Status:** Not Started
**Dependencies:** Database Schema (Phase 1)
**Estimated Time:** 2-3 hours
**Save Location:** `~/Desktop/BB/nanny-platform/docs/04-technical/api/`

**Objective:**
Map every API endpoint needed for the platform, defining what each does, what data it accepts, what it returns, and what database operations it performs.

**What We'll Define:**

#### 2.1 Authentication Endpoints
**Endpoints to Design:**
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - End session
- `POST /api/auth/reset-password` - Password reset flow
- `GET /api/auth/session` - Check current session

**For Each Endpoint, Define:**
- HTTP method (GET, POST, PUT, DELETE)
- Request body structure
- Response structure (success + error cases)
- Authentication requirements
- Database operations performed
- Business logic executed

---

#### 2.2 Nanny Profile Endpoints
**Endpoints to Design:**
- `POST /api/nanny/profile` - Create nanny profile
- `GET /api/nanny/profile/:id` - Get nanny profile (public view)
- `PUT /api/nanny/profile` - Update own profile
- `POST /api/nanny/generate-bio` - Trigger AI bio generation
- `POST /api/nanny/generate-facebook-post` - Generate FB post
- `GET /api/nanny/availability` - Get availability calendar
- `PUT /api/nanny/availability` - Update availability

**For Each Endpoint:**
- Input validation rules
- AI service calls (if any)
- Authorization checks (who can access)
- Rate limiting considerations

---

#### 2.3 Verification Endpoints
**Endpoints to Design:**
- `POST /api/verification/passport` - Upload passport for verification
- `POST /api/verification/wwcc` - Upload WWCC for verification
- `POST /api/verification/facebook-screenshot` - Upload FB screenshot
- `GET /api/verification/status` - Check verification status
- `PUT /api/admin/verification/:id/override` - Admin override verification

**For Each Endpoint:**
- File upload handling
- AI verification trigger
- Status update flow
- Admin override logic

---

#### 2.4 Parent & Position Endpoints
**Endpoints to Design:**
- `POST /api/parent/profile` - Create parent profile
- `POST /api/parent/position` - Create Open Nanny Position
- `GET /api/parent/position` - Get current open position
- `PUT /api/parent/position/:id/close` - Close position
- `GET /api/parent/matched-nannies` - Get matched nannies for position

**For Each Endpoint:**
- Preference form processing
- Matching algorithm trigger
- Position limit enforcement (only one at a time)

---

#### 2.5 Interview Request Endpoints
**Endpoints to Design:**
- `POST /api/interview/request` - Parent requests interview
- `GET /api/interview/requests` - Get all interview requests (for user)
- `PUT /api/interview/accept` - Nanny accepts and selects time
- `PUT /api/interview/cancel` - Cancel interview request
- `POST /api/interview/followup` - Send follow-up email (AI)

**For Each Endpoint:**
- Email trigger logic
- Calendar invite generation
- Status tracking

---

#### 2.6 Babysitting Request Endpoints
**Endpoints to Design:**
- `POST /api/babysitting/request` - Parent posts babysitting job
- `GET /api/babysitting/requests` - Get requests (for nanny or parent)
- `POST /api/babysitting/accept` - Nanny accepts job
- `PUT /api/babysitting/cancel` - Cancel request
- `GET /api/babysitting/available-nannies` - Find 20 closest nannies

**For Each Endpoint:**
- Geolocation matching logic
- Notification trigger (20 nannies)
- First-come-first-serve handling
- Address sharing logic

---

#### 2.7 Public & Search Endpoints
**Endpoints to Design:**
- `GET /api/public/nannies` - Browse all nannies (no auth required)
- `GET /api/nannies/search` - Search/filter nannies (auth required for availability)
- `GET /api/nanny/:id` - Get single nanny profile

**For Each Endpoint:**
- Public vs authenticated data differences
- Search/filter parameters
- Pagination logic

---

#### 2.8 Admin Endpoints
**Endpoints to Design:**
- `GET /api/admin/users` - List all users
- `GET /api/admin/verifications/pending` - Get pending verifications
- `PUT /api/admin/user/:id` - Edit user data
- `GET /api/admin/analytics` - Platform metrics
- `POST /api/admin/notification` - Send manual notification

**For Each Endpoint:**
- Admin authentication check
- Audit log creation
- Override capabilities

---

**Phase 2 Deliverables:**
- [ ] `endpoints.md` - Complete API endpoint documentation
- [ ] `api-design-principles.md` - REST conventions, error handling, versioning
- [ ] `authentication.md` - How auth works across all endpoints
- [ ] `rate-limiting.md` - Rate limit strategies per endpoint type

**Next Step After Phase 2:** Design frontend pages that consume these APIs

---

### Phase 3: Frontend Structure
**Status:** Not Started
**Dependencies:** API Endpoints (Phase 2)
**Estimated Time:** 2-3 hours
**Save Location:** `~/Desktop/BB/nanny-platform/docs/04-technical/frontend/`

**Objective:**
Define all pages, components, and user interface flows that make up the frontend application.

**What We'll Define:**

#### 3.1 Page Structure & Routing
**All Pages to Define:**

**Public Pages (No Auth):**
- `/` - Landing page
- `/browse` - Browse all nannies
- `/nanny/:id` - Individual nanny profile
- `/about` - About Baby Bloom
- `/login` - Login page
- `/signup` - Signup (choose nanny or parent)

**Nanny Dashboard Pages:**
- `/nanny/dashboard` - Nanny home
- `/nanny/profile` - Edit profile
- `/nanny/verification` - Upload verification docs
- `/nanny/requests` - Interview requests
- `/nanny/babysitting` - Babysitting opportunities
- `/nanny/settings` - Account settings

**Parent Dashboard Pages:**
- `/parent/dashboard` - Parent home
- `/parent/position` - Manage Open Nanny Position
- `/parent/browse` - Browse/search nannies
- `/parent/interviews` - Interview requests status
- `/parent/babysitting` - Post/manage babysitting requests
- `/parent/settings` - Account settings

**Admin Pages:**
- `/admin/dashboard` - Admin overview
- `/admin/verifications` - Review pending verifications
- `/admin/users` - User management
- `/admin/analytics` - Platform metrics

**For Each Page, Define:**
- What API endpoints it calls
- What user permissions required
- Key UI components needed
- Page layout structure

---

#### 3.2 Reusable Component Library
**Components to Define:**

**UI Components:**
- NannyCard (profile preview card)
- InterviewRequestCard
- BabysittingRequestCard
- VerificationStatus (badge/indicator)
- AvailabilityCalendar
- PreferenceForm
- FileUploadWidget

**Layout Components:**
- DashboardLayout (nanny/parent/admin)
- PublicLayout (landing, browse)
- AuthLayout (login/signup)

**For Each Component:**
- Props it accepts
- State it manages
- API calls it makes (if any)
- Reusability across pages

---

#### 3.3 State Management Strategy
**Questions to Answer:**
- Global state (user session, auth)?
- Local state (form inputs, UI toggles)?
- Server state (React Query for API data)?
- How do we handle loading/error states?

---

#### 3.4 Form Handling Strategy
**All Forms to Define:**
- Nanny signup form
- Parent signup form
- Nanny profile form
- Parent preference form (Open Position)
- Babysitting request form
- Verification upload forms
- Interview request form

**For Each Form:**
- Fields and validation rules
- Submit behavior (API call)
- Error handling
- Success flow

---

**Phase 3 Deliverables:**
- [ ] `pages.md` - All pages and routing structure
- [ ] `components.md` - Reusable component library
- [ ] `state-management.md` - State strategy
- [ ] `forms.md` - Form handling approach
- [ ] `routing.md` - Next.js routing configuration

**Next Step After Phase 3:** Create implementation plan (build order)

---

### Phase 4: Build Sequence & Implementation Plan
**Status:** Not Started
**Dependencies:** Database + API + Frontend (Phases 1-3)
**Estimated Time:** 1-2 hours
**Save Location:** `~/Desktop/BB/nanny-platform/planning/`

**Objective:**
Create a step-by-step implementation plan that defines exactly what gets built in what order, with clear milestones and dependencies.

**What We'll Define:**

#### 4.1 MVP Definition
**Questions to Answer:**
- What's the minimum to launch?
- What can be stubbed/simplified initially?
- What's "nice to have" vs "must have"?

**Core MVP Features:**
- Nanny signup + profile creation
- Parent signup + browse nannies
- Interview request (even if manual coordination initially)
- Basic verification (manual admin approval to start)

**Post-MVP Features:**
- AI bio generation (can start with templates)
- AI verification (can be admin-only initially)
- Babysitting system (can launch after regular matching works)
- Facebook post generation

---

#### 4.2 Build Phases

**Week 1: Foundation**
- Day 1: Next.js + Supabase setup, auth working
- Day 2: Database tables created, basic routing
- Day 3: Nanny signup flow (form → database)
- Day 4: Parent signup flow
- Day 5: Browse nannies page (read-only)

**Week 2: Core Matching**
- Day 6: Nanny profile editing
- Day 7: Parent preference form (Open Position)
- Day 8: Basic matching algorithm
- Day 9: Interview request flow (without AI)
- Day 10: Interview request UI

**Week 3: Verification & AI**
- Day 11: Verification upload system
- Day 12: AI bio generation integration
- Day 13: AI verification integration
- Day 14: Nanny tier/badge system
- Day 15: Admin verification review dashboard

**Week 4: Babysitting System**
- Day 16: Babysitting request form
- Day 17: Geolocation matching
- Day 18: Notification system (20 closest nannies)
- Day 19: Acceptance handling
- Day 20: Testing and bug fixes

**Week 5: Polish & Launch Prep**
- Day 21-25: UI polish, error handling, edge cases, testing

---

#### 4.3 Feature Flags & Toggles
**What Features Can Be Toggled:**
- AI bio generation (fallback to manual/template)
- AI verification (fallback to admin manual review)
- Babysitting system (launch regular matching first)
- Facebook post requirement (make optional initially)

---

#### 4.4 Testing Strategy
**What Needs Testing:**
- User flows (signup → verification → matching)
- AI integrations (do they work? fallbacks?)
- Email sending (deliverability)
- Edge cases (race conditions, simultaneous actions)

---

#### 4.5 Deployment Strategy
**Questions to Answer:**
- How do we deploy? (Vercel auto-deploy from GitHub)
- What environments? (dev, staging, production)
- How do we handle database migrations?
- What's the rollback plan?

---

**Phase 4 Deliverables:**
- [ ] `mvp-definition.md` - What's in/out of MVP
- [ ] `implementation-plan.md` - Day-by-day build plan
- [ ] `feature-flags.md` - What can be toggled
- [ ] `testing-plan.md` - Testing approach
- [ ] `deployment-plan.md` - How we ship

**Next Step After Phase 4:** Start building! (Use Claude Code with this plan)

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Complete When:
- [ ] Every table is defined with fields and types
- [ ] All relationships are mapped
- [ ] Supabase setup SQL is ready to run
- [ ] We understand the data model completely

### Phase 2 Complete When:
- [ ] Every user action has a corresponding API endpoint
- [ ] Request/response formats are documented
- [ ] Authentication strategy is clear
- [ ] We know what database operations each endpoint performs

### Phase 3 Complete When:
- [ ] Every page is mapped to URL routes
- [ ] We know what components are needed
- [ ] State management approach is defined
- [ ] We understand the user interface completely

### Phase 4 Complete When:
- [ ] We have a day-by-day build plan
- [ ] MVP is clearly defined
- [ ] We know what gets built first/last
- [ ] Deployment strategy is documented

### ALL PHASES COMPLETE = READY TO BUILD! 🚀

---

## 📝 NOTES & DECISIONS LOG

### Key Decisions Made:
- Using Next.js 14 (App Router)
- Using Supabase for database + auth + storage
- Using Anthropic Claude API for AI features
- Using Vercel for hosting
- Modular architecture - each system independent

### Open Questions:
- (We'll add questions here as they come up during design)

### Changes from Original Plan:
- (We'll track any pivots or adjustments here)

---

## 🔄 HOW TO USE THIS DOCUMENT

### For Planning Sessions:
1. Check current phase status
2. Work through that phase's questions
3. Update deliverables checklist as we complete them
4. Move to next phase when complete

### For Implementation:
1. Reference completed phases when building
2. Follow the implementation plan (Phase 4)
3. Use database schema (Phase 1) when creating tables
4. Use API docs (Phase 2) when building endpoints
5. Use frontend docs (Phase 3) when building UI

### For Cowork:
1. Each phase creates files in the master folder
2. Cowork saves our decisions as we make them
3. This roadmap stays in sync with those files

---

**Last Updated:** February 5, 2026
**Current Phase:** Phase 0 Complete, Starting Phase 1
**Overall Progress:** 20% (1 of 5 phases complete)
