# Baby Bloom Sydney

> A platform connecting parents with trusted nannies in Sydney.

---

## Project Status

🔄 **Currently:** Rebuilding from prototype to production-ready platform

| Current Stack | New Stack |
|---------------|-----------|
| Wix | Next.js 14 |
| Google Sheets | Supabase (PostgreSQL) |
| Make.com | Supabase Edge Functions |
| Various scripts | TypeScript codebase |
| Manual hosting | Vercel |

---

## Quick Navigation

| Section | Description |
|---------|-------------|
| [STRUCTURE-MAP.md](STRUCTURE-MAP.md) | Complete directory structure |
| [docs/01-business/](docs/01-business/) | Business model, revenue, strategy |
| [docs/02-users/](docs/02-users/) | User personas and journeys |
| [docs/03-features/](docs/03-features/) | Feature specifications |
| [docs/04-technical/](docs/04-technical/) | Architecture, database, API |
| [docs/05-ai-integration/](docs/05-ai-integration/) | AI features and prompts |
| [docs/06-existing-system/](docs/06-existing-system/) | Current system documentation |
| [docs/07-business-rules/](docs/07-business-rules/) | Policies and validation rules |
| [docs/08-development/](docs/08-development/) | Developer guides |
| [planning/](planning/) | Timeline, milestones, logs |

---

## Project Structure

```
nanny-platform/
├── README.md                 # This file
├── STRUCTURE-MAP.md          # Complete structure guide
│
├── docs/
│   ├── 01-business/          # Business model & strategy
│   ├── 02-users/             # User types & journeys
│   ├── 03-features/          # Feature specifications
│   │   ├── onboarding/       # Signup, profiles, AI generation
│   │   ├── verification/     # ID, WWCC, badges
│   │   ├── matching/         # Search, geolocation, requests
│   │   ├── communication/    # Email, interviews, notifications
│   │   └── social/           # Facebook integration
│   ├── 04-technical/         # Technical documentation
│   │   ├── architecture/     # System design
│   │   ├── database/         # Schema, relationships
│   │   ├── api/              # Endpoints, auth
│   │   └── frontend/         # Pages, components
│   ├── 05-ai-integration/    # AI strategy & prompts
│   │   └── prompts/          # AI prompt templates
│   ├── 06-existing-system/   # Current Wix/Sheets/Make docs
│   │   ├── wix-scripts/
│   │   ├── gas-scripts/
│   │   ├── make-blueprints/
│   │   └── github-scripts/
│   ├── 07-business-rules/    # Policies & rules
│   └── 08-development/       # Developer guides
│
├── planning/                 # Project planning
│   ├── timeline.md
│   ├── milestones.md
│   ├── daily-logs.md
│   └── decisions.md
│
└── scripts/                  # Utility scripts (future)
```

---

## Getting Started

### Documentation Phase (Current)
1. Review the [STRUCTURE-MAP.md](STRUCTURE-MAP.md) for full directory structure
2. Fill in documentation templates with project specifics
3. Start with `06-existing-system/` to document current prototype
4. Then move to `01-business/` and `02-users/` for requirements

### Development Phase (Future)
```bash
# Clone the repo
git clone [repo-url]
cd baby-bloom-sydney

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local

# Start local Supabase
supabase start

# Run development server
pnpm dev
```

See [docs/08-development/setup-guide.md](docs/08-development/setup-guide.md) for full setup instructions.

---

## Key Information

**Project Owner:** Bailey
**Email:** admin@babybloomsydney.com.au
**Location:** Sydney, Australia

---

## Tech Stack (Target)

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | Next.js API Routes, Supabase Edge Functions |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Hosting | Vercel |
| Payments | Stripe |
| Email | Resend |
| AI | Claude (Anthropic) |

---

*Last Updated: February 2026*
