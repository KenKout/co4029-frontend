import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

/**
 * The two leading header cells: the mobile-only back affordance and the
 * desktop-only title block. Returned as a fragment so both stay direct grid
 * children of the header row, exactly as before.
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

  return (
    <>
      <Link
        to="/courses/$slug/learn"
        params={{ slug }}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-text-muted outline-none transition-colors hover:bg-surface-muted hover:text-text-strong focus-visible:ring-2 focus-visible:ring-primary/60 lg:hidden"
        aria-label={t("course_interview.actions.back_to_course")}
        title={t("course_interview.actions.back_to_course")}
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="hidden min-w-0 items-center gap-3 lg:flex">
        <Link
          to="/courses/$slug/learn"
          params={{ slug }}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-text-muted outline-none transition-colors hover:bg-surface-muted hover:text-text-strong focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label={t("course_interview.actions.back_to_course")}
          title={t("course_interview.actions.back_to_course")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
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
