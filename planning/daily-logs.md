# Daily Logs

> Running log of daily progress, decisions, and blockers.

## Overview

_Use this file to track daily progress during development._

---

## Log Template

```
## YYYY-MM-DD (Day X)

### Completed
- [x] Task 1
- [x] Task 2

### In Progress
- [ ] Task 3 (X% complete)

### Blockers
- Issue description → Action needed

### Notes
- Any observations or learnings

### Tomorrow
- [ ] Planned task 1
- [ ] Planned task 2
```

---

## Week 1

### 2026-02-06 (Day 1)

#### Completed
- [x] Database deployed to Supabase (23 tables, 7 functions, RLS on all tables)
  - supabase-setup.sql: 235 commands executed
  - rls-policies.sql: 253 commands executed
  - seed.sql: 194 Sydney postcodes seeded
- [x] Fixed PG17 compatibility issue (placement_duration_days generated column)
- [x] Fixed table count verification (23 public tables, not 24)
- [x] Swapped AI SDK from Anthropic to OpenAI
  - Uninstalled @anthropic-ai/sdk
  - Installed openai v6.18.0
  - Created app/src/lib/ai/client.ts
- [x] Updated all documentation to reference OpenAI instead of Anthropic
- [x] Updated CLAUDE.md with full deployment status
- [x] Updated planning files (architecture-roadmap, milestones, timeline)

#### Blockers
- seed.sql test users require auth.users entries (created via Supabase Auth, not SQL)
  - Postcode data was seeded successfully
  - Test users to be created later via Supabase Dashboard or Auth API

#### Notes
- Supabase project is in ap-northeast-1 (Tokyo), not ap-southeast-2 (Sydney)
- PostgreSQL version: 17.6
- Pooler connection: aws-1-ap-northeast-1.pooler.supabase.com:5432
- PG17 enforces immutability on generated columns strictly (now() not allowed)

#### Tomorrow
- [ ] Phase 2: API Endpoints design
- [ ] Create test auth users via Supabase Dashboard

---

## Week 2

_Add entries as work progresses..._

---

## Week 3

_Add entries as work progresses..._

---

## Key Decisions Log

_Important decisions made during development:_

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-06 | Switch from Anthropic Claude to OpenAI GPT-4o | OpenAI SDK (openai) replaces @anthropic-ai/sdk |
| 2026-02-06 | placement_duration_days NULL while active | PG17 requires immutable expressions in generated columns; now() is not immutable |
| 2026-02-06 | 23 public tables (not 24) | auth.users is in auth schema, not counted in public |

---

## Blockers History

_Track resolved blockers for future reference:_

| Date | Blocker | Resolution | Time Lost |
|------|---------|------------|-----------|
| _Date_ | _Issue_ | _How resolved_ | _X hours_ |

---

## Weekly Summaries

### Week 1 Summary
**Dates:** _Start - End_
**Focus:** _Main focus area_

**Accomplished:**
- Item 1
- Item 2

**Challenges:**
- Challenge 1

**Next Week:**
- Goal 1
- Goal 2

---

### Week 2 Summary
_To be filled in..._

---

**Instructions:**
1. Add a new entry each work day
2. Be specific about what was completed
3. Note any blockers immediately
4. Update weekly summaries at end of each week
