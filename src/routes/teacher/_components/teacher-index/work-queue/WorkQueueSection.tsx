import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, LayoutList, UserRound } from "lucide-react";

import { SectionHeader } from "@/components/ui/section-header";
import { Tabs, type TabDef } from "@/components/ui/tabs";
import type {
  PriorityTask,
  ReviewQueueKind,
  StudentNeedingAttention,
} from "@/lib/api/hooks/teacher-courses";

import type { ReviewCandidate, TranslateFn } from "../types";
import { PriorityList } from "./PriorityList";
import { ReviewList } from "./ReviewList";
import { StudentList } from "./StudentList";

type QueueTab = "all" | "people" | "content";

/**
 * The teacher's single work queue.
 *
 * Replaces three stacked sections — Priority Today, Students needing
 * attention, and Needs your review — which between them rendered the same
 * rows two and three times over. The priority feed is built FROM the other
 * two (`list_priority_tasks` reads the same risk rows and the same review
 * counts), so on a populated dashboard seven of its eight rows appeared
 * again verbatim further down the page. The page was roughly twice as long
 * as its content, which is what made it read as mostly empty space.
 *
 * The three views are now tabs over one queue:
 *
 *   - All     — the server's ranked feed, mixing people and content
 *   - People  — every flagged student, not just those that made the cut
 *   - Content — the review backlog, with its drill-down still intact
 *
 * "All" is capped by the server; the other two are complete. That is the
 * point of keeping them: the feed answers "what first", the tabs answer
 * "show me all of them".
 */
export function WorkQueueSection({
  tasks,
  tasksLoading,
  students,
  studentsLoading,
  reviewItems,
  t,
}: {
  tasks: PriorityTask[];
  tasksLoading: boolean;
  students: StudentNeedingAttention[];
  studentsLoading: boolean;
  reviewItems: ReviewCandidate[];
  t: TranslateFn;
}) {
  const [tab, setTab] = useState<QueueTab>("all");
  const [focus, setFocus] = useState<{
    kind: ReviewQueueKind;
    nonce: number;
  } | null>(null);

  /**
   * A grouped row in the All feed ("53 quiz questions awaiting review") is a
   * shortcut into its category. Before the merge this scrolled the page to
   * a separate section; now it switches tab and expands the category in
   * place, which is the same intent without the scroll.
   *
   * The nonce makes a repeat click on the same category re-fire — without
   * it, collapsing the row and clicking again would be inert.
   */
  const openContent = useCallback((kind: ReviewQueueKind) => {
    setFocus((prev) => ({ kind, nonce: (prev?.nonce ?? 0) + 1 }));
    setTab("content");
  }, []);

  const contentCount = useMemo(
    () => reviewItems.reduce((sum, item) => sum + item.count, 0),
    [reviewItems],
  );

  const isLoading = tasksLoading || studentsLoading;
  const isEmpty =
    !isLoading &&
    tasks.length === 0 &&
    students.length === 0 &&
    reviewItems.length === 0;

  const tabs: TabDef<QueueTab>[] = [
    {
      key: "all",
      label: t("teacher_dashboard.queue.tab_all"),
      icon: LayoutList,
      count: tasks.length || undefined,
    },
    {
      key: "people",
      label: t("teacher_dashboard.queue.tab_people"),
      icon: UserRound,
      count: students.length || undefined,
    },
    {
      key: "content",
      label: t("teacher_dashboard.queue.tab_content"),
      icon: ClipboardCheck,
      count: contentCount || undefined,
    },
  ];

  return (
    <section>
      <SectionHeader
        title={t("teacher_dashboard.queue.title")}
        subtitle={t("teacher_dashboard.queue.subtitle")}
      />

      {/* One empty state, not three. When there is genuinely nothing to do,
          three consecutive "all clear" cards read as a broken page rather
          than as good news. */}
      {isEmpty ? (
        <AllClear t={t} />
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl bg-card shadow-editorial ghost-border">
          <div className="border-b border-m3-outline-variant/20 px-2 pt-1">
            <Tabs
              tabs={tabs}
              value={tab}
              onChange={setTab}
              variant="outlined"
              ariaLabel={t("teacher_dashboard.queue.title")}
            />
          </div>

          {tab === "all" ? (
            <PriorityList
              tasks={tasks}
              isLoading={tasksLoading}
              onFocusReview={openContent}
              t={t}
            />
          ) : tab === "people" ? (
            <StudentList
              students={students}
              isLoading={studentsLoading}
              t={t}
            />
          ) : (
            <ReviewList reviewItems={reviewItems} focus={focus} t={t} />
          )}

          {/* A tab can be empty while the queue as a whole is not — no
              flagged students but a full review backlog, say. Saying so per
              tab beats rendering a blank panel. */}
          <EmptyTab
            tab={tab}
            tasks={tasks}
            students={students}
            reviewItems={reviewItems}
            isLoading={isLoading}
            t={t}
          />
        </div>
      )}
    </section>
  );
}

function EmptyTab({
  tab,
  tasks,
  students,
  reviewItems,
  isLoading,
  t,
}: {
  tab: QueueTab;
  tasks: PriorityTask[];
  students: StudentNeedingAttention[];
  reviewItems: ReviewCandidate[];
  isLoading: boolean;
  t: TranslateFn;
}) {
  if (isLoading) return null;
  const empty =
    (tab === "all" && tasks.length === 0) ||
    (tab === "people" && students.length === 0) ||
    (tab === "content" && reviewItems.length === 0);
  if (!empty) return null;
  return (
    <p className="px-4 py-6 text-sm text-text-muted">
      {t(`teacher_dashboard.queue.empty_${tab}`)}
    </p>
  );
}

/**
 * Nothing to do at all.
 *
 * States the good news and offers somewhere to go, rather than leaving a
 * hole the teacher has to interpret. The rail beside it still carries the
 * course list and the context numbers, so the page is never blank.
 */
function AllClear({ t }: { t: TranslateFn }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl bg-card p-5 shadow-editorial ghost-border">
      <CheckCircle2
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
      />
      <div>
        <p className="text-sm font-medium text-text-strong">
          {t("teacher_dashboard.queue.all_clear_title")}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">
          {t("teacher_dashboard.queue.all_clear_hint")}
        </p>
      </div>
    </div>
  );
}
