/**
 * Page header for the interview-config workspace: breadcrumbs, the title block
 * with its status badges, and the publish / overflow action cluster.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 7 of that file's
 * decomposition). Presentational only — every mutation is handed in as a
 * callback so the page keeps ownership of the mutation hooks and their pending
 * state.
 */

import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";

import { AIInsightChip } from "@/components/ui/ai-insight-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  ConfigHeaderActions,
  type ConfigActionHandlers,
  type ConfigActionPending,
} from "@/routes/teacher/_components/interview-config/config-header-actions";

export interface ConfigHeaderProps {
  courseId: string;
  /** `course?.title` — falls back to the generic breadcrumb label when absent. */
  courseTitle: string | undefined;
  /** The owning module's title, or null when the module is not resolved yet. */
  moduleTitle: string | null;
  title: string;
  publishedAt: string | null | undefined;
  draftCount: number;
  approvedCount: number;
  isPublished: boolean;
  isArchived: boolean;
  publishDisabled: boolean;
  pending: ConfigActionPending;
  handlers: ConfigActionHandlers;
}

export function ConfigHeader({
  courseId,
  courseTitle,
  moduleTitle,
  title,
  publishedAt,
  draftCount,
  approvedCount,
  isPublished,
  isArchived,
  publishDisabled,
  pending,
  handlers,
}: ConfigHeaderProps) {
  const { t, i18n } = useTranslation();

  return (
    <>
      <Breadcrumbs
        items={[
          {
            label: t("teacher_common.breadcrumb_teaching"),
            to: "/teacher/courses",
          },
          {
            label: courseTitle ?? t("teacher_common.breadcrumb_course"),
            to: "/teacher/courses/$courseId",
            params: { courseId },
          },
          ...(moduleTitle !== null ? [{ label: moduleTitle }] : []),
          { label: title },
        ]}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Link to="/teacher/courses/$courseId" params={{ courseId }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 mt-1 shrink-0"
              title={t("teacher_interview_config.actions.back_tooltip")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-gradient-primary leading-tight">
              {title}
            </h1>
            <ConfigStatusBadges
              draftCount={draftCount}
              isPublished={isPublished}
              isArchived={isArchived}
            />
            {isPublished && publishedAt && (
              <p className="inline-flex items-center gap-1.5 text-[11px] text-m3-on-surface-variant">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {t("teacher_interview_config.header.last_published", {
                  when: new Date(publishedAt).toLocaleString(
                    i18n.language?.startsWith("vi") ? "vi-VN" : "en-US",
                    { dateStyle: "medium", timeStyle: "short" },
                  ),
                })}
              </p>
            )}
          </div>
        </div>

        <ConfigHeaderActions
          approvedCount={approvedCount}
          isPublished={isPublished}
          isArchived={isArchived}
          publishDisabled={publishDisabled}
          pending={pending}
          handlers={handlers}
        />
      </div>
    </>
  );
}

function ConfigStatusBadges({
  draftCount,
  isPublished,
  isArchived,
}: {
  draftCount: number;
  isPublished: boolean;
  isArchived: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className="border border-m3-outline-variant/30 bg-m3-surface-container-low text-m3-on-surface-variant rounded-full text-[11px] font-bold px-2.5 py-1">
        {t("teacher_interview_config.header.draft_count", {
          count: draftCount,
        })}
      </Badge>
      {isPublished ? (
        <Badge className="border-0 bg-emerald-100 text-emerald-700 text-[11px] font-bold gap-1.5 rounded-full px-2.5 py-1">
          <CheckCircle2 className="h-3 w-3" />
          {t("teacher_interview_config.status.published")}
        </Badge>
      ) : isArchived ? (
        <Badge className="border-0 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-full px-2.5 py-1">
          {t("teacher_interview_config.status.archived")}
        </Badge>
      ) : (
        <Badge className="border-0 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-full px-2.5 py-1">
          {t("teacher_interview_config.status.draft")}
        </Badge>
      )}
      <AIInsightChip>
        {t("teacher_interview_config.header.chip_label")}
      </AIInsightChip>
    </div>
  );
}
