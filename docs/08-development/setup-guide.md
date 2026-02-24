# Setup Guide

> How to set up the development environment for Baby Bloom Sydney.

## Overview

_Step-by-step guide to get the project running locally._

---

## Prerequisites

### Required Software
| Software | Version | Installation |
|----------|---------|--------------|
| Node.js | 20.x LTS | [nodejs.org](https://nodejs.org) |
| pnpm | 8.x | `npm install -g pnpm` |
| Git | Latest | [git-scm.com](https://git-scm.com) |
| VS Code | Latest | [code.visualstudio.com](https://code.visualstudio.com) |
| Supabase CLI | Latest | `npm install -g supabase` |

### Recommended VS Code Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- GitLens
- Error Lens

---

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/[org]/baby-bloom-sydney.git
cd baby-bloom-sydney
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Set Up Environment Variables
```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Stripe (use test keys for development)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Resend (for emails)
RESEND_API_KEY=re_...

# OpenAI (for AI features)
OPENAI_API_KEY=sk-proj-...
```

### 4. Set Up Local Supabase
```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Seed database (optional)
supabase db seed
```

### 5. Run Development Server
```bash
pnpm dev
```

Visit `http://localhost:3000`

---

## Detailed Setup

### Supabase Setup

#### Option A: Local Supabase (Recommended for development)
```bash
# Start Supabase locally
supabase start

# This will output local credentials:
# API URL: http://localhost:54321
# anon key: eyJ...
# service_role key: eyJ...
```

#### Option B: Remote Supabase Project
1. Create project at [supabase.com](https://supabase.com)
2. Copy credentials from Project Settings → API
3. Add to `.env.local`

### Database Migrations
```bash
# Apply all migrations
supabase db push

# Create new migration
supabase migration new my_migration_name

# Reset database (warning: destroys data)
supabase db reset
```

### Stripe Setup (Test Mode)
1. Create Stripe account at [stripe.com](https://stripe.com)
2. Get test keys from Developers → API keys
3. Add to `.env.local`
4. For webhooks locally, use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Project Structure

```
baby-bloom-sydney/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React components
│   ├── lib/              # Utilities, helpers
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript types
├── supabase/
│   ├── migrations/       # Database migrations
│   ├── functions/        # Edge functions
│   └── seed.sql          # Seed data
├── public/               # Static assets
├── tests/                # Test files
├── docs/                 # Documentation
└── scripts/              # Utility scripts
```

---

## Common Tasks

### Running Tests
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Watch mode
pnpm test:watch
```

### Linting & Formatting
```bash
# Lint
pnpm lint

# Fix lint issues
pnpm lint:fix

# Format code
pnpm format
```

### Building for Production
```bash
pnpm build
```

### Type Checking
```bash
pnpm type-check
```

---

## Troubleshooting

### Common Issues

#### "Cannot connect to Supabase"
- Check Supabase is running: `supabase status`
- Verify `.env.local` has correct URLs
- Try restarting: `supabase stop && supabase start`

#### "pnpm install fails"
- Clear cache: `pnpm store prune`
- Delete node_modules: `rm -rf node_modules`
- Reinstall: `pnpm install`

#### "Migrations fail"
- Check migration syntax
- Try reset: `supabase db reset`

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase service role key |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe publishable key |
| `RESEND_API_KEY` | 🔶 | For email sending |
| `OPENAI_API_KEY` | 🔶 | For AI features |
| `TWILIO_ACCOUNT_SID` | 🔶 | For SMS |
| `TWILIO_AUTH_TOKEN` | 🔶 | For SMS |

---

**Last Updated:** _YYYY-MM-DD_
**Status:** 🔴 Not Started
