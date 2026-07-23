import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Flame,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { useCardsDue } from "@/lib/api/hooks/spaced-repetition";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { CardDue } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function useRelativeDue() {
  const { t } = useTranslation();
  return (dueAt: string): { label: string; overdue: boolean } => {
    const now = Date.now();
    const due = new Date(dueAt).getTime();
    const diffMs = due - now;
    if (diffMs <= 0)
      return { label: t("study_cards_due.due_now"), overdue: true };
    const minutes = Math.round(diffMs / 60_000);
    if (minutes < 60) {
      return {
        label: t("study_cards_due.minutes_left", { count: minutes }),
        overdue: false,
      };
    }
    const hours = Math.round(minutes / 60);
    if (hours < 24) {
      return {
        label: t("study_cards_due.hours_left", { count: hours }),
        overdue: false,
      };
    }
    const days = Math.round(hours / 24);
    return {
      label: t("study_cards_due.days_left", { count: days }),
      overdue: false,
    };
  };
}

function CardDueRow({ card }: { card: CardDue }) {
  const { t } = useTranslation();
  const relativeDue = useRelativeDue();
  const { label: dueLabel, overdue } = relativeDue(card.due_at);
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4 flex items-center gap-4 hover:bg-m3-surface-container-low transition-colors">
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          overdue ? "bg-red-100" : "bg-m3-primary-fixed",
        )}
      >
        {overdue ? (
          <Flame className="h-5 w-5 text-red-600" />
        ) : (
          <RefreshCw className="h-5 w-5 text-m3-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-m3-on-surface truncate">
            {card.lesson_title}
          </p>
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border",
              overdue
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-m3-secondary-fixed text-m3-primary border-transparent",
            )}
          >
            {dueLabel}
          </span>
        </div>
        <p className="text-xs text-m3-on-surface-variant mt-0.5 flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {t("study_cards_due.ef_label")} {card.ef.toFixed(2)}
          </span>
          {typeof card.last_q === "number" && (
            <span>{t("study_cards_due.last_q", { q: card.last_q })}</span>
          )}
        </p>
      </div>
      <Clock className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
    </div>
  );
}

export default function StudyCardsDuePage() {
  const { t } = useTranslation();
  const { items, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } =
    useCardsDue({ limit: 20 });

  const overdueCount = items.filter(
    (c) => new Date(c.due_at).getTime() <= Date.now(),
  ).length;

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-3xl mx-auto pb-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/sr"
            className="p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-colors cursor-pointer"
            aria-label={t("study_cards_due.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <SectionHeader
            title={t("study_cards_due.title")}
            subtitle={
              isLoading
                ? t("study_cards_due.loading")
                : items.length === 0
                  ? t("study_cards_due.empty_subtitle")
                  : `${t("study_cards_due.n_cards", { count: items.length })}${
                      overdueCount > 0
                        ? t("study_cards_due.n_overdue_suffix", {
                            count: overdueCount,
                          })
                        : ""
                    }`
            }
          />
        </div>

        <InfiniteList<CardDue>
          items={items}
          hasNextPage={hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isLoading}
          className="space-y-3"
          keyOf={(card) => card.question_id}
          renderItem={(card) => <CardDueRow card={card} />}
          empty={
            <EmptyState
              icon={Inbox}
              title={t("study_cards_due.empty_title")}
              description={t("study_cards_due.empty_body")}
              cta={
                <Link to="/dashboard/sr">
                  <Button variant="default" className="cursor-pointer">
                    {t("study_cards_due.back_to_dashboard")}
                  </Button>
                </Link>
              }
            />
          }
        />
      </div>
    </div>
  );
}
