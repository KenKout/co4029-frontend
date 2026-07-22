import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  MoreVertical,
  Snowflake,
  TrendingDown,
  UserCog,
} from "lucide-react";
import { useAtRiskStudents } from "@/lib/api/hooks/spaced-repetition";
import { useCourse } from "@/lib/api/hooks/courses";
import { SectionHeader } from "@/components/ui/section-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AtRiskStudent } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const FLAG_KEYS = ["low_compliance", "frozen_kr", "high_theory_practice_gap"] as const;
type FlagKey = (typeof FLAG_KEYS)[number];

const FLAG_ICONS: Record<FlagKey, typeof TrendingDown> = {
  low_compliance: TrendingDown,
  frozen_kr: Snowflake,
  high_theory_practice_gap: AlertTriangle,
};

const FLAG_LABEL_KEYS: Record<
  FlagKey,
  { label: string; short: string; desc: string; action: string }
> = {
  low_compliance: {
    label: "teacher_sr_at_risk.flags.low_compliance_label",
    short: "teacher_sr_at_risk.flags.low_compliance_short",
    desc: "teacher_sr_at_risk.flags.low_compliance_desc",
    action: "teacher_sr_at_risk.flags.low_compliance_action",
  },
  frozen_kr: {
    label: "teacher_sr_at_risk.flags.frozen_kr_label",
    short: "teacher_sr_at_risk.flags.frozen_kr_short",
    desc: "teacher_sr_at_risk.flags.frozen_kr_desc",
    action: "teacher_sr_at_risk.flags.frozen_kr_action",
  },
  high_theory_practice_gap: {
    label: "teacher_sr_at_risk.flags.tp_gap_label",
    short: "teacher_sr_at_risk.flags.tp_gap_short",
    desc: "teacher_sr_at_risk.flags.tp_gap_desc",
    action: "teacher_sr_at_risk.flags.tp_gap_action",
  },
};

function activeFlagsOf(student: AtRiskStudent): FlagKey[] {
  return FLAG_KEYS.filter((k) => student[k]);
}

function useRelDate() {
  const { t } = useTranslation();
  return (iso: string | null | undefined) => {
    if (!iso) return t("teacher_sr_at_risk.no_activity");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    const days = Math.round((today.getTime() - d.getTime()) / 86_400_000);
    if (days <= 0) return t("teacher_sr_at_risk.today");
    if (days === 1) return t("teacher_sr_at_risk.yesterday");
    if (days < 7) return t("teacher_sr_at_risk.days_ago", { count: days });
    if (days < 30) return t("teacher_sr_at_risk.weeks_ago", { count: Math.floor(days / 7) });
    return t("teacher_sr_at_risk.months_ago", { count: Math.floor(days / 30) });
  };
}

function WhyFlaggedChips({ student }: { student: AtRiskStudent }) {
  const { t } = useTranslation();
  const flags = activeFlagsOf(student);
  if (flags.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {t("teacher_sr_at_risk.none_short")}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((key) => {
        const Icon = FLAG_ICONS[key];
        const meta = FLAG_LABEL_KEYS[key];
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700"
            title={`${t(meta.label)} — ${t(meta.desc)}`}
          >
            <Icon className="h-3 w-3 shrink-0" />
            {t(meta.short)}
          </span>
        );
      })}
    </div>
  );
}

function flagCountOf(student: AtRiskStudent): number {
  return (
    Number(student.low_compliance) +
    Number(student.frozen_kr) +
    Number(student.high_theory_practice_gap)
  );
}

export default function TeacherSrAtRiskPage() {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const navigate = useNavigate();
  const relDate = useRelDate();
  const { data: course } = useCourse(courseId);
  const { data: students, isLoading } = useAtRiskStudents(courseId);

  // Sort most-urgent first: more issues = higher up. Teachers scan top-down,
  // so the students needing attention now surface immediately (the raw query
  // orders alphabetically, which buries the worst cases).
  const atRiskList = [...(students ?? [])].sort(
    (a, b) => flagCountOf(b) - flagCountOf(a),
  );

  const detailTo = "/teacher/courses/$courseId/students/$studentId/sr" as const;
  const goToDetail = (studentId: string) =>
    void navigate({ to: detailTo, params: { courseId, studentId } });

  const columns: DataTableColumn<AtRiskStudent>[] = [
    {
      id: "student",
      header: t("teacher_sr_at_risk.cols.student"),
      cell: (s) => (
        <div className="min-w-0">
          <Link
            to={detailTo}
            params={{ courseId, studentId: s.student_id }}
            onClick={(e) => e.stopPropagation()}
            className="block max-w-[24ch] truncate text-sm font-semibold text-m3-on-surface hover:text-m3-primary hover:underline"
          >
            {s.name}
          </Link>
          <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
            <Clock className="h-3 w-3" />
            {relDate(s.last_active_at)}
          </span>
        </div>
      ),
    },
    {
      id: "why_flagged",
      header: t("teacher_sr_at_risk.cols.why_flagged"),
      cell: (s) => <WhyFlaggedChips student={s} />,
    },
    {
      id: "priority",
      header: t("teacher_sr_at_risk.cols.priority"),
      align: "center",
      cell: (s) => {
        const count = flagCountOf(s);
        const high = count >= 2;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold whitespace-nowrap",
              high ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700",
            )}
            title={t("teacher_sr_at_risk.flag_count", { count })}
          >
            {high ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
            {high
              ? t("teacher_sr_at_risk.priority.high_label")
              : t("teacher_sr_at_risk.priority.low_label")}
          </span>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-5xl mx-auto pb-6 space-y-6">
        <Breadcrumbs
          items={[
            { label: t("teacher_sr_cohort.breadcrumb_teaching"), to: "/teacher/courses" },
            {
              label: course?.title ?? t("teacher_sr_cohort.breadcrumb_course"),
              to: "/teacher/courses/$courseId",
              params: { courseId },
            },
            { label: t("teacher_sr_at_risk.breadcrumb_at_risk") },
          ]}
        />

        <div className="flex items-center gap-3">
          <Link
            to="/teacher/courses/$courseId"
            params={{ courseId }}
            className="p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-colors cursor-pointer"
            aria-label={t("teacher_sr_cohort.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <SectionHeader
            title={t("teacher_sr_at_risk.title")}
            subtitle={t("teacher_sr_at_risk.subtitle")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FLAG_KEYS.map((key) => {
            const Icon = FLAG_ICONS[key];
            const count = atRiskList.filter((s) => s[key]).length;
            const meta = FLAG_LABEL_KEYS[key];
            return (
              <div
                key={key}
                className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4 flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-heading font-black text-m3-primary">
                      {isLoading ? "—" : count}
                    </p>
                    <p className="text-sm font-bold text-m3-on-surface truncate">
                      {t(meta.label)}
                    </p>
                  </div>
                  <p className="text-xs text-m3-on-surface-variant mt-1 leading-snug">
                    {t(meta.desc)}
                  </p>
                  <p className="text-xs text-m3-primary/80 mt-1 leading-snug">
                    {t(meta.action)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <DataTable
          columns={columns}
          data={atRiskList}
          getRowId={(s) => s.student_id}
          loading={isLoading}
          onRowClick={(s) => goToDetail(s.student_id)}
          pagination
          pageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyState={
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <UserCog className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-m3-on-surface">
                {t("teacher_sr_at_risk.empty_title")}
              </p>
              <p className="text-xs text-m3-on-surface-variant max-w-md">
                {t("teacher_sr_at_risk.empty_body")}
              </p>
            </div>
          }
          actions={(s) => (
            <DropdownMenu>
              <DropdownMenuTrigger
                onClick={(e) => e.stopPropagation()}
                aria-label={t("teacher_sr_at_risk.row_actions")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high cursor-pointer"
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => goToDetail(s.student_id)}>
                  <Eye className="h-4 w-4" />
                  {t("teacher_sr_at_risk.view_detail")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      </div>
    </div>
  );
}
