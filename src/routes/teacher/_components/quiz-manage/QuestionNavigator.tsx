import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, HelpCircle, Pencil } from "lucide-react";
import { PreviewCard } from "@base-ui/react/preview-card";
import { hasInvalidExpectedTime } from "./helpers";
import type { QuizQuestionAuthoring } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Sticky question navigator. Renders six orthogonal status layers (error,
 * approved, pending, unsaved, selected, focused) on separate visual channels,
 * with the colour legend in a hover popover on the title.
 *
 * Extracted from the former 3.5k-line quiz-manage.tsx; behaviour unchanged.
 */
export function QuestionNavigator({
  questions,
  selectedIds,
  dirtyIds,
  onJump,
}: {
  questions: QuizQuestionAuthoring[];
  /** Bulk-action selection, rendered as a corner tick badge. */
  selectedIds?: Set<string>;
  /** Questions with unsaved local edits, rendered as an amber ring + pencil. */
  dirtyIds?: Set<string>;
  /** Notified when a cell is clicked (so the parent can also select/focus). */
  onJump?: (questionId: string) => void;
}) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  // Suppress scroll-spy briefly after a click so the highlight doesn't
  // flicker through intermediate cards during the smooth scroll.
  const suppressSpyUntil = useRef<number>(0);

  const scrollToQuestion = useCallback(
    (id: string) => {
      const el = document.getElementById(`qcard-${id}`);
      if (!el) return;
      suppressSpyUntil.current = Date.now() + 700;
      setActiveId(id);
      onJump?.(id);
      const reduceMotion =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    },
    [onJump],
  );

  // Scroll-spy: highlight the last card whose top has scrolled above a line
  // just below the sticky header (matches the card's scroll-mt offset).
  useEffect(() => {
    if (questions.length === 0) return;
    let frame = 0;
    const recompute = () => {
      frame = 0;
      if (Date.now() < suppressSpyUntil.current) return;
      const line = 160; // ~9.5rem sticky-header clearance + a little margin
      let current: string | null = questions[0]?.id ?? null;
      for (const q of questions) {
        const el = document.getElementById(`qcard-${q.id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= line) current = q.id;
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(recompute);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    recompute();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [questions]);

  if (questions.length === 0) return null;

  // Mirrors the per-cell rule: an unsaved pre-filled default isn't an error.
  const errorCount = questions.filter(
    (q) => hasInvalidExpectedTime(q) && !(dirtyIds?.has(q.id) ?? false),
  ).length;
  const unsavedCount = dirtyIds
    ? questions.filter((q) => dirtyIds.has(q.id)).length
    : 0;

  return (
    <div className="rounded-xl border border-m3-secondary/10 bg-m3-surface-container-low p-5 shadow-glass space-y-3">
      <div className="flex items-center justify-between gap-2">
        {/* The status legend is a hover popover on the title rather than a block
            under the grid: six swatches of permanent chrome crowded the sticky
            sidebar, and it's reference material you consult once, not something
            you need on screen continuously. */}
        <PreviewCard.Root>
          <PreviewCard.Trigger
            render={
              <h2 className="flex cursor-help items-center gap-1.5 font-headline font-bold text-sm text-m3-on-surface">
                {t("teacher_quiz_manage.question_nav.title")}
                <HelpCircle
                  className="h-3.5 w-3.5 text-m3-on-surface-variant"
                  aria-hidden="true"
                />
              </h2>
            }
          />
          <PreviewCard.Portal>
            <PreviewCard.Positioner side="right" align="start" sideOffset={10}>
              <PreviewCard.Popup
                className={cn(
                  // z-40 to clear the sticky top bar (z-20); the sidebar is the
                  // only thing above it (see frontend/AGENTS.md).
                  "z-40 w-64 rounded-xl border border-m3-outline-variant/40 bg-m3-surface p-4 shadow-2xl outline-none",
                  "transition-all duration-150",
                  "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
                  "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
                )}
              >
                <p className="mb-2.5 font-headline text-sm font-bold text-m3-on-surface">
                  {t("teacher_quiz_manage.question_nav.legend_title")}
                </p>
                {/* Single column at a readable size — the old 2-col 10px grid
                    was the unreadable part. */}
                <ul className="space-y-2 text-sm text-m3-on-surface-variant">
                  <li className="flex items-center gap-2.5">
                    <span className="h-4 w-4 shrink-0 rounded bg-m3-primary" />
                    {t("teacher_quiz_manage.question_nav.status_approved")}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="relative h-4 w-4 shrink-0 rounded bg-m3-surface-container-high">
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                    {t("teacher_quiz_manage.question_nav.status_pending")}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-4 w-4 shrink-0 rounded bg-red-600" />
                    {t("teacher_quiz_manage.question_nav.status_error")}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-4 w-4 shrink-0 rounded bg-m3-surface-container-high ring-2 ring-amber-500" />
                    {t("teacher_quiz_manage.question_nav.status_unsaved")}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="h-4 w-4 shrink-0 rounded bg-m3-surface-container-high ring-2 ring-offset-1 ring-m3-primary" />
                    {t("teacher_quiz_manage.question_nav.status_focused")}
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="relative h-4 w-4 shrink-0 rounded bg-m3-surface-container-high">
                      <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-m3-secondary" />
                    </span>
                    {t("teacher_quiz_manage.question_nav.status_selected")}
                  </li>
                </ul>
              </PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
        {/* Roll-up counts for the two states that need action. */}
        <div className="flex items-center gap-1.5">
          {errorCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              {t("teacher_quiz_manage.question_nav.error_count", {
                count: errorCount,
              })}
            </span>
          )}
          {unsavedCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {t("teacher_quiz_manage.question_nav.unsaved_count", {
                count: unsavedCount,
              })}
            </span>
          )}
        </div>
      </div>
      {/* Numbered grid — reuses the student QuizSummaryCard box design.
          Inner-scrollable so a quiz with many questions doesn't blow out
          the sticky sidebar height. */}
      <div className="max-h-[22rem] overflow-y-auto overflow-x-hidden">
        <div className="grid grid-cols-6 gap-1.5 p-1.5">
          {questions.map((question, index) => {
            // Six orthogonal status layers, each on its own visual channel so
            // they can coexist on one cell (see QuestionNavStatus).
            const focused = question.id === activeId;
            const approved = question.review_status === "approved";
            const unsaved = dirtyIds?.has(question.id) ?? false;
            // A pre-filled-but-unsaved default is NOT an error — the value is
            // right there in the editor, it just hasn't been persisted. The
            // unsaved ring already communicates that, so flag an error only when
            // the row has no time AND there are no pending edits to save.
            const error = hasInvalidExpectedTime(question) && !unsaved;
            const selected = selectedIds?.has(question.id) ?? false;
            const pending = !approved && !error;

            // FILL is exclusive (one background per cell): error > approved >
            // pending. Error must never be masked by an approved fill, since
            // it's the state that blocks publishing.
            const fill = error
              ? "bg-red-600 text-white hover:bg-red-500"
              : approved
                ? "bg-m3-primary text-white hover:bg-m3-primary/90"
                : "bg-m3-surface-container-high text-m3-outline hover:bg-m3-surface-container-highest";

            // RING is exclusive too (focus outranks unsaved, since focus is
            // transient and needs to be unmistakable).
            const ring = focused
              ? "ring-2 ring-offset-1 ring-m3-primary scale-105 z-10"
              : unsaved
                ? "ring-2 ring-amber-500"
                : "";

            const statusWords = [
              error
                ? t("teacher_quiz_manage.question_nav.status_error")
                : approved
                  ? t("teacher_quiz_manage.question_nav.status_approved")
                  : t("teacher_quiz_manage.question_nav.status_pending"),
              unsaved
                ? t("teacher_quiz_manage.question_nav.status_unsaved")
                : t("teacher_quiz_manage.question_nav.status_saved"),
              selected
                ? t("teacher_quiz_manage.question_nav.status_selected")
                : null,
            ].filter(Boolean);

            return (
              <button
                key={question.id}
                type="button"
                onClick={() => scrollToQuestion(question.id)}
                aria-current={focused ? "location" : undefined}
                aria-label={`${index + 1}. ${statusWords.join(", ")}`}
                title={`${index + 1}. ${statusWords.join(" · ")}${
                  question.prompt_text ? `\n${question.prompt_text}` : ""
                }`}
                className={cn(
                  "aspect-square w-full flex items-center justify-center rounded-lg font-bold text-sm relative cursor-pointer",
                  "transition-all duration-150",
                  fill,
                  ring,
                )}
              >
                {index + 1}

                {/* PENDING — amber dot, top-right. Only when there's no error
                    (an error cell is already fully red; a dot would be noise). */}
                {pending && (
                  <span
                    className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-500"
                    aria-hidden="true"
                  />
                )}

                {/* ERROR — warning glyph, top-right, on top of the red fill. */}
                {error && (
                  <AlertTriangle
                    className="absolute top-0 right-0 h-2.5 w-2.5"
                    aria-hidden="true"
                  />
                )}

                {/* UNSAVED — pencil, bottom-right. Pairs with the amber ring so
                    the state reads even for colour-blind users. */}
                {unsaved && (
                  <Pencil
                    className={cn(
                      "absolute bottom-0 right-0 h-2 w-2",
                      error || approved ? "text-white" : "text-amber-600",
                    )}
                    aria-hidden="true"
                  />
                )}

                {/* SELECTED — tick badge, top-left. Distinct corner from every
                    other marker so bulk-selection never collides with status. */}
                {selected && (
                  <span
                    className="absolute -top-1 -left-1 flex h-3 w-3 items-center justify-center rounded-full bg-m3-secondary text-white shadow-sm"
                    aria-hidden="true"
                  >
                    <Check className="h-2 w-2" strokeWidth={4} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
