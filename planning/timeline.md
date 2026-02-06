# Project Timeline

> High-level timeline for Baby Bloom Sydney development.

## Overview

_Target dates and milestones for the platform rebuild._

---

## Timeline Overview

```
[Documentation]──[Foundation]──[Core Features]──[Polish]──[Launch]
    Week 1-2        Week 3-4      Week 5-8      Week 9-10   Week 11+
```

---

## Phase Breakdown

### Phase 0: Documentation (Weeks 1-2)
**Goal:** Complete system documentation before coding

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Business & Users | Business model, user journeys documented |
| 2 | Technical & Features | All feature specs, technical architecture |

**Exit Criteria:**
- [ ] All documentation folders populated
- [ ] Existing system fully documented
- [ ] Migration plan approved

---

### Phase 1: Foundation (Weeks 3-4)
**Goal:** Set up infrastructure and core systems

| Week | Focus | Deliverables |
|------|-------|--------------|
| 3 | Setup | Next.js project, Supabase, Vercel, CI/CD |
| 4 | Auth | User registration, login, email verification |

**Exit Criteria:**
- [ ] Development environment working
- [ ] Authentication complete
- [ ] Database schema implemented
- [ ] Basic deploy pipeline working

---

### Phase 2: Core Features (Weeks 5-8)
**Goal:** Build main platform functionality

| Week | Focus | Deliverables |
|------|-------|--------------|
| 5 | Profiles | Nanny profiles, parent profiles |
| 6 | Verification | Document upload, WWCC verification |
| 7 | Search & Match | Nanny search, filtering, geolocation |
| 8 | Booking | Booking flow, messaging |

**Exit Criteria:**
- [ ] Nannies can create and manage profiles
- [ ] Parents can search and find nannies
- [ ] Basic booking flow working
- [ ] Messaging between users

---

### Phase 3: Integration (Weeks 9-10)
**Goal:** Add payments, notifications, AI features

| Week | Focus | Deliverables |
|------|-------|--------------|
| 9 | Payments | Stripe integration, payouts |
| 10 | Notifications & AI | Email, push notifications, AI features |

**Exit Criteria:**
- [ ] Payments processing end-to-end
- [ ] Notification system complete
- [ ] AI profile generation working
- [ ] AI verification assistance working

---

### Phase 4: Polish & Testing (Weeks 11-12)
**Goal:** Quality assurance and final touches

| Week | Focus | Deliverables |
|------|-------|--------------|
| 11 | Testing | E2E tests, bug fixes, performance |
| 12 | Polish | UI refinement, mobile optimization |

**Exit Criteria:**
- [ ] All critical bugs fixed
- [ ] Performance acceptable
- [ ] Mobile experience good
- [ ] Beta testing complete

---

### Phase 5: Migration & Launch (Weeks 13-14)
**Goal:** Migrate data and go live

| Week | Focus | Deliverables |
|------|-------|--------------|
| 13 | Migration | Data migration, parallel running |
| 14 | Launch | DNS switch, monitoring, support |

**Exit Criteria:**
- [ ] All data migrated
- [ ] Old system decommissioned
- [ ] Platform live and stable
- [ ] Support processes in place

---

## Key Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Documentation complete | _Week 2_ | ⬜ |
| First deployment | _Week 3_ | ⬜ |
| Auth working | _Week 4_ | ⬜ |
| Search working | _Week 7_ | ⬜ |
| Payments working | _Week 9_ | ⬜ |
| Beta launch | _Week 12_ | ⬜ |
| Production launch | _Week 14_ | ⬜ |

---

## Dependencies & Risks

### Critical Dependencies
| Dependency | Needed By | Status |
|------------|-----------|--------|
| Stripe account approval | Week 9 | ⬜ |
| Domain transfer/setup | Week 13 | ⬜ |
| Existing data export | Week 13 | ⬜ |

### Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Stripe approval delays | Launch delay | Apply early |
| Data migration issues | Launch delay | Test thoroughly |
| Scope creep | Timeline slip | Strict MVP scope |

---

## Open Questions

- [ ] _Actual start date?_
- [ ] _Available development hours per week?_
- [ ] _Hard deadline for launch?_

---

**Last Updated:** _YYYY-MM-DD_
**Status:** 🔴 Not Started
