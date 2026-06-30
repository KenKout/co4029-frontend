import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { SectionHeader } from "@/components/ui/section-header";
import { BridgeLine } from "@/components/ui/bridge-line";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { TrendingCarousel } from "@/components/ui/trending-carousel";
import { AnimatedBentoRow } from "@/components/ui/animated-bento";
import { useReveal } from "@/hooks/use-reveal";
import TopNavBar from "@/components/layout/TopNavBar";
import Footer from "@/components/layout/Footer";
import {
  Sparkles,
  ArrowRight,
  Quote,
  GraduationCap,
  Terminal,
  Palette,
  BarChart3,
  FlaskConical,
} from "lucide-react";

const stats = [
  { value: "500k+", label: "Active Learners" },
  { value: "12k+", label: "AI-Enhanced Courses" },
  { value: "94%", label: "Completion Rate" },
  { value: "1.2M", label: "Skill Assessments" },
];

const featuredCourses = [
  {
    title: "Full-Stack Engineering with AI Pair Programming",
    instructor: "Dr. Sarah Chen",
    tag: "Software Engineering",
    tagColor: "bg-m3-primary-fixed text-m3-primary",
    rating: "4.9",
    students: "12.4k",
    thumbFrom: "from-[#1e3a8a]",
    thumbTo: "to-[#1e40af]",
    overlayFrom: "from-[#1e3a8a]/80",
    overlayTo: "to-[#1e40af]/60",
  },
  {
    title: "Data Science & ML: From Foundations to Deployment",
    instructor: "Prof. Marcus Liu",
    tag: "Data Science",
    tagColor: "bg-m3-secondary-fixed text-m3-secondary",
    rating: "4.8",
    students: "9.1k",
    thumbFrom: "from-[#1d4ed8]",
    thumbTo: "to-[#3b82f6]",
    overlayFrom: "from-[#1d4ed8]/80",
    overlayTo: "to-[#3b82f6]/60",
  },
  {
    title: "Creative Direction in the Age of Generative AI",
    instructor: "Amara Osei",
    tag: "Creative Arts",
    tagColor: "bg-[#e0f2f1] text-[#004a57]",
    rating: "4.7",
    students: "6.8k",
    thumbFrom: "from-[#004a57]",
    thumbTo: "to-[#00796b]",
    overlayFrom: "from-[#004a57]/80",
    overlayTo: "to-[#00796b]/60",
  },
];

export default function LandingPage() {
  const revealRef = useReveal<HTMLElement>();

  return (
    <>
      <TopNavBar />

      <main ref={revealRef} className="pt-16">
        {/* 1. HERO */}
        <section className="relative overflow-hidden gradient-hero min-h-[92vh] flex items-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl animate-pulse-slow" />
            <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full bg-[#1d4ed8]/20 blur-3xl animate-pulse-slow" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#1e40af]/10 blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              {/* Left copy */}
              <div className="space-y-8 reveal reveal-left">
                <AIInsightChip>Next-Gen Learning Platform</AIInsightChip>

                <div className="space-y-5">
                  <h1 className="font-headline font-extrabold text-4xl sm:text-5xl xl:text-6xl leading-[1.08] tracking-tight text-white">
                    The Bridge to
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#bfdbfe] to-[#dbeafe]">
                      Human Mastery
                    </span>
                  </h1>
                  <p className="text-lg text-white/70 max-w-md leading-relaxed font-body">
                    Unlock your potential with AI-powered courses crafted by world-class instructors.
                    Personalised learning paths that adapt to you — at every step of the journey.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link to="/courses">
                    <Button
                      size="lg"
                      className="gradient-secondary text-white border-0 gap-2 px-7 h-12 font-semibold shadow-lg transition-opacity hover-entity"
                    >
                      Start Your Path
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/courses">
                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-12 px-7 font-semibold hover-entity"
                    >
                      View Courses
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <div className="flex -space-x-2">
                    {[
                      { bg: "#1e3a8a", label: "A" },
                      { bg: "#1d4ed8", label: "M" },
                      { bg: "#1e40af", label: "S" },
                      { bg: "#3b82f6", label: "J" },
                    ].map(({ bg, label }, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-white text-xs font-semibold shrink-0"
                        style={{ background: bg }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-white/60 font-body">
                    Joined by <span className="text-white font-semibold">500,000+</span> learners worldwide
                  </p>
                </div>
              </div>

              {/* Right visual */}
              <div className="relative flex items-center justify-center reveal reveal-right" style={{ '--reveal-delay': '0.2s' } as React.CSSProperties}>
                <div className="relative w-full max-w-md aspect-[4/3] rounded-xl overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#172554] via-[#1e40af] to-[#3b82f6]" />
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                      backgroundSize: "32px 32px",
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                    <div className="w-20 h-20 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                      <GraduationCap className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-headline font-bold text-xl">AI Curriculum</p>
                      <p className="text-white/60 text-sm mt-1">Personalised to your goals</p>
                    </div>
                    <div className="w-full space-y-2">
                      {[80, 65, 90].map((w, i) => (
                        <div key={i} className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#bfdbfe] to-[#3b82f6] rounded-full"
                            style={{ width: `${w}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1860]/60 via-transparent to-transparent" />
                </div>

                {/* Floating AI insight card */}
                <div className="absolute -bottom-6 -left-4 sm:-left-10 z-10 animate-float hover-entity">
                  <GlassCard className="p-4 w-56 shadow-glass">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl gradient-secondary flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-m3-on-surface">AI Insight</p>
                        <p className="text-xs text-m3-on-surface-variant mt-0.5 leading-snug">
                          Next skill gap:{" "}
                          <span className="text-m3-secondary font-semibold">TypeScript Generics</span>
                        </p>
                        <div className="mt-2 h-1 bg-m3-surface-container rounded-full overflow-hidden">
                          <div className="h-full w-2/3 gradient-secondary rounded-full animate-pulse-slow" />
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* Top-right stat badge */}
                <div className="absolute -top-4 -right-2 sm:right-0 animate-float" style={{ animationDelay: '3s' }}>
                  <div className="glass ghost-border shadow-glass rounded-xl px-4 py-3 text-center">
                    <p className="text-2xl font-headline font-extrabold text-m3-primary">94%</p>
                    <p className="text-xs text-m3-on-surface-variant mt-0.5">Completion Rate</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. STATS */}
        <section className="bg-m3-surface-container-lowest border-y border-m3-outline-variant/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
              {stats.map((stat, i) => (
                <div key={i} className="text-center space-y-1.5 reveal reveal-up" style={{ '--reveal-delay': `${i * 0.1}s` } as React.CSSProperties}>
                  <AnimatedCounter
                    value={stat.value}
                    className="font-headline font-extrabold text-3xl sm:text-4xl text-gradient-primary inline-block"
                  />
                  <p className="text-sm text-m3-on-surface-variant font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. BENTO CATEGORIES */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="mb-10 space-y-3 reveal reveal-up">
            <AIInsightChip>Explore by Domain</AIInsightChip>
            <SectionHeader
              title="Core Knowledge Hubs"
              subtitle="Dive into structured, AI-curated learning tracks across the most in-demand disciplines."
            />
          </div>

          <div className="flex flex-col gap-4">
            <AnimatedBentoRow defaultFlex={[2, 1]}>
              {/* Software Engineering */}
              <div className="relative rounded-xl overflow-hidden group cursor-pointer shadow-editorial reveal reveal-scale w-full h-full" style={{ '--reveal-delay': '0s' } as React.CSSProperties}>
                <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#1d4ed8]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute top-7 right-7 space-y-2 opacity-25 group-hover:opacity-40 transition-opacity">
                  {[32, 20, 28, 16, 24].map((w, i) => (
                    <div key={i} className="h-2 bg-white/60 rounded-full" style={{ width: `${w * 4}px`, marginLeft: i % 2 === 0 ? 0 : "1rem" }} />
                  ))}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-7">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                          <Terminal className="w-4 h-4 text-white" />
                        </div>
                        <Badge className="bg-white/15 text-white border-0 text-xs">2,400+ Courses</Badge>
                      </div>
                      <h3 className="font-headline font-bold text-2xl text-white">Software Engineering</h3>
                      <p className="text-white/60 text-sm mt-1 max-w-xs">From algorithms to system design — master the full engineering stack.</p>
                    </div>
                    <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Creative Arts */}
              <div className="relative rounded-xl overflow-hidden group cursor-pointer shadow-editorial reveal reveal-scale w-full h-full" style={{ '--reveal-delay': '0.1s' } as React.CSSProperties}>
                <div className="absolute inset-0 bg-gradient-to-br from-[#004a57] to-[#00796b]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                      <Palette className="w-4 h-4 text-white" />
                    </div>
                    <Badge className="bg-white/15 text-white border-0 text-xs">820+ Courses</Badge>
                  </div>
                  <h3 className="font-headline font-bold text-xl text-white">Creative Arts</h3>
                  <p className="text-white/60 text-sm mt-1">Design, animation &amp; generative art.</p>
                </div>
              </div>
            </AnimatedBentoRow>

            <AnimatedBentoRow defaultFlex={[1, 2]}>
              {/* Digital Business */}
              <div className="relative rounded-xl overflow-hidden group cursor-pointer shadow-editorial bg-m3-primary-fixed reveal reveal-scale w-full h-full" style={{ '--reveal-delay': '0.2s' } as React.CSSProperties}>
                <div className="absolute inset-0 bg-gradient-to-br from-m3-primary-fixed via-m3-secondary-fixed/40 to-m3-primary-fixed" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <Badge className="bg-m3-primary/10 text-m3-primary border-0 text-xs">1,100+ Courses</Badge>
                  </div>
                  <h3 className="font-headline font-bold text-xl text-m3-on-surface">Digital Business</h3>
                  <p className="text-m3-on-surface-variant text-sm mt-1">Marketing, growth &amp; entrepreneurship.</p>
                </div>
              </div>

              {/* Data Science */}
              <div className="relative rounded-xl overflow-hidden group cursor-pointer shadow-editorial reveal reveal-scale w-full h-full" style={{ '--reveal-delay': '0.3s' } as React.CSSProperties}>
                <div className="absolute inset-0 gradient-secondary" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                          <FlaskConical className="w-4 h-4 text-white" />
                        </div>
                        <Badge className="bg-white/15 text-white border-0 text-xs">3,200+ Courses</Badge>
                      </div>
                      <h3 className="font-headline font-bold text-xl text-white">Data Science</h3>
                      <p className="text-white/60 text-sm mt-1">ML, analytics, AI &amp; data engineering.</p>
                    </div>
                    <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedBentoRow>
          </div>

          <div className="mt-8 flex justify-center">
            <Link to="/courses">
              <Button variant="outline" className="ghost-border gap-2 font-medium px-6 hover-entity">
                Browse All Categories
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* 4. FEATURED COURSES */}
        <section className="bg-m3-surface-container-low py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-2 reveal reveal-up">
              <AIInsightChip className="mb-4">AI-Curated Picks</AIInsightChip>
            </div>
            <div className="flex items-center gap-4 mb-10 reveal reveal-up" style={{ '--reveal-delay': '0.1s' } as React.CSSProperties}>
              <h2 className="font-headline font-bold text-2xl lg:text-3xl text-m3-on-surface whitespace-nowrap">
                Trending Now
              </h2>
              <BridgeLine className="flex-1" />
              <Link to="/courses">
                <Button variant="ghost" size="sm" className="gap-1.5 text-m3-secondary shrink-0 font-medium">
                  See All <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            <div className="reveal reveal-up" style={{ '--reveal-delay': '0.2s' } as React.CSSProperties}>
              <TrendingCarousel courses={featuredCourses} />
            </div>
          </div>
        </section>

        {/* 5. TESTIMONIAL */}
        <section className="bg-[#1e1b4b] py-24 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-[#1d4ed8]/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[#1e3a8a]/20 blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8 reveal reveal-left">
                <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
                  <Quote className="w-6 h-6 text-white" />
                </div>
                <blockquote>
                  <p className="font-headline font-bold text-2xl sm:text-3xl lg:text-4xl text-white leading-tight">
                    &ldquo;aBridgeAI didn&apos;t just teach me to code — it taught me{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#bfdbfe] to-[#dbeafe]">
                      how to think like an engineer.
                    </span>{" "}
                    The AI insights were game-changing.&rdquo;
                  </p>
                </blockquote>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full gradient-secondary flex items-center justify-center shrink-0 ring-2 ring-[#1d4ed8]/40">
                    <span className="font-headline font-bold text-white text-lg">JR</span>
                  </div>
                  <div>
                    <p className="font-headline font-semibold text-white">James Rivera</p>
                    <p className="text-sm text-white/50">Senior Engineer @ Meta &nbsp;·&nbsp; aBridgeAI Graduate</p>
                  </div>
                </div>

                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xl">★</span>
                  ))}
                </div>
              </div>

              <div className="relative flex justify-center lg:justify-end reveal reveal-right" style={{ '--reveal-delay': '0.2s' } as React.CSSProperties}>
                <div className="relative">
                  <div className="relative w-72 h-80 rounded-xl overflow-hidden shadow-2xl rotate-3 hover:rotate-1 transition-transform duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1e40af] via-[#1d4ed8] to-[#3b82f6]" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
                      <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
                        <span className="font-headline font-bold text-white text-3xl">JR</span>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-semibold">Full-Stack Engineer</p>
                        <p className="text-white/50 text-sm">Completed 14 courses</p>
                      </div>
                      <div className="w-full space-y-1.5">
                        <div className="flex justify-between text-xs text-white/60">
                          <span>Skill Progress</span>
                          <span>96%</span>
                        </div>
                        <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                          <div className="h-full w-[96%] bg-gradient-to-r from-[#bfdbfe] to-[#3b82f6] rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 w-72 h-80 rounded-xl bg-gradient-to-br from-[#1e3a8a]/50 to-[#3b82f6]/30 -rotate-3 -z-10 blur-sm" />
                  <div className="absolute -top-4 -left-6 animate-float">
                    <div className="glass-dark ghost-border rounded-xl px-4 py-2.5 text-center">
                      <p className="font-headline font-bold text-white text-lg">4.9</p>
                      <p className="text-xs text-white/50">Avg. rating</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. INSTRUCTOR CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="relative rounded-xl overflow-hidden shadow-editorial reveal reveal-scale">
            <div className="absolute inset-0 gradient-hero" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-[#3b82f6]/20 blur-3xl" />
            </div>
            <div className="relative px-8 py-16 sm:px-16 text-center space-y-6">
              <AIInsightChip>Share Your Expertise</AIInsightChip>
              <h2 className="font-headline font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white max-w-2xl mx-auto leading-tight">
                Ready to Build the Bridge?
              </h2>
              <p className="text-white/70 text-lg max-w-xl mx-auto leading-relaxed font-body">
                Join thousands of world-class instructors bringing knowledge to life with
                AI-powered tools, real-time analytics, and a global audience of eager learners.
              </p>
              <div className="flex flex-wrap gap-3 justify-center pt-2">
                <Link to="/login" search={{ next: undefined }}>
                  <Button size="lg" className="bg-white text-m3-primary hover:bg-white/90 border-0 gap-2 px-8 h-12 font-semibold hover-entity">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
