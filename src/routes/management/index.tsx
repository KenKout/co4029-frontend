import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileEdit,
  GitPullRequestArrow,
  Layers,
  Users,
} from "lucide-react";

import ActionTile from "@/components/ui/action-tile";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useManagementDashboard } from "@/lib/api/hooks/management";
import type {
  BlockedCourseRow,
  ProgramAttentionRow,
} from "@/lib/api/types/management";

/**
 * Manager / faculty-dean landing page.
 *
 * A decision queue, not a metrics wall: every block answers "what needs YOU?".
 * Cohort progress roll-ups and completion counts were deliberately deferred
 * (Tier 2/3) because a manager cannot act on a percentage, and the platform-ops
 * numbers belong to the admin dashboard — duplicating them invites the two
 * pages to disagree.
 *
 * Dean vs manager is ONE page. The dean's extra power is reviewing path-change
 * requests, so that tile appears only when the payload says
 * `can_review_path_changes`; everything else is identical.
 */
export default function ManagementDashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useManagementDashboard();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
      <PageHeader title={t("management_dashboard.title")} />

      {isError ? (
        <GlassCard className="p-6">
          <p className="text-sm text-red-700">
            {t("management_dashboard.load_failed")}
          </p>
        </GlassCard>
      ) : null}

      <CountsRow data={data} isLoading={isLoading} t={t} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <BlockedCoursesSection
          rows={data?.blocked_courses}
          isLoading={isLoading}
          t={t}
        />
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <ProgramsSection
            rows={data?.programs_needing_attention}
            isLoading={isLoading}
            t={t}
          />
        </aside>
      </div>
    </div>
  );
}

type TranslateFn = ReturnType<typeof useTranslation>["t"];

/**
 * Headline counts.
 *
 * `courses_blocked` deep-links into the section below via a hash rather than a
 * separate page: the queue is already on this screen, so a tile that navigated
 * away would lose the context the manager just gained.
 */
function CountsRow({
  data,
  isLoading,
  t,
}: {
  data: ReturnType<typeof useManagementDashboard>["data"];
  isLoading: boolean;
  t: TranslateFn;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }
  if (!data) return null;

  const { counts } = data;
  const blocked = counts.courses_blocked;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <ActionTile
        label={t("management_dashboard.tile_blocked")}
        value={String(blocked)}
        detail={t("management_dashboard.tile_blocked_detail", {
          total: counts.courses_total,
        })}
        severity={blocked > 0 ? "warn" : "ok"}
        icon={blocked > 0 ? AlertTriangle : CheckCircle2}
        to="/management"
        hash="blocked-courses"
      />
      <ActionTile
        label={t("management_dashboard.tile_draft")}
        value={String(counts.courses_draft)}
        detail={t("management_dashboard.tile_draft_detail", {
          published: counts.courses_published,
        })}
        icon={FileEdit}
        to="/management/courses"
      />
      <ActionTile
        label={t("management_dashboard.tile_programs")}
        value={String(counts.programs_total)}
        icon={Layers}
        to="/management/learning-programs"
      />
      {/*
        `null` means the caller cannot review path changes — not that there is
        no work. Rendering "0" there would be a claim the server explicitly
        declined to make, so the tile is omitted instead.
      */}
      {counts.open_path_change_requests === null ? (
        <ActionTile
          label={t("management_dashboard.tile_courses")}
          value={String(counts.courses_total)}
          icon={BookOpen}
          to="/management/courses"
        />
      ) : (
        <ActionTile
          label={t("management_dashboard.tile_requests")}
          value={String(counts.open_path_change_requests)}
          detail={t("management_dashboard.tile_requests_detail")}
          severity={counts.open_path_change_requests > 0 ? "warn" : "ok"}
          icon={GitPullRequestArrow}
          to="/management/learning-programs"
        />
      )}
    </div>
  );
}

/** Courses that cannot be published, worst first (server-ordered). */
function BlockedCoursesSection({
  rows,
  isLoading,
  t,
}: {
  rows: BlockedCourseRow[] | undefined;
  isLoading: boolean;
  t: TranslateFn;
}) {
  return (
    <section id="blocked-courses" className="space-y-3">
      <h2 className="text-base font-semibold text-m3-on-surface">
        {t("management_dashboard.blocked_heading")}
      </h2>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !rows || rows.length === 0 ? (
        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-sm text-text-muted">
              {t("management_dashboard.blocked_empty")}
            </p>
          </div>
        </GlassCard>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.course_id}>
              <GlassCard className="relative p-4 transition-colors hover:border-border-strong">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/management/courses/$courseId"
                        params={{ courseId: row.course_id }}
                        className="truncate text-sm font-semibold text-m3-on-surface hover:text-primary"
                      >
                        {row.title}
                      </Link>
                      <span className="rounded-sm bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium uppercase text-text-muted">
                        {row.status}
                      </span>
                      {row.blocks_required_stage ? (
                        <span className="rounded-sm bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-800">
                          {t("management_dashboard.badge_required")}
                        </span>
                      ) : null}
                    </div>
                    {/*
                      The server's sentence, not a client-side reconstruction:
                      it is generated from the same predicates the publish gate
                      uses, so re-deriving it here could disagree with the 409
                      the manager gets from the Publish button.
                    */}
                    <p className="text-xs text-text-muted">{row.reason}</p>
                  </div>
                  <dl className="hidden shrink-0 gap-4 text-right sm:flex">
                    <Stat
                      label={t("management_dashboard.stat_units")}
                      value={row.gradeable_unit_count}
                    />
                    <Stat
                      label={t("management_dashboard.stat_outcomes")}
                      value={row.learning_outcome_count}
                    />
                    <Stat
                      label={t("management_dashboard.stat_teachers")}
                      value={`${row.teacher_count}/${row.min_teachers}`}
                    />
                  </dl>
                </div>
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase text-text-muted">{label}</dt>
      <dd className="text-sm font-semibold text-m3-on-surface">{value}</dd>
    </div>
  );
}

/** Programs with an open request queue or an unpublished draft version. */
function ProgramsSection({
  rows,
  isLoading,
  t,
}: {
  rows: ProgramAttentionRow[] | undefined;
  isLoading: boolean;
  t: TranslateFn;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-m3-on-surface">
        {t("management_dashboard.programs_heading")}
      </h2>

      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : !rows || rows.length === 0 ? (
        <GlassCard className="p-4">
          <p className="text-xs text-text-muted">
            {t("management_dashboard.programs_empty")}
          </p>
        </GlassCard>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.program_id}>
              <GlassCard className="p-4 transition-colors hover:border-border-strong">
                {/*
                  Deep-links straight to the Path-changes tab when the queue is
                  what needs attention, so the dean lands on the work rather
                  than the program's General tab. The route already validates
                  ?tab=requests for exactly this (dean notifications use it).
                */}
                <Link
                  to="/management/learning-programs/$id"
                  params={{ id: row.program_id }}
                  search={
                    row.open_path_change_requests > 0
                      ? { tab: "requests" as const }
                      : {}
                  }
                  className="text-sm font-semibold text-m3-on-surface hover:text-primary"
                >
                  {row.name}
                </Link>
                <p className="mt-1 text-xs text-text-muted">{row.reason}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t("management_dashboard.program_stages", {
                      count: row.stage_count,
                    })}
                  </span>
                  {row.open_path_change_requests > 0 ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                      <GitPullRequestArrow className="h-3 w-3" />
                      {row.open_path_change_requests}
                    </span>
                  ) : null}
                </div>
              </GlassCard>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
