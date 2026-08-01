import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bot, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The three single-card states of the course-interview route — loading,
 * unloadable config, and the post-voice results poll — moved verbatim out of
 * course-interview.tsx.
 */

export function InterviewLoadingScreen() {
  return (
    // Shaped like the lobby it precedes — eyebrow, title, description, the
    // 2x2 stat grid, then the action — so the swap reads as content arriving
    // rather than as one layout being replaced by a different one. Uses the
    // shared Skeleton primitive instead of hand-rolled pulsing divs.
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-xl">
        <GlassCard className="p-8 text-center sm:p-10">
          <Skeleton className="mx-auto mb-3 h-3 w-40" />
          <Skeleton className="mx-auto mb-3 h-8 w-3/4" />
          <Skeleton className="mx-auto mb-6 h-4 w-2/3" />
          <div className="mb-8 grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((tile) => (
              <Skeleton key={tile} className="h-[60px] rounded-xl" />
            ))}
          </div>
          <Skeleton className="mx-auto h-11 w-full rounded-xl" />
        </GlassCard>
      </div>
    </div>
  );
}

export function InterviewMissingConfigScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <GlassCard className="p-10 text-center max-w-md">
        <Bot className="h-10 w-10 text-m3-outline mx-auto mb-4" />
        <h2 className="font-headline font-bold text-xl text-m3-on-surface mb-2">
          {t("course_interview.empty_states.no_interview_found")}
        </h2>
        <p className="text-sm text-m3-on-surface-variant mb-6">
          {t("course_interview.empty_states.config_not_loadable")}
        </p>
        <Link to="/courses/$slug/learn" params={{ slug }}>
          <Button className="gradient-primary text-white rounded-xl font-bold gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("course_interview.actions.back_to_course")}
          </Button>
        </Link>
      </GlassCard>
    </div>
  );
}

export function InterviewPollingScreen() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-8">
      <GlassCard className="p-10 text-center max-w-md">
        <Sparkles className="h-8 w-8 text-m3-primary mx-auto mb-4 animate-pulse" />
        <p className="text-sm text-m3-on-surface-variant">
          {t("course_interview.status.compiling_results")}
        </p>
      </GlassCard>
    </div>
  );
}
