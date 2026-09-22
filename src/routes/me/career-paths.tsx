import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useMyCareerEnrollments } from "@/lib/api/hooks/career-paths";
import { useFormatDate } from "@/lib/format/date";
import { ENROLLMENT_STATUS_TOKENS, statusToken } from "@/lib/status-tokens";
import type { MyCareerEnrollmentRead } from "@/lib/api/types";

function EnrollmentRow({ item }: { item: MyCareerEnrollmentRead }) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const percent = Math.round(
    Math.min(100, Math.max(0, item.overall_percent ?? 0)),
  );
  const prepared = item.is_prepared ?? item.status === "completed";
  /**
   * "Prepared" is a milestone that was earned, not a claim about today. The
   * stage latch is append-only, so un-marking a lesson or an author raising
   * an elective quota lowers `overall_percent` while the badge stays.
   *
   * Shown together with no explanation that reads as a bug: a green
   * completed badge over a bar at 87%. So the two are only styled as one
   * thing while they agree, and the row says what happened when they do not.
   */
  const currentlyComplete = item.is_currently_complete ?? prepared;
  const regressed = prepared && !currentlyComplete;
  return (
    <Link
      to="/catalog/career-paths/$slug"
      params={{ slug: item.slug }}
      className="block group"
    >
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card ghost-border hover:shadow-editorial transition-all duration-200 cursor-pointer">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-m3-primary to-m3-secondary flex items-center justify-center shrink-0">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-headline font-semibold text-sm text-m3-on-surface line-clamp-1 leading-snug flex-1">
              {item.name}
            </h3>
            {prepared ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                {t("me_career_paths.prepared")}
              </span>
            ) : (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${statusToken(ENROLLMENT_STATUS_TOKENS, item.status)}`}
              >
                {t(`me_career_paths.status.${item.status}`)}
              </span>
            )}
          </div>

          {/* Derived pathway completion */}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-m3-surface-container overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${currentlyComplete ? "bg-emerald-500" : "gradient-primary"}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-m3-on-surface-variant tabular-nums shrink-0">
              {percent}%
            </span>
          </div>

          {regressed ? (
            <p className="mt-1 text-[11px] text-amber-700">
              {t("me_career_paths.prepared_regressed", { percent })}
            </p>
          ) : null}

          <div className="mt-1 flex items-center gap-3 text-[11px] text-m3-on-surface-variant">
            <span className="font-mono truncate">{item.slug}</span>
            <span>
              {t("me_career_paths.started", {
                date: formatDate(item.started_at),
              })}
            </span>
            {item.completed_at && (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                {formatDate(item.completed_at)}
              </span>
            )}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-m3-on-surface-variant shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

export default function MyCareerPathsPage() {
  const { t } = useTranslation();
  const list = useMyCareerEnrollments();
  const items = list.data ?? [];

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8">
      <header className="pt-2">
        <h1 className="font-headline font-black text-3xl sm:text-4xl text-m3-on-surface tracking-tight">
          {t("me_career_paths.title")}
        </h1>
        <p className="mt-2 text-m3-on-surface-variant text-sm sm:text-base max-w-xl">
          {t("me_career_paths.subtitle")}
        </p>
      </header>

      <section className="space-y-4">
        <SectionHeader
          title={t("me_career_paths.section_title")}
          subtitle={t("me_career_paths.n_paths", { count: items.length })}
        />

        {list.isError && (
          <EmptyState
            icon={AlertCircle}
            title={t("me_career_paths.load_failed_title")}
            description={t("me_career_paths.load_failed_body")}
            cta={
              <Button
                variant="outline"
                onClick={() => list.refetch()}
                className="cursor-pointer"
              >
                {t("me_career_paths.retry")}
              </Button>
            }
          />
        )}

        {list.isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        )}

        {!list.isLoading && !list.isError && items.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title={t("me_career_paths.empty_title")}
            description={t("me_career_paths.empty_body")}
            cta={
              <Link
                to="/catalog/career-paths"
                className="text-sm font-semibold text-m3-primary hover:underline"
              >
                {t("me_career_paths.view_paths")}
              </Link>
            }
          />
        )}

        {!list.isLoading && !list.isError && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => (
              <EnrollmentRow key={item.career_path_id} item={item} />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
