import { Container } from "@/components/layout/Container";
import { DemoSection } from "@/components/demo/DemoSection";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Input,
} from "@/components/ui";
import {
  Baby,
  Heart,
  Sparkles,
  Star,
  Bell,
  Check,
  Moon,
  Sun,
  TrendingUp,
  Camera,
  Calendar,
  Ruler,
  Weight,
  Milk,
  Clock,
} from "lucide-react";

export const metadata = {
  title: "Component Demos — Baby Bloom",
};

export default function DemosPage() {
  return (
    <div className="bg-[var(--bb-bg-soft)] py-12">
      <Container className="space-y-12">
        {/* Page header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-bb-purple-500 to-bb-pink-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-bb-purple-900">
              Component Demos
            </h1>
          </div>
          <p className="mt-2 text-[var(--bb-text-muted)]">
            Baby Bloom design system preview — purple/pink palette, mobile-first,
            all variants and composed patterns shown.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="gradient">v0.1.0</Badge>
            <Badge variant="default">4 Components</Badge>
            <Badge variant="secondary">Tailwind v4</Badge>
            <Badge variant="outline">React 19</Badge>
          </div>
        </div>

        {/* ─── Color Palette ─── */}
        <DemoSection
          title="Color Palette"
          description="Purple primary and pink accent scales with semantic tokens"
        >
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--bb-text-muted)]">
                Purple (Primary)
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { shade: "50", cls: "bg-bb-purple-50" },
                  { shade: "100", cls: "bg-bb-purple-100" },
                  { shade: "200", cls: "bg-bb-purple-200" },
                  { shade: "300", cls: "bg-bb-purple-300" },
                  { shade: "400", cls: "bg-bb-purple-400" },
                  { shade: "500", cls: "bg-bb-purple-500" },
                  { shade: "600", cls: "bg-bb-purple-600" },
                  { shade: "700", cls: "bg-bb-purple-700" },
                  { shade: "800", cls: "bg-bb-purple-800" },
                  { shade: "900", cls: "bg-bb-purple-900" },
                ].map(({ shade, cls }) => (
                  <div key={shade} className="text-center">
                    <div
                      className={`h-12 w-12 rounded-lg ${cls} ring-1 ring-black/5`}
                    />
                    <span className="mt-1 block text-[10px] text-[var(--bb-text-muted)]">
                      {shade}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--bb-text-muted)]">
                Pink (Accent)
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { shade: "50", cls: "bg-bb-pink-50" },
                  { shade: "100", cls: "bg-bb-pink-100" },
                  { shade: "200", cls: "bg-bb-pink-200" },
                  { shade: "300", cls: "bg-bb-pink-300" },
                  { shade: "400", cls: "bg-bb-pink-400" },
                  { shade: "500", cls: "bg-bb-pink-500" },
                  { shade: "600", cls: "bg-bb-pink-600" },
                  { shade: "700", cls: "bg-bb-pink-700" },
                ].map(({ shade, cls }) => (
                  <div key={shade} className="text-center">
                    <div
                      className={`h-12 w-12 rounded-lg ${cls} ring-1 ring-black/5`}
                    />
                    <span className="mt-1 block text-[10px] text-[var(--bb-text-muted)]">
                      {shade}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--bb-text-muted)]">
                Gradient
              </p>
              <div className="h-12 w-full rounded-lg bg-gradient-to-r from-bb-purple-500 to-bb-pink-500" />
            </div>
          </div>
        </DemoSection>

        {/* ─── Design Tokens ─── */}
        <DemoSection
          title="Design Tokens"
          description="Shadows, radii, and spacing from the design system"
        >
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--bb-text-muted)]">
                Shadows
              </p>
              <div className="flex flex-wrap gap-6">
                {[
                  { label: "sm", shadow: "var(--bb-shadow-sm)" },
                  { label: "default", shadow: "var(--bb-shadow)" },
                  { label: "md", shadow: "var(--bb-shadow-md)" },
                  { label: "lg", shadow: "var(--bb-shadow-lg)" },
                ].map(({ label, shadow }) => (
                  <div key={label} className="text-center">
                    <div
                      className="h-16 w-16 rounded-xl border border-bb-purple-100 bg-white"
                      style={{ boxShadow: shadow }}
                    />
                    <span className="mt-2 block text-[10px] text-[var(--bb-text-muted)]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--bb-text-muted)]">
                Border Radius
              </p>
              <div className="flex flex-wrap items-end gap-6">
                {[
                  { label: "sm (6px)", radius: "var(--bb-radius-sm)" },
                  { label: "default (8px)", radius: "var(--bb-radius)" },
                  { label: "lg (12px)", radius: "var(--bb-radius-lg)" },
                  { label: "xl (16px)", radius: "var(--bb-radius-xl)" },
                  { label: "full", radius: "var(--bb-radius-full)" },
                ].map(({ label, radius }) => (
                  <div key={label} className="text-center">
                    <div
                      className="h-14 w-14 bg-gradient-to-br from-bb-purple-200 to-bb-pink-200"
                      style={{ borderRadius: radius }}
                    />
                    <span className="mt-2 block text-[10px] text-[var(--bb-text-muted)]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DemoSection>

        {/* ─── Buttons ─── */}
        <DemoSection
          title="Buttons"
          description="All variants, sizes, icon combinations, and states"
        >
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--bb-text-muted)]">
                Variants
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="gradient">Gradient</Button>
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--bb-text-muted)]">
                Sizes
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--bb-text-muted)]">
                With Icons
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">
                  <Baby className="h-4 w-4" /> Add Baby
                </Button>
                <Button variant="gradient">
                  <Heart className="h-4 w-4" /> Track Milestone
                </Button>
                <Button variant="secondary">
                  <Bell className="h-4 w-4" /> Reminders
                </Button>
                <Button variant="outline">
                  <Camera className="h-4 w-4" /> Add Photo
                </Button>
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--bb-text-muted)]">
                Disabled States
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" disabled>
                  Primary
                </Button>
                <Button variant="gradient" disabled>
                  Gradient
                </Button>
                <Button variant="outline" disabled>
                  Outline
                </Button>
              </div>
            </div>
          </div>
        </DemoSection>

        {/* ─── Badges ─── */}
        <DemoSection
          title="Badges"
          description="Status indicators, labels, and tags"
        >
          <div className="space-y-4">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--bb-text-muted)]">
                All Variants
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Pink</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="success">
                  <Check className="mr-1 h-3 w-3" /> Complete
                </Badge>
                <Badge variant="warning">Pending</Badge>
                <Badge variant="gradient">New Feature</Badge>
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--bb-text-muted)]">
                In Context
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default">
                  <Moon className="mr-1 h-3 w-3" /> Sleep
                </Badge>
                <Badge variant="secondary">
                  <Milk className="mr-1 h-3 w-3" /> Feeding
                </Badge>
                <Badge variant="success">
                  <TrendingUp className="mr-1 h-3 w-3" /> Growing
                </Badge>
                <Badge variant="gradient">
                  <Star className="mr-1 h-3 w-3" /> Milestone
                </Badge>
              </div>
            </div>
          </div>
        </DemoSection>

        {/* ─── Input ─── */}
        <DemoSection
          title="Input Fields"
          description="Text inputs with labels, placeholders, and validation states"
        >
          <div className="grid max-w-lg gap-4 sm:grid-cols-2">
            <Input label="Baby Name" placeholder="e.g. Bailey" />
            <Input label="Weight (lbs)" placeholder="0.0" type="number" />
            <Input
              label="Birth Date"
              placeholder="MM/DD/YYYY"
              error="Please enter a valid date"
            />
            <Input label="Notes" placeholder="Optional notes..." disabled />
          </div>
        </DemoSection>

        {/* ─── Cards ─── */}
        <DemoSection
          title="Cards"
          description="Content containers in all variants"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Card variant="default">
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>
                  Standard container with subtle border
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--bb-text-muted)]">
                  Track daily feeding schedules and patterns over time.
                </p>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardHeader>
                <CardTitle>Outlined Card</CardTitle>
                <CardDescription>Stronger border emphasis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Badge>Sleep</Badge>
                  <Badge variant="secondary">Feed</Badge>
                  <Badge variant="success">
                    <Check className="mr-1 h-3 w-3" /> Logged
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Elevated Card</CardTitle>
                <CardDescription>
                  Shadow for depth and prominence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-bb-purple-400 to-bb-pink-400">
                    <Star className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-bb-purple-900">
                      First Smile!
                    </p>
                    <p className="text-xs text-[var(--bb-text-muted)]">
                      Milestone reached
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="gradient">
              <CardHeader>
                <CardTitle>Gradient Card</CardTitle>
                <CardDescription>
                  Purple-to-pink background blend
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-bb-purple-600" />
                  <span className="text-sm font-medium text-bb-purple-800">
                    Special celebration moments
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </DemoSection>

        {/* ─── Typography ─── */}
        <DemoSection
          title="Typography"
          description="Heading hierarchy, body text, and gradient text"
        >
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-bb-purple-900">
              Heading 1 — Bold
            </h1>
            <h2 className="text-3xl font-semibold text-bb-purple-900">
              Heading 2 — Semibold
            </h2>
            <h3 className="text-2xl font-semibold text-bb-purple-800">
              Heading 3
            </h3>
            <h4 className="text-xl font-medium text-bb-purple-800">
              Heading 4
            </h4>
            <p className="text-base text-[var(--bb-text)]">
              Body text — the quick brown fox jumps over the lazy dog. Tracking
              your baby&apos;s growth has never been more beautiful.
            </p>
            <p className="text-sm text-[var(--bb-text-muted)]">
              Muted text — secondary information and descriptions.
            </p>
            <p className="bb-gradient-text text-2xl font-bold">
              Gradient Text — Baby Bloom
            </p>
          </div>
        </DemoSection>

        {/* ─── Composed: Milestone Card ─── */}
        <DemoSection
          title="Composed — Milestone Card"
          description="Components working together in a real-world pattern"
        >
          <Card variant="gradient" className="max-w-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="gradient">New Milestone!</Badge>
                <span className="text-xs text-[var(--bb-text-muted)]">
                  Today
                </span>
              </div>
              <CardTitle className="mt-3">First Steps</CardTitle>
              <CardDescription>
                Bailey took their first independent steps across the living room!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-white/60 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-bb-purple-400 to-bb-pink-400">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-bb-purple-900">
                    Walking — 10 months
                  </p>
                  <p className="text-xs text-[var(--bb-text-muted)]">
                    Earlier than average!
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" className="flex-1">
                  <Heart className="h-3.5 w-3.5" /> Celebrate
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Add Photo
                </Button>
              </div>
            </CardContent>
          </Card>
        </DemoSection>

        {/* ─── Composed: Baby Profile ─── */}
        <DemoSection
          title="Composed — Baby Profile Card"
          description="A profile overview combining multiple components"
        >
          <Card variant="elevated" className="max-w-md">
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-bb-purple-400 to-bb-pink-400 shadow-md">
                  <Baby className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-bb-purple-900">
                    Bailey Rose
                  </h3>
                  <p className="text-sm text-[var(--bb-text-muted)]">
                    Born March 15, 2025 — 10 months old
                  </p>
                  <div className="mt-1 flex gap-1.5">
                    <Badge variant="gradient" className="text-[10px]">
                      <Star className="mr-0.5 h-2.5 w-2.5" /> 12 Milestones
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Ruler, label: "Height", value: "28 in" },
                  { icon: Weight, label: "Weight", value: "19.5 lbs" },
                  { icon: Calendar, label: "Next Visit", value: "Mar 20" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg bg-[var(--bb-bg-soft)] p-3 text-center"
                  >
                    <stat.icon className="mx-auto h-4 w-4 text-bb-purple-400" />
                    <p className="mt-1 text-sm font-semibold text-bb-purple-900">
                      {stat.value}
                    </p>
                    <p className="text-[10px] text-[var(--bb-text-muted)]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" className="flex-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Growth Chart
                </Button>
                <Button variant="secondary" size="sm" className="flex-1">
                  <Camera className="h-3.5 w-3.5" /> Photos
                </Button>
              </div>
            </CardContent>
          </Card>
        </DemoSection>

        {/* ─── Composed: Daily Log ─── */}
        <DemoSection
          title="Composed — Daily Log"
          description="A daily summary combining cards, badges, and layout"
        >
          <div className="max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-bb-purple-900">
                Today&apos;s Activity
              </h3>
              <Badge variant="outline">
                <Calendar className="mr-1 h-3 w-3" /> Jan 15
              </Badge>
            </div>
            {[
              {
                icon: Sun,
                time: "7:30 AM",
                label: "Wake Up",
                detail: "Slept 10.5 hours",
                badge: "success" as const,
                badgeText: "Great",
              },
              {
                icon: Milk,
                time: "8:00 AM",
                label: "Morning Feed",
                detail: "6 oz formula",
                badge: "default" as const,
                badgeText: "Fed",
              },
              {
                icon: Moon,
                time: "10:00 AM",
                label: "Morning Nap",
                detail: "45 minutes",
                badge: "secondary" as const,
                badgeText: "Sleep",
              },
              {
                icon: Star,
                time: "11:30 AM",
                label: "Milestone!",
                detail: "Said 'mama' clearly",
                badge: "gradient" as const,
                badgeText: "New!",
              },
            ].map((entry) => (
              <Card key={entry.time} variant="default" className="!p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bb-bg-muted)]">
                    <entry.icon className="h-4 w-4 text-bb-purple-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-bb-purple-900">
                        {entry.label}
                      </p>
                      <Badge variant={entry.badge} className="text-[10px]">
                        {entry.badgeText}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--bb-text-muted)]">
                      <Clock className="h-3 w-3" />
                      <span>{entry.time}</span>
                      <span>·</span>
                      <span>{entry.detail}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DemoSection>

        {/* ─── Composed: Stats Dashboard ─── */}
        <DemoSection
          title="Composed — Stats Overview"
          description="Dashboard-style widgets using cards and layout"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Moon,
                label: "Avg Sleep",
                value: "10.5h",
                change: "+0.5h",
                positive: true,
              },
              {
                icon: Milk,
                label: "Daily Feeds",
                value: "6",
                change: "On track",
                positive: true,
              },
              {
                icon: TrendingUp,
                label: "Weight Gain",
                value: "1.2 lbs",
                change: "This month",
                positive: true,
              },
              {
                icon: Star,
                label: "Milestones",
                value: "12",
                change: "3 this week",
                positive: true,
              },
            ].map((stat) => (
              <Card key={stat.label} variant="default" className="!p-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-bb-purple-100 to-bb-pink-100">
                    <stat.icon className="h-4 w-4 text-bb-purple-600" />
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    {stat.change}
                  </Badge>
                </div>
                <p className="mt-3 text-2xl font-bold text-bb-purple-900">
                  {stat.value}
                </p>
                <p className="text-xs text-[var(--bb-text-muted)]">
                  {stat.label}
                </p>
              </Card>
            ))}
          </div>
        </DemoSection>
      </Container>
    </div>
  );
}
