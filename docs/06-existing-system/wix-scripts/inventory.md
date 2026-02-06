# Wix Scripts Inventory

> Catalog of all Wix pages, forms, and Velo code.

## Overview

_Complete inventory of Wix website components._

---

## Website Pages

| Page | URL Path | Purpose | Has Velo Code? |
|------|----------|---------|----------------|
| Home | / | Landing page | |
| About | /about | About us | |
| For Nannies | /nannies | Nanny recruitment | |
| For Parents | /parents | Parent info | |
| Search | /search | Search nannies | |
| Signup - Nanny | /signup/nanny | Nanny registration | |
| Signup - Parent | /signup/parent | Parent registration | |
| Login | /login | User login | |
| Contact | /contact | Contact form | |
| _Add more..._ | | | |

---

## Forms

### Nanny Signup Form
| Field | Type | Required | Maps To |
|-------|------|----------|---------|
| First Name | Text | ✅ | nannies.first_name |
| Last Name | Text | ✅ | nannies.last_name |
| Email | Email | ✅ | nannies.email |
| Phone | Phone | ✅ | nannies.phone |
| Suburb | Dropdown | ✅ | nannies.suburb |
| Experience | Number | ✅ | nannies.experience_years |
| About | Textarea | | nannies.bio |
| _Add more fields..._ | | | |

**Form Action:** Triggers Make.com webhook

### Parent Signup Form
| Field | Type | Required | Maps To |
|-------|------|----------|---------|
| First Name | Text | ✅ | parents.first_name |
| _Add more fields..._ | | | |

### Contact Form
| Field | Type | Required | Maps To |
|-------|------|----------|---------|
| Name | Text | ✅ | |
| Email | Email | ✅ | |
| Message | Textarea | ✅ | |

---

## Velo Code Files

### page-code/home.js
```javascript
// Summary of what this code does
// [Add actual code or description]
```

**Purpose:** _Describe purpose_
**Dependencies:** _Any external services called_
**Data accessed:** _What data does it read/write?_

### page-code/signup-nanny.js
```javascript
// Summary of what this code does
```

**Purpose:** _Describe purpose_
**Dependencies:** _Any external services called_

### backend/http-functions.js
```javascript
// Summary of backend functions
```

**Endpoints exposed:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| /nanny-signup | POST | Handle signup webhook |
| _Add more..._ | | |

---

## Wix Database Collections

_If using Wix database:_

| Collection | Purpose | Record Count |
|------------|---------|--------------|
| Nannies | _If used_ | |
| Members | _If used_ | |

---

## Connected Services

| Service | Purpose | Connection Type |
|---------|---------|-----------------|
| Make.com | Automation triggers | Webhook |
| _Add more..._ | | |

---

## Migration Notes

### Must Replicate
- [ ] _Feature 1_
- [ ] _Feature 2_

### Can Improve Upon
- [ ] _Feature that needs redesign_

### Can Deprecate
- [ ] _Feature no longer needed_

---

## Open Questions

- [ ] _What Velo code exists?_
- [ ] _What forms trigger what automations?_
- [ ] _Are there any hidden features?_

---

**Last Updated:** _YYYY-MM-DD_
**Status:** 🔴 Not Started
