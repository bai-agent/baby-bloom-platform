import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart, Shield, Users, Sparkles, ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-violet-50 to-white">
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
              About Baby Bloom
            </h1>
            <p className="mt-6 text-xl text-slate-600 leading-relaxed">
              We started Baby Bloom because finding a great nanny in Sydney was harder than it needed to be. Too many dodgy listings, not enough real people.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <span className="text-sm font-medium text-violet-600 uppercase tracking-wider">
                Our Story
              </span>
              <h2 className="mt-4 text-3xl md:text-4xl font-bold text-slate-900">
                From frustration to solution
              </h2>
              <div className="mt-6 space-y-4 text-slate-600 leading-relaxed">
                <p>
                  Like many Sydney parents, we spent weeks scrolling through generic listings, wondering if any of these profiles were real. Were their credentials actually verified? Would they actually show up?
                </p>
                <p>
                  We knew there had to be a better way. So we built Baby Bloom - a platform where every nanny is a real person with verified credentials, and every family can find their match without the anxiety.
                </p>
                <p>
                  Today, we&apos;ve helped hundreds of Sydney families connect with amazing nannies. Not because we have fancy algorithms, but because we actually care about getting it right.
                </p>
              </div>
            </div>

            {/* Visual element */}
            <div className="relative">
              <div className="bg-violet-100 rounded-2xl p-8 md:p-12">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bold text-violet-600">200+</div>
                    <div className="mt-2 text-sm text-slate-600">Verified Nannies</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bold text-violet-600">500+</div>
                    <div className="mt-2 text-sm text-slate-600">Happy Families</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bold text-violet-600">4.9</div>
                    <div className="mt-2 text-sm text-slate-600">Average Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bold text-violet-600">48hr</div>
                    <div className="mt-2 text-sm text-slate-600">Avg Match Time</div>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-violet-200 rounded-xl -z-10 rotate-12" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-violet-50 rounded-full -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-slate-50 py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              What we believe in
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              These aren&apos;t just words on a page. They&apos;re the standards we hold ourselves to every day.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "Trust First",
                description:
                  "Every nanny is verified with WWCC, police checks, and real references. No exceptions, no shortcuts.",
              },
              {
                icon: Heart,
                title: "Human Touch",
                description:
                  "We're not just a marketplace. We actually talk to our nannies and families. We know their names.",
              },
              {
                icon: Users,
                title: "Fair for Both",
                description:
                  "Nannies set their own rates. Parents see transparent pricing. No hidden fees for either side.",
              },
              {
                icon: Sparkles,
                title: "Keep Improving",
                description:
                  "We listen to feedback and keep making things better. The platform you see today is version 3.0.",
              },
            ].map((value, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-violet-100 flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="font-semibold text-slate-900 text-lg">{value.title}</h3>
                <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section - Minimal placeholder */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              The people behind Baby Bloom
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              We&apos;re a small team of Sydney locals who care deeply about helping families and nannies connect. We&apos;ve been parents, we&apos;ve hired nannies, and we know how important it is to get this right.
            </p>

            {/* Team avatars placeholder */}
            <div className="mt-10 flex justify-center -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-16 h-16 rounded-full bg-violet-200 border-4 border-white flex items-center justify-center"
                >
                  <span className="text-violet-600 font-medium">
                    {["AB", "CD", "EF", "GH"][i - 1]}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-500">
              The Baby Bloom team
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-violet-600 py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Ready to join the Baby Bloom community?
            </h2>
            <p className="mt-4 text-lg text-violet-100">
              Whether you&apos;re a family looking for help or a nanny looking for work, we&apos;d love to have you.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="bg-white text-violet-600 hover:bg-violet-50 text-base h-12 px-8">
                <Link href="/nannies">
                  Browse Nannies
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white text-white hover:bg-violet-500 text-base h-12 px-8"
              >
                <Link href="/signup?role=nanny">
                  Join as a Nanny
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
