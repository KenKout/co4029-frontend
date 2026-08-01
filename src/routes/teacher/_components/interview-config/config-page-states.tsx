/**
 * The two pre-content states of the interview-config page: the loading skeleton
 * and the "config not found" fallback.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 7 of that file's
 * decomposition). Both are early returns from the page component, so lifting
 * them out removes two whole branches of markup from the orchestrator without
 * changing what renders.
 */

import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ConfigLoadingSkeleton() {
  // Shaped like the screen it precedes — header, tab strip, then the first
  // settings card — rather than a bare spinner on an empty page. This guard
  // is also why QuestionBank has no loading state of its own: it never
  // renders while the config query is in flight.
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-7 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="space-y-4">
        {[0, 1, 2].map((card) => (
          <Skeleton
            key={card}
            className="h-40 w-full rounded-xl"
            style={{ animationDelay: `${card * 120}ms` } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

export function ConfigNotFound({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-24 text-m3-on-surface-variant space-y-4">
      <div className="flex justify-center">
        <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
          <HelpCircle className="h-6 w-6" />
        </div>
      </div>
      <div>
        <p className="font-headline font-bold text-m3-on-surface">
          {t("teacher_interview_config.errors.not_found_title")}
        </p>
        <p className="text-sm mt-1">
          {t("teacher_interview_config.errors.not_found_body")}
        </p>
      </div>
      <Link
        to="/teacher/courses/$courseId"
        params={{ courseId }}
        className="inline-flex"
      >
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("teacher_interview_config.errors.back_to_course")}
        </Button>
      </Link>
    </div>
  );
}
