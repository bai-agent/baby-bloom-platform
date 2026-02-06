# Components

> React component library for Baby Bloom Sydney.

## Overview

_Reusable UI components organized by category._

---

## Component Structure

```
components/
├── ui/                    # Base UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Modal.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Avatar.tsx
│   ├── Skeleton.tsx
│   └── ...
│
├── forms/                 # Form components
│   ├── FormField.tsx
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   ├── NannyProfileForm.tsx
│   ├── BookingForm.tsx
│   └── ...
│
├── layout/                # Layout components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Sidebar.tsx
│   ├── DashboardLayout.tsx
│   └── ...
│
├── nanny/                 # Nanny-specific components
│   ├── NannyCard.tsx
│   ├── NannyProfile.tsx
│   ├── NannyBadges.tsx
│   ├── AvailabilityCalendar.tsx
│   └── ...
│
├── booking/               # Booking components
│   ├── BookingCard.tsx
│   ├── BookingForm.tsx
│   ├── BookingStatus.tsx
│   └── ...
│
├── search/                # Search components
│   ├── SearchBar.tsx
│   ├── SearchFilters.tsx
│   ├── SearchResults.tsx
│   └── ...
│
└── shared/                # Shared/misc components
    ├── Rating.tsx
    ├── ReviewCard.tsx
    ├── MessageBubble.tsx
    └── ...
```

---

## Base UI Components

### Button
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
```

**Usage:**
```tsx
<Button variant="primary" size="md" loading={isSubmitting}>
  Submit
</Button>
```

### Input
```typescript
interface InputProps {
  type: 'text' | 'email' | 'password' | 'tel' | 'number';
  label?: string;
  error?: string;
  placeholder?: string;
  // ... standard input props
}
```

### Card
```typescript
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

### Badge
```typescript
interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}
```

---

## Nanny Components

### NannyCard
_Used in search results_

```typescript
interface NannyCardProps {
  nanny: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    headline: string;
    hourlyRate: number;
    suburb: string;
    rating: number;
    reviewCount: number;
    badges: string[];
  };
  onClick?: () => void;
  onSave?: () => void;
}
```

**Displays:**
- Photo + name
- Headline
- Location + distance
- Hourly rate
- Rating + review count
- Top badges

### NannyProfile
_Full profile display_

```typescript
interface NannyProfileProps {
  nanny: NannyFull;
  isOwner?: boolean;
  onContact?: () => void;
}
```

### NannyBadges
_Badge display component_

```typescript
interface NannyBadgesProps {
  badges: Badge[];
  maxDisplay?: number;
  showLabels?: boolean;
}
```

---

## Form Components

### FormField
_Wrapper for form inputs with label and error_

```typescript
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}
```

### LoginForm
```typescript
interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}
```

### NannyProfileForm
```typescript
interface NannyProfileFormProps {
  initialData?: Partial<NannyProfile>;
  onSubmit: (data: NannyProfile) => Promise<void>;
}
```

---

## Search Components

### SearchBar
```typescript
interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  suggestions?: string[];
}
```

### SearchFilters
```typescript
interface SearchFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
}
```

### SearchResults
```typescript
interface SearchResultsProps {
  results: Nanny[];
  loading: boolean;
  error?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
}
```

---

## Layout Components

### Header
- Logo
- Navigation links
- User menu (logged in) or Login/Signup buttons
- Mobile menu toggle

### Footer
- Links (About, Terms, Privacy, Contact)
- Social links
- Copyright

### DashboardLayout
- Sidebar navigation
- Header with user info
- Main content area
- Mobile-responsive

---

## Component Guidelines

### Naming
- PascalCase for components
- Descriptive names
- Suffix with type if needed (`NannyCard`, `BookingForm`)

### Props
- Use TypeScript interfaces
- Document complex props
- Provide sensible defaults

### Styling
- Use Tailwind CSS
- Component-specific styles in same file
- Avoid inline styles

### Accessibility
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- Focus management

---

## Component Documentation

Each component should have:
1. TypeScript interface for props
2. Usage example
3. Variant showcase (Storybook?)
4. Accessibility notes

---

## Open Questions

- [ ] _Use Storybook for component docs?_
- [ ] _Animation library (Framer Motion)?_
- [ ] _Dark mode support?_

---

**Last Updated:** _YYYY-MM-DD_
**Status:** 🔴 Not Started
