import { ImportFromCoursePanel } from "./learning-outcomes/ImportFromCoursePanel";
import { DeleteConfirm } from "./learning-outcomes/DeleteConfirm";
import {
  OutcomesEmptyState,
  OutcomesHeader,
} from "./learning-outcomes/OutcomesHeader";
import { OutcomeRow } from "./learning-outcomes/OutcomeRow";
import {
  CoverageExplainer,
  OutcomesSummaryStrip,
} from "./learning-outcomes/OutcomesSummary";
import type { LearningOutcomesProps } from "./learning-outcomes/types";
import { useLearningOutcomes } from "./learning-outcomes/use-learning-outcomes";

/**
 * Interview learning-outcomes section: coverage summary, course importer and
 * the per-outcome rows with their inline weight stepper.
 *
 * State, mutations and derived counts live in `./learning-outcomes/`; this file
 * is the composition shell.
 */
export function LearningOutcomes({
  configId,
  courseId,
  outcomes,
  questions,
  minOutcomesToPass,
  onViewQuestions,
  status,
}: LearningOutcomesProps) {
  const controller = useLearningOutcomes({
    configId,
    courseId,
    outcomes,
    questions,
  });
  const {
    t,
    sorted,
    questionCountByOutcome,
    coveredCount,
    uncoveredCount,
    totalAssigned,
    savingId,
    confirmDelete,
    setConfirmDelete,
    importing,
    setImporting,
    selectedImport,
    importBusy,
    liveRegionRef,
    courseOutcomes,
    deleteOutcome,
    importableOutcomes,
    hasOutcomes,
    openImport,
    toggleImportSelection,
    submitImport,
    setWeight,
    doDelete,
  } = controller;
  /** Published interviews judge answers against these outcomes — read-only. */
  const frozen = status === "published";
  const frozenReason = t("teacher_interview_config.published_freeze.tooltip");

  return (
    <section className="rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-low/40 p-5 lg:p-6 space-y-4">
      <OutcomesHeader
        showActions={hasOutcomes && !importing}
        showImportButton={(courseOutcomes?.length ?? 0) > 0}
        onOpenImport={openImport}
        disabled={frozen}
        disabledReason={frozenReason}
        t={t}
      />

      {/* Import-from-course picker: multi-select the course-level outcomes to
          copy in. Already-imported ones are filtered out upstream. */}
      {importing && (
        <ImportFromCoursePanel
          outcomes={importableOutcomes}
          selected={selectedImport}
          onToggle={toggleImportSelection}
          busy={importBusy}
          onCancel={() => setImporting(false)}
          onConfirm={() => void submitImport()}
        />
      )}

      {/* Status summary (real, derived counts) */}
      {hasOutcomes && (
        <OutcomesSummaryStrip
          outcomeCount={sorted.length}
          totalAssigned={totalAssigned}
          uncoveredCount={uncoveredCount}
          t={t}
        />
      )}

      {hasOutcomes && (
        <CoverageExplainer
          coveredCount={coveredCount}
          outcomeCount={sorted.length}
          minOutcomesToPass={minOutcomesToPass}
          t={t}
        />
      )}

      {!hasOutcomes ? (
        !importing && (
          <OutcomesEmptyState
            hasImportableOutcomes={importableOutcomes.length > 0}
            onOpenImport={openImport}
            disabled={frozen}
            disabledReason={frozenReason}
            t={t}
          />
        )
      ) : (
        <ul className="space-y-2" role="list">
          {sorted.map((o, idx) => (
            <OutcomeRow
              key={o.id}
              outcome={o}
              index={idx}
              questionCount={questionCountByOutcome.get(o.id) ?? 0}
              saving={savingId === o.id}
              disabled={frozen}
              disabledReason={frozenReason}
              handlers={{
                onViewQuestions,
                onRequestDelete: setConfirmDelete,
                onChangeWeight: (outcome, next) =>
                  void setWeight(outcome, next),
              }}
              t={t}
            />
          ))}
        </ul>
      )}

      {/* Delete confirmation (surfaces real assigned-question count) */}
      {confirmDelete && (
        <DeleteConfirm
          outcome={confirmDelete}
          assignedCount={questionCountByOutcome.get(confirmDelete.id) ?? 0}
          pending={deleteOutcome.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => void doDelete(confirmDelete)}
        />
      )}

      <div ref={liveRegionRef} aria-live="polite" className="sr-only" />
    </section>
  );
}

export default LearningOutcomes;
