import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Mic,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useMyInterviewSessions } from "@/lib/api/hooks/interviews";
import { useFormatDate } from "@/lib/format/date";
import type { InterviewSessionPublic } from "@/lib/api/types";

type VerdictState =
  | "passed"
  | "not_passed"
  | "evaluating"
  | "in_progress"
  | "evaluation_failed"
  | "not_graded";

// Thesis §4.3: students see the binary verdict ONLY. A completed session whose
// async evaluation hasn't landed yet (pass_verdict === null) must read as
// "evaluating", never as a fail.
function verdictState(s: InterviewSessionPublic): VerdictState {
  if (s.status === "in_progress") return "in_progress";
  if (s.status === "failed") return "evaluation_failed";
  if (s.status === "abandoned") return "not_graded";
  if (s.pass_verdict === true) return "passed";
  if (s.pass_verdict === false) return "not_passed";
  return "evaluating";
}

const BADGE_CLASS: Record<VerdictState, string> = {
  passed: "bg-emerald-100 text-emerald-700",
  not_passed: "bg-m3-primary-fixed text-m3-primary",
  evaluating: "bg-amber-50 text-amber-700",
  in_progress: "bg-slate-100 text-slate-600",
  evaluation_failed: "bg-red-100 text-red-700",
  not_graded: "bg-slate-100 text-slate-600",
};

function SessionRow({ item }: { item: InterviewSessionPublic }) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const state = verdictState(item);
  const title = item.interview_title ?? t("me_interviews.untitled");

  return (
    <Link
      to="/me/interviews/$sessionId"
      params={{ sessionId: item.session_id }}
      className="group flex items-center gap-4 p-4 rounded-xl bg-card ghost-border transition-all duration-200 outline-none hover:bg-m3-surface-container hover:ghost-border hover:shadow-sm focus-visible:ring-2 focus-visible:ring-m3-primary/40 cursor-pointer"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-m3-primary to-m3-secondary flex items-center justify-center shrink-0">
        <Mic className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h3 className="font-headline font-semibold text-sm text-m3-on-surface line-clamp-1 leading-snug flex-1 transition-colors group-hover:text-m3-primary">
            {title}
          </h3>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${BADGE_CLASS[state]}`}
          >
            {state === "passed" && <CheckCircle2 className="h-3 w-3" />}
            {state === "evaluating" && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {state === "evaluation_failed" && <XCircle className="h-3 w-3" />}
            {state === "not_graded" && <MinusCircle className="h-3 w-3" />}
            {t(`me_interviews.state.${state}`)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-m3-on-surface-variant">
          <span>{t("me_interviews.attempt", { n: item.attempt_number })}</span>
          <span>{formatDate(item.started_at)}</span>
        </div>
      </div>
      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-m3-outline transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-m3-primary"
      />
    </Link>
  );
}

export default function MyInterviewsPage() {
  const { t } = useTranslation();
  const list = useMyInterviewSessions();
  const items = list.data ?? [];

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8">
      <header className="pt-2">
        <h1 className="font-headline font-black text-3xl sm:text-4xl text-m3-on-surface tracking-tight">
          {t("me_interviews.title")}
        </h1>
        <p className="mt-2 text-m3-on-surface-variant text-sm sm:text-base max-w-xl">
          {t("me_interviews.subtitle")}
        </p>
      </header>

      <section className="space-y-4">
        <SectionHeader
          title={t("me_interviews.section_title")}
          subtitle={t("me_interviews.n_sessions", { count: items.length })}
        />

        {list.isError && (
          <EmptyState
            icon={AlertCircle}
            title={t("me_interviews.load_failed_title")}
            description={t("me_interviews.load_failed_body")}
            cta={
              <Button
                variant="outline"
                onClick={() => list.refetch()}
                className="cursor-pointer"
              >
                {t("me_interviews.retry")}
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
            title={t("me_interviews.empty_title")}
            description={t("me_interviews.empty_body")}
            cta={
              <Link
                to="/courses"
                className="text-sm font-semibold text-m3-primary hover:underline"
              >
                {t("me_interviews.empty_cta")}
              </Link>
            }
          />
        )}

        {!list.isLoading && !list.isError && items.length > 0 && (
          <div className="space-y-2">
            {items.map((s) => (
              <SessionRow key={s.session_id} item={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
