# Existing System Overview

> Documentation of the current Baby Bloom Sydney prototype system.

## Overview

_The current system is a working prototype built across multiple platforms. This document catalogs all components for migration planning._

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT SYSTEM                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│   │    Wix      │────▶│ Make.com    │────▶│Google Sheets│       │
│   │  Website    │     │ Automation  │     │  Database   │       │
│   └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                   │                   │                │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│   │ Wix Velo    │     │   GitHub    │     │  Google     │       │
│   │  Scripts    │     │   Scripts   │     │Apps Script  │       │
│   └─────────────┘     └─────────────┘     └─────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Platform Components

### 1. Wix Website
| Item | Description |
|------|-------------|
| URL | _[Current website URL]_ |
| Purpose | Public-facing website, forms, user registration |
| Pages | _List in wix-scripts/inventory.md_ |
| Forms | _Signup forms, contact forms_ |
| Velo Code | _Custom JavaScript/Velo scripts_ |

### 2. Google Sheets (Database)
| Item | Description |
|------|-------------|
| Location | _Google Drive location_ |
| Purpose | Data storage for nannies, parents, bookings |
| Sheets | _List in gas-scripts/inventory.md_ |
| Formulas | _Any complex formulas/calculations_ |

### 3. Make.com (Zapier Alternative)
| Item | Description |
|------|-------------|
| Account | _Account details_ |
| Purpose | Workflow automation, integrations |
| Scenarios | _List in make-blueprints/inventory.md_ |
| Connections | _Connected services_ |

### 4. Google Apps Script
| Item | Description |
|------|-------------|
| Location | _Bound to sheets or standalone_ |
| Purpose | Custom automation, data processing |
| Scripts | _List in gas-scripts/inventory.md_ |

### 5. GitHub Scripts
| Item | Description |
|------|-------------|
| Repository | _Repo URL_ |
| Purpose | _Additional scripts, utilities_ |
| Contents | _List in github-scripts/inventory.md_ |

---

## Data Flow

### Current User Registration Flow
```
1. User visits Wix website
        ↓
2. Fills out signup form
        ↓
3. Form triggers Make.com scenario
        ↓
4. Make.com adds data to Google Sheet
        ↓
5. Make.com sends confirmation email
        ↓
6. Google Apps Script processes data
```

### Current Booking Flow
```
[Document current booking process]
```

---

## Known Issues & Limitations

### Technical Limitations
| Issue | Impact | Priority |
|-------|--------|----------|
| Google Sheets row limits | Can't scale beyond X rows | High |
| Make.com scenario limits | Limited automation runs | Medium |
| Wix performance | Slow page loads | Medium |
| No real-time updates | Manual refresh needed | Medium |

### Operational Issues
| Issue | Impact |
|-------|--------|
| _Issue 1_ | _Impact_ |
| _Issue 2_ | _Impact_ |

---

## Migration Priority

### Critical Path (Must migrate Day 1)
- [ ] User data (nannies, parents)
- [ ] Active bookings
- [ ] Core authentication

### Important (Week 1)
- [ ] All Make.com automations
- [ ] Notification systems
- [ ] Search functionality

### Can Wait (Later)
- [ ] Historical data
- [ ] Analytics
- [ ] Secondary automations

---

## Access Credentials

### Inventory (DO NOT store actual credentials here)
| Service | Who Has Access | Location of Credentials |
|---------|----------------|------------------------|
| Wix Admin | _Name_ | _Password manager_ |
| Google Sheets | _Name_ | _Google account_ |
| Make.com | _Name_ | _Password manager_ |
| GitHub | _Name_ | _Password manager_ |

---

## Questions to Answer

- [ ] What data currently exists in each platform?
- [ ] What automations are running?
- [ ] What manual processes fill gaps?
- [ ] What integrations connect systems?
- [ ] What are the undocumented features?

---

**Last Updated:** _YYYY-MM-DD_
**Status:** 🔴 Not Started
