import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The two leading header cells: the mobile-only back affordance and the
 * desktop-only title block. Returned as a fragment so both stay direct grid
 * children of the header row, exactly as before.
 *
 * Back goes through `router.history.back()` — REAL browser history — instead
 * of a hardcoded Link to /courses/$slug/learn. Two reasons:
 *  1. A live session blocks in-page navigation with the Leave/Stay dialog
 *     (useBlocker). A history back is a blocked navigation the resolver can
 *     intercept, so clicking Back mid-interview now ASKS instead of silently
 *     dropping the session — the same contract as the browser back button.
 *  2. When reached through the curriculum item route (/courses/$slug/learn/
 *     $itemSlug), the interview renders INSIDE that page; a Link to /learn
 *     would yank the candidate to the bare learn index, losing their place.
 * A deep link with no history (index 0) falls back to the learn route.
 */
export function InterviewHeaderBrand({
  slug,
  courseName,
  interviewTitle,
}: {
  slug: string;
  courseName: string;
  interviewTitle: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  const goBack = () => {
    if (router.history.canGoBack()) {
      router.history.back();
      return;
    }
    void router.navigate({ to: "/courses/$slug/learn", params: { slug } });
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={goBack}
        className="size-11 shrink-0 rounded-lg text-text-muted hover:bg-surface-muted hover:text-text-strong lg:hidden"
        aria-label={t("course_interview.actions.back_to_course")}
        title={t("course_interview.actions.back_to_course")}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <div className="hidden min-w-0 items-center gap-3 lg:flex">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="size-10 shrink-0 rounded-lg text-text-muted hover:bg-surface-muted hover:text-text-strong"
          aria-label={t("course_interview.actions.back_to_course")}
          title={t("course_interview.actions.back_to_course")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-strong">
            {interviewTitle}
          </p>
          <p className="truncate text-xs text-text-muted">{courseName}</p>
        </div>
      </div>
    </>
  );
}
