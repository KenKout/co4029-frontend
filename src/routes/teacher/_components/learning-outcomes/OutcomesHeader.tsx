import { BookOpen, Lock, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { TranslateFn } from "./types";

/** Section header: title, help copy and the import-from-course affordance. */
export function OutcomesHeader({
  showActions,
  showImportButton,
  onOpenImport,
  disabled,
  disabledReason,
  t,
}: {
  showActions: boolean;
  showImportButton: boolean;
  onOpenImport: () => void;
  /** Published configs freeze the outcomes (they are the grading criteria). */
  disabled?: boolean;
  disabledReason?: string;
  t: TranslateFn;
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0 space-y-1">
        <h3
          className="font-headline font-extrabold text-base text-m3-on-surface"
          title={disabled ? disabledReason : undefined}
        >
          {t("teacher_interview_config.outcomes.list_title")}
          {disabled && (
            <Lock
              className="ml-1.5 inline-block h-3 w-3 align-text-top"
              aria-hidden="true"
            />
          )}
        </h3>
        <p className="text-xs text-m3-on-surface-variant max-w-prose">
          {t("teacher_interview_config.outcomes.section_help")}
        </p>
      </div>
      {showActions && (
        <div className="flex items-center gap-2 shrink-0">
          {showImportButton && (
            <Button
              type="button"
              variant="outline"
              onClick={onOpenImport}
              disabled={disabled}
              title={disabled ? disabledReason : undefined}
              className="gap-2 hover:bg-primary/10 hover:border-primary/40 hover:text-primary disabled:pointer-events-auto disabled:opacity-50"
            >
              <BookOpen className="h-4 w-4" />
              {t("teacher_interview_config.outcomes.import_from_course")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Empty state — outcomes are sourced from the course, never authored here, so
 * the only affordance is the course importer.
 */
export function OutcomesEmptyState({
  hasImportableOutcomes,
  onOpenImport,
  disabled,
  disabledReason,
  t,
}: {
  hasImportableOutcomes: boolean;
  onOpenImport: () => void;
  /** Published configs freeze the outcomes (they are the grading criteria). */
  disabled?: boolean;
  disabledReason?: string;
  t: TranslateFn;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <TriangleAlert
          className="h-4 w-4 text-amber-600 mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-sm font-bold text-m3-on-surface">
            {t("teacher_interview_config.outcomes.empty_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant max-w-prose">
            {t("teacher_interview_config.outcomes.empty_body")}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {hasImportableOutcomes ? (
          <Button
            type="button"
            variant="outline"
            onClick={onOpenImport}
            disabled={disabled}
            title={disabled ? disabledReason : undefined}
            className="gap-2 hover:bg-primary/10 hover:border-primary/40 hover:text-primary disabled:pointer-events-auto disabled:opacity-50"
            size="sm"
          >
            <BookOpen className="h-4 w-4" />
            {t("teacher_interview_config.outcomes.import_from_course")}
          </Button>
        ) : (
          <p className="text-xs text-m3-on-surface-variant">
            {t("teacher_interview_config.outcomes.no_course_outcomes")}
          </p>
        )}
      </div>
    </div>
  );
}
