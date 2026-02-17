import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui";
import {
  Baby,
  Heart,
  Sparkles,
  TrendingUp,
  Moon,
  Milk,
  Star,
  Camera,
  Shield,
  Clock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-bb-purple-50 via-white to-bb-pink-50 py-20 sm:py-32">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-bb-purple-100/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-bb-pink-100/40 blur-3xl" />

        <Container className="relative flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-bb-purple-500 to-bb-pink-500 shadow-lg">
            <Baby className="h-10 w-10 text-white" />
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Track Every{" "}
            <span className="bb-gradient-text">Precious Moment</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[var(--bb-text-muted)]">
            A beautiful platform to monitor and celebrate your baby&apos;s
            growth milestones, feeding schedules, sleep patterns, and daily
            moments of joy.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/demos">
              <Button variant="gradient" size="lg">
                <Sparkles className="h-5 w-5" />
                View Component Demos
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              <Heart className="h-5 w-5" />
              Learn More
            </Button>
          </div>
        </Container>
      </section>

      {/* Stats bar */}
      <section className="border-y border-bb-purple-100 bg-white py-8">
        <Container>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { value: "50+", label: "Milestones Tracked" },
              { value: "24/7", label: "Activity Logging" },
              { value: "100%", label: "Private & Secure" },
              { value: "Free", label: "To Get Started" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold bb-gradient-text sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-[var(--bb-text-muted)]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-20">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-bb-purple-900 sm:text-4xl">
              Everything You Need
            </h2>
            <p className="mt-3 text-[var(--bb-text-muted)]">
              Track, celebrate, and share your baby&apos;s journey with
              purpose-built tools.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: TrendingUp,
                title: "Growth Tracking",
                desc: "Monitor height, weight, and head circumference with beautiful charts and percentile comparisons.",
              },
              {
                icon: Milk,
                title: "Feeding Logs",
                desc: "Track breastfeeding, bottle, and solid food sessions with timing and volume details.",
              },
              {
                icon: Moon,
                title: "Sleep Patterns",
                desc: "Log naps and nighttime sleep to discover patterns and optimize your baby's routine.",
              },
              {
                icon: Star,
                title: "Milestone Moments",
                desc: "Capture every first — first smile, first word, first step — with photos and notes.",
              },
              {
                icon: Camera,
                title: "Photo Timeline",
                desc: "Build a visual timeline of your baby's growth with dated photos and memories.",
              },
              {
                icon: Shield,
                title: "Health Records",
                desc: "Keep vaccination schedules, doctor visits, and health notes organized in one place.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-bb-purple-100 bg-white p-6 transition-all duration-200 hover:border-bb-purple-200 hover:shadow-[var(--bb-shadow-md)]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-bb-purple-100 to-bb-pink-100 transition-colors group-hover:from-bb-purple-200 group-hover:to-bb-pink-200">
                  <feature.icon className="h-6 w-6 text-bb-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-bb-purple-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--bb-text-muted)]">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="bg-gradient-to-br from-bb-purple-50 to-bb-pink-50 py-20">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-bb-purple-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-3 text-[var(--bb-text-muted)]">
              Get started in three simple steps.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                icon: Baby,
                title: "Create a Profile",
                desc: "Add your baby's name, birthdate, and a photo to get started.",
              },
              {
                step: "2",
                icon: Clock,
                title: "Log Daily Activities",
                desc: "Track feedings, naps, diapers, and milestones with just a few taps.",
              },
              {
                step: "3",
                icon: TrendingUp,
                title: "Watch Them Grow",
                desc: "See patterns, celebrate milestones, and share the journey with family.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[var(--bb-shadow-md)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-bb-purple-500 to-bb-pink-500">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-bb-purple-100 text-xs font-bold text-bb-purple-700">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-bb-purple-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--bb-text-muted)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-bb-purple-900 sm:text-4xl">
              Loved by Parents
            </h2>
            <p className="mt-3 text-[var(--bb-text-muted)]">
              See what other parents are saying about Baby Bloom.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                quote:
                  "Baby Bloom made it so easy to track Emma's milestones. I love looking back at her growth timeline!",
                name: "Sarah M.",
                role: "Mom of 1",
              },
              {
                quote:
                  "The sleep tracking feature helped us find a routine that actually works. Our nights are so much better now.",
                name: "James & Lin K.",
                role: "Parents of twins",
              },
              {
                quote:
                  "I share the feeding logs with our pediatrician and she's always impressed by how organized we are!",
                name: "Priya R.",
                role: "Mom of 2",
              },
            ].map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-xl border border-bb-purple-100 bg-white p-6"
              >
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-bb-purple-400 text-bb-purple-400"
                    />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-[var(--bb-text)]">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-bb-purple-200 to-bb-pink-200">
                    <Heart className="h-4 w-4 text-bb-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-bb-purple-900">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-[var(--bb-text-muted)]">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-20">
        <Container>
          <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-bb-purple-600 to-bb-pink-500 p-10 text-center sm:p-16">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Baby className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Start Tracking Today
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-white/80">
              Every moment matters. Begin capturing your baby&apos;s journey
              with Baby Bloom — completely free to start.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bg-white text-bb-purple-700 hover:bg-white/90"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Link href="/demos">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-white hover:bg-white/10"
                >
                  View Components
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="border-t border-bb-purple-100 bg-[var(--bb-bg-soft)] py-12">
        <Container>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-bb-purple-500 to-bb-pink-500">
                <Baby className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold bb-gradient-text">
                Baby Bloom
              </span>
            </div>
            <nav className="flex items-center gap-6">
              <Link
                href="/demos"
                className="text-sm text-[var(--bb-text-muted)] transition-colors hover:text-bb-purple-600"
              >
                Components
              </Link>
              <span className="text-sm text-[var(--bb-text-muted)]">
                Privacy
              </span>
              <span className="text-sm text-[var(--bb-text-muted)]">
                Terms
              </span>
            </nav>
          </div>
          <div className="mt-8 text-center">
            <p className="text-xs text-[var(--bb-text-muted)]">
              Built with love for growing families. &copy; 2025 Baby Bloom.
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
