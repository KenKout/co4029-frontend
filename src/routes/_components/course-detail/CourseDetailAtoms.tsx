import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, HelpCircle, Mic, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The small shared pieces of the course-detail page. */

export function ItemTypeIcon({
  type,
}: {
  type: "lesson" | "quiz" | "interview";
}) {
  if (type === "quiz")
    return <HelpCircle className="h-3.5 w-3.5 text-m3-primary shrink-0" />;
  if (type === "interview")
    return <Mic className="h-3.5 w-3.5 text-m3-secondary shrink-0" />;
  return <PlayCircle className="h-3.5 w-3.5 text-m3-secondary shrink-0" />;
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-m3-surface-container",
        className,
      )}
    />
  );
}

export function CourseDetailSkeleton() {
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

export function CourseUnavailablePanel() {
  const { t } = useTranslation();
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
