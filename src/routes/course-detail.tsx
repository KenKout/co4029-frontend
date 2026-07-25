import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  PlayCircle,
  HelpCircle,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Mic,
  Bot,
  Mail,
  Phone,
  Globe,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GlassCard } from "@/components/ui/glass-card";
import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { ApiError } from "@/lib/api/client";
import {
  useCourseBySlug,
  useCourseContent,
  useCourseOutcomes,
  useCourseTags,
  useModuleItems,
} from "@/lib/api/hooks/courses";
import type {
  CoursePublic,
  InstructorRead,
  ModulePublic,
  TagPublic,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

const CARD_GRADIENTS = [
  "from-blue-500 via-blue-700 to-blue-800",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-pink-500 via-rose-500 to-orange-500",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-red-500",
  "from-blue-500 via-blue-600 to-sky-500",
];

function slugGradient(slug: string) {
  const hash = slug.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
}

function ItemTypeIcon({ type }: { type: "lesson" | "quiz" | "interview" }) {
  if (type === "quiz")
    return <HelpCircle className="h-3.5 w-3.5 text-m3-primary shrink-0" />;
  if (type === "interview")
    return <Mic className="h-3.5 w-3.5 text-m3-secondary shrink-0" />;
  return <PlayCircle className="h-3.5 w-3.5 text-m3-secondary shrink-0" />;
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-m3-surface-container",
        className,
      )}
    />
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function CourseDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams({ strict: false }) as { slug: string };

  const courseQuery = useCourseBySlug(slug);
  const course = courseQuery.data;
  const courseId = course?.id;

  const { data: outcomes, isLoading: outcomesLoading } =
    useCourseOutcomes(courseId);
  const { data: content, isLoading: contentLoading } =
    useCourseContent(courseId);
  const { data: tags } = useCourseTags(courseId);

  const courseUnavailable =
    courseQuery.isError &&
    courseQuery.error instanceof ApiError &&
    courseQuery.error.status === 404;

  if (courseQuery.isLoading) {
    return (
      <div className="min-h-screen pb-28">
        <div className="h-72 bg-m3-surface-container animate-pulse" />
        <div className="max-w-6xl mx-auto space-y-6">
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-72" />
        </div>
      </div>
    );
  }

  if (courseUnavailable || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <p className="text-m3-on-surface font-headline font-bold text-xl">
            {t("course_detail.unavailable_title")}
          </p>
          <p className="text-sm text-m3-on-surface-variant">
            {t("course_detail.unavailable_body")}
          </p>
          <Link to="/courses">
            <Button className="gradient-primary text-white rounded-xl gap-2">
              {t("course_detail.browse_courses")}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const gradientClass = slugGradient(slug);
  const moduleCount = content?.modules.length ?? 0;

  const ctaCard = (
    <CtaCard
      course={course}
      gradientClass={gradientClass}
      moduleCount={moduleCount}
      tags={tags}
    />
  );

  return (
    <div className="min-h-screen pb-28">
      <div className="relative overflow-hidden border-b border-m3-outline-variant/20 pb-10 pt-2">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-2 text-xs text-m3-on-surface-variant mb-6">
            <Link
              to="/courses"
              className="hover:text-m3-primary transition-colors"
            >
              {t("course_detail.breadcrumb_courses")}
            </Link>
            <span>/</span>
            <span className="text-m3-on-surface truncate">{course.title}</span>
          </nav>

          <div className="flex flex-col lg:flex-row gap-10 items-start">
            <div className="flex-1 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <AIInsightChip className="bg-m3-primary/10 text-m3-primary border-0">
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  {t("course_detail.ai_enhanced")}
                </AIInsightChip>
              </div>

              <h1 className="font-headline font-extrabold text-3xl sm:text-4xl lg:text-5xl text-m3-on-surface leading-tight tracking-tight">
                {course.title}
              </h1>

              {course.description && (
                <p className="text-m3-on-surface-variant text-base sm:text-lg leading-relaxed max-w-2xl">
                  {course.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-5 text-sm text-m3-on-surface-variant">
                {moduleCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" />
                    {t("course_detail.modules_count", { count: moduleCount })}
                  </span>
                )}
              </div>

              <InstructorLine instructor={course.instructor ?? null} />

              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 rounded-full bg-m3-primary/8 border border-m3-primary/15 text-m3-primary text-xs font-medium"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden lg:block w-80 xl:w-88 shrink-0">
              {ctaCard}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 min-w-0 space-y-8">
            {outcomesLoading ? (
              <SkeletonBlock className="h-48" />
            ) : outcomes && outcomes.length > 0 ? (
              <GlassCard className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <GraduationCap className="h-5 w-5 text-m3-secondary" />
                  <h2 className="font-headline font-bold text-xl text-m3-on-surface">
                    {t("course_detail.what_youll_learn")}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {outcomes.map((outcome) => (
                    <div key={outcome.id} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-m3-secondary shrink-0 mt-0.5 fill-m3-secondary/10" />
                      <p className="text-sm text-m3-on-surface-variant leading-snug">
                        {outcome.outcome_text}
                      </p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            ) : null}

            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-headline font-bold text-xl text-m3-on-surface">
                  {t("course_detail.course_content")}
                </h2>
                {!contentLoading && content && (
                  <span className="text-xs text-m3-on-surface-variant">
                    {t("course_detail.modules_count", { count: moduleCount })}
                  </span>
                )}
              </div>

              {contentLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <SkeletonBlock key={i} className="h-16" />
                  ))}
                </div>
              ) : content && moduleCount > 0 ? (
                <ModuleAccordion modules={content.modules} />
              ) : (
                <div className="rounded-xl border border-dashed border-m3-outline-variant p-10 text-center">
                  <p className="text-sm text-m3-on-surface-variant">
                    {t("course_detail.no_modules")}
                  </p>
                </div>
              )}
            </div>

            {course.instructor && (
              <InstructorCard instructor={course.instructor} />
            )}

            <ContactCard course={course} />

            <GlassCard className="p-6 sm:p-8 bg-gradient-to-br from-m3-secondary/5 to-m3-primary/5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl gradient-secondary flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-headline font-bold text-m3-primary text-base">
                    {t("course_detail.ai_mock_title")}
                  </h3>
                  <p className="text-sm text-m3-on-surface-variant leading-relaxed">
                    {t("course_detail.ai_mock_body")}
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="w-full lg:hidden">{ctaCard}</div>
        </div>
      </div>
    </div>
  );
}

function InstructorLine({ instructor }: { instructor: InstructorRead | null }) {
  const { t } = useTranslation();
  if (!instructor) {
    return (
      <div className="flex items-center gap-2.5 text-sm text-m3-on-surface-variant">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-m3-surface-container text-m3-on-surface-variant text-xs font-bold">
            ?
          </AvatarFallback>
        </Avatar>
        <span>{t("course_detail.instructor_unknown")}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 text-sm text-m3-on-surface-variant">
      <Avatar className="h-7 w-7">
        {instructor.avatar_url ? (
          <AvatarImage
            src={instructor.avatar_url}
            alt={instructor.display_name}
          />
        ) : null}
        <AvatarFallback className="gradient-secondary text-white text-xs font-bold">
          {initials(instructor.display_name)}
        </AvatarFallback>
      </Avatar>
      <span>
        {t("course_detail.created_by")}{" "}
        <span className="text-m3-on-surface font-semibold">
          {instructor.display_name}
        </span>
        {instructor.headline && (
          <span className="text-m3-on-surface-variant/60">
            {" "}
            · {instructor.headline}
          </span>
        )}
      </span>
    </div>
  );
}

function ModuleAccordion({ modules }: { modules: ModulePublic[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const sorted = [...modules].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-2">
      {sorted.map((mod) => {
        const isOpen = open.has(mod.id);
        return (
          <div
            key={mod.id}
            className="rounded-xl overflow-hidden border border-m3-outline-variant/30 bg-m3-surface-container-lowest shadow-sm"
          >
            <button
              onClick={() => toggle(mod.id)}
              className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-m3-surface-container-low transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-headline font-semibold text-sm text-m3-on-surface leading-snug">
                    {mod.title}
                  </p>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-m3-outline shrink-0 ml-3" />
              ) : (
                <ChevronDown className="h-4 w-4 text-m3-outline shrink-0 ml-3" />
              )}
            </button>

            {isOpen && <ModuleItemsPanel moduleId={mod.id} />}
          </div>
        );
      })}
    </div>
  );
}

function ModuleItemsPanel({ moduleId }: { moduleId: string }) {
  const { t } = useTranslation();
  const { data: items, isLoading } = useModuleItems(moduleId);

  if (isLoading) {
    return (
      <div className="px-5 py-4">
        <SkeletonBlock className="h-10" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="border-t border-m3-outline-variant/20 px-5 py-4 text-sm text-m3-outline">
        {t("course_detail.no_items")}
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => a.position - b.position);

  return (
    <div className="border-t border-m3-outline-variant/20 divide-y divide-m3-outline-variant/10">
      {sorted.map((item) => {
        const label =
          item.item_type === "quiz"
            ? t("course_detail.item_quiz")
            : item.item_type === "interview"
              ? t("course_detail.item_interview")
              : (item.target?.title ?? t("course_detail.item_lesson"));
        return (
          <div
            key={item.id}
            className="flex items-center gap-3 px-5 py-3 hover:bg-m3-surface-container-low transition-colors"
          >
            <ItemTypeIcon type={item.item_type} />
            <span className="text-sm text-m3-on-surface-variant flex-1 leading-snug">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function InstructorCard({ instructor }: { instructor: InstructorRead }) {
  const { t } = useTranslation();
  const inits = initials(instructor.display_name);

  return (
    <GlassCard className="p-6 sm:p-8">
      <h2 className="font-headline font-bold text-xl text-m3-on-surface mb-5">
        {t("course_detail.about_instructor")}
      </h2>
      <div className="flex flex-col sm:flex-row gap-5">
        <Avatar className="h-20 w-20 shrink-0 ring-4 ring-white shadow-xl self-start">
          {instructor.avatar_url ? (
            <AvatarImage
              src={instructor.avatar_url}
              alt={instructor.display_name}
            />
          ) : null}
          <AvatarFallback className="gradient-primary text-white text-xl font-bold">
            {inits}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-3 flex-1">
          <div>
            <h3 className="font-headline font-bold text-m3-primary text-lg">
              {instructor.display_name}
            </h3>
            <p className="text-m3-secondary text-sm font-semibold mt-0.5">
              {t("course_detail.instructor_role")}
            </p>
          </div>
          {instructor.headline && (
            <p className="text-sm text-m3-on-surface-variant leading-relaxed">
              {instructor.headline}
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

// Teacher-published contact block. Renders nothing unless at least one contact
// field is set, so courses without contact info show no empty card. Email and
// phone become mailto:/tel: links; website and social open in a new tab.
function ContactCard({ course }: { course: CoursePublic }) {
  const { t } = useTranslation();
  const email = course.contact_email?.trim();
  const phone = course.contact_phone?.trim();
  const website = course.contact_website_url?.trim();
  const social = course.contact_social_url?.trim();

  if (!email && !phone && !website && !social) return null;

  // Strip the scheme for a cleaner visible label on URL rows.
  const pretty = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <GlassCard className="p-6 sm:p-8">
      <h2 className="font-headline font-bold text-xl text-m3-on-surface mb-5">
        {t("course_detail.contact_title")}
      </h2>
      <div className="space-y-3">
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-3 text-sm text-m3-on-surface hover:text-m3-primary transition-colors group"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary/8 text-m3-primary group-hover:bg-m3-primary/15 transition-colors">
              <Mail className="h-4 w-4" />
            </span>
            <span className="truncate">{email}</span>
          </a>
        )}
        {phone && (
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className="flex items-center gap-3 text-sm text-m3-on-surface hover:text-m3-primary transition-colors group"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary/8 text-m3-primary group-hover:bg-m3-primary/15 transition-colors">
              <Phone className="h-4 w-4" />
            </span>
            <span className="truncate">{phone}</span>
          </a>
        )}
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm text-m3-on-surface hover:text-m3-primary transition-colors group"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary/8 text-m3-primary group-hover:bg-m3-primary/15 transition-colors">
              <Globe className="h-4 w-4" />
            </span>
            <span className="truncate">{pretty(website)}</span>
          </a>
        )}
        {social && (
          <a
            href={social}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm text-m3-on-surface hover:text-m3-primary transition-colors group"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-m3-primary/8 text-m3-primary group-hover:bg-m3-primary/15 transition-colors">
              <Share2 className="h-4 w-4" />
            </span>
            <span className="truncate">{pretty(social)}</span>
          </a>
        )}
      </div>
    </GlassCard>
  );
}

function CtaCard({
  course,
  gradientClass,
  moduleCount,
  tags,
}: {
  course: CoursePublic;
  gradientClass: string;
  moduleCount: number;
  tags: TagPublic[] | undefined;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl overflow-hidden shadow-editorial ghost-border bg-m3-surface-container-lowest">
      <div className={cn("relative h-44 bg-gradient-to-br", gradientClass)}>
        {course.thumbnail_url && (
          <img
            src={course.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {/* GraduationCap motif only on the gradient placeholder — a real
            thumbnail shouldn't have an icon overlaid on it. */}
        {!course.thumbnail_url && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        <Link
          to="/courses/$slug/learn"
          params={{ slug: course.slug }}
          className="block"
        >
          <Button className="w-full gradient-primary text-white font-bold rounded-xl py-5 h-auto text-base gap-2 shadow-ai-glow hover:opacity-90 transition-opacity">
            {t("course_detail.start_learning")}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>

        {moduleCount > 0 && (
          <div className="flex items-center justify-between text-sm pt-1">
            <span className="flex items-center gap-2 text-m3-on-surface-variant">
              <BookOpen className="h-4 w-4 text-m3-outline" />
              {t("course_detail.modules")}
            </span>
            <span className="font-semibold text-m3-on-surface text-xs">
              {moduleCount}
            </span>
          </div>
        )}

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-m3-outline-variant/20">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2.5 py-1 rounded-full bg-m3-secondary/8 text-m3-secondary text-[10px] font-semibold"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {course.instructor && (
          <div className="flex items-center gap-3 pt-2 border-t border-m3-outline-variant/20">
            <Avatar className="h-9 w-9 shrink-0">
              {course.instructor.avatar_url ? (
                <AvatarImage
                  src={course.instructor.avatar_url}
                  alt={course.instructor.display_name}
                />
              ) : null}
              <AvatarFallback className="gradient-primary text-white text-xs font-bold">
                {initials(course.instructor.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-m3-on-surface truncate">
                {course.instructor.display_name}
              </p>
              <p className="text-[10px] text-m3-on-surface-variant">
                {t("course_detail.instructor_role")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
