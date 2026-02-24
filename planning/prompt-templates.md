# Prompt Templates — Baby Bloom Sydney

**Purpose:** Copy-paste these into Claude Code for consistent, token-efficient results.  
**Usage:** Pick the template that matches your task, fill in the [brackets], paste into Claude Code.

---

## 🔧 BUG FIX

```
Read CLAUDE.md and docs/04-technical/build-progress.md.

Fix: [describe the bug and where you see it]
File: [file path if known]

Make the minimal change needed. Don't refactor surrounding code.
Update build-progress.md when done (remove bug from Known Bugs if fixed, or update status).
```

**Example:**
```
Read CLAUDE.md and docs/04-technical/build-progress.md.

Fix: Signup fails with "Failed to set up user role." RLS blocks initial inserts because the user has no role yet.
File: src/lib/auth/actions.ts

Make the minimal change needed — use a Supabase admin client (service role key) for the signup inserts only.
Don't refactor surrounding code.
Update build-progress.md when done.
```

---

## 🆕 NEW FEATURE (Single)

```
Read CLAUDE.md and docs/04-technical/build-progress.md.
Also read: [list specific docs needed, e.g., docs/02-users/nanny-journey.md, docs/04-technical/database/schema.md]

Build: [describe the feature]

Requirements:
- [requirement 1]
- [requirement 2]
- [requirement 3]

Check the Component Registry in build-progress.md before creating new components.
Check package.json before installing packages.
Update build-progress.md when done (add new components to registry, update What Works, set Next Task).
```

**Example:**
```
Read CLAUDE.md and docs/04-technical/build-progress.md.
Also read: docs/02-users/nanny-journey.md, docs/04-technical/database/schema.md

Build: Nanny profile editing form

Requirements:
- Form with all fields from the nannies table (experience, rates, skills, languages, etc.)
- Use react-hook-form + zod for validation
- Save to nannies table via Supabase
- Show success/error states
- Place at src/app/(dashboard)/nanny/profile/page.tsx (replace placeholder)

Check the Component Registry in build-progress.md before creating new components.
Update build-progress.md when done.
```

---

## 🚀 AGENT TEAM (Multiple Features in Parallel)

```
Read CLAUDE.md and docs/04-technical/build-progress.md.

COMPACTION RULES:
- Compact at logical breakpoints — after each agent completes, not mid-task.
- Before every compact: update CLAUDE.md and docs/04-technical/build-progress.md with files created, files modified, bugs found, component registry updates, and exact next task.

TASK: [overall description]

Agent 1 — [name]:
- [task description]
- Read only: [specific files this agent needs]
- Output: [what files to create/modify]

Agent 2 — [name]:
- [task description]
- Read only: [specific files this agent needs]
- Output: [what files to create/modify]

Agent 3 — [name]:
- [task description]
- Read only: [specific files this agent needs]
- Output: [what files to create/modify]

All agents: check Component Registry before creating new components. Check package.json before installing packages.
Update build-progress.md after each agent completes.
```

**Example:**
```
Read CLAUDE.md and docs/04-technical/build-progress.md.

COMPACTION RULES:
- Compact at logical breakpoints — after each agent completes, not mid-task.
- Before every compact: update CLAUDE.md and docs/04-technical/build-progress.md.

TASK: Build nanny verification flows and parent position creation.

Agent 1 — Verification Upload:
- Build WWCC and passport upload forms with Supabase Storage
- Read only: schema.md (verifications table), docs/07-business-rules/verification-rules.md
- Output: src/app/(dashboard)/nanny/verification/page.tsx, src/lib/verification/

Agent 2 — Position Form:
- Build parent position creation form (42 fields)
- Read only: schema.md (nanny_positions, position_schedule, position_children tables), docs/02-users/parent-journey.md
- Output: src/app/(dashboard)/parent/position/page.tsx, src/lib/positions/

All agents: check Component Registry before creating new components.
Update build-progress.md after each agent completes.
```

---

## 🎨 UI/STYLING CHANGE

```
Read CLAUDE.md and docs/04-technical/build-progress.md.

Change: [describe what to change visually]
Files: [file paths]

Keep the existing Violet (#8B5CF6) design system. Use existing shadcn/ui components.
Don't change functionality — styling only.
Update build-progress.md if any new components were created.
```

---

## 🔄 RESUME AFTER BREAK

Use this when starting a new Claude Code session to continue where you left off:

```
Read CLAUDE.md and docs/04-technical/build-progress.md.

Continue from where the last session left off. The build-progress.md has the current state, known bugs, and next task.

Start with whatever is listed under "Next Task" in build-progress.md.
Work in plan mode first — show me what you plan to do before starting.
```

---

## 🗄️ DATABASE CHANGE

```
Read CLAUDE.md and docs/04-technical/build-progress.md.
Also read: docs/04-technical/database/schema.md, docs/04-technical/database/rls-policies.sql

Change: [describe the database change needed]

Generate the SQL migration and prepare it for me to run in the Supabase SQL Editor.
Don't run it directly — just give me the SQL to paste.
Update schema.md and build-progress.md with the change.
```

---

## 📝 DOCUMENTATION UPDATE

```
Read CLAUDE.md and docs/04-technical/build-progress.md.

Update: [which doc and what changed]

Keep it concise. Only update what actually changed.
```

---

## Notes

- **Plan mode first:** For any task bigger than a simple bug fix, start Claude Code in plan mode (Shift+Tab) so it shows you the plan before executing.
- **One template at a time:** Don't combine templates. If you have a bug fix AND a new feature, do them as separate prompts.
- **Always check output:** After Claude Code finishes, review the build-progress.md it updated to make sure it's accurate.
- **Agent teams cost more tokens:** Only use the Agent Team template when you have 3+ truly independent tasks. For 1-2 tasks, use the Single Feature template.
