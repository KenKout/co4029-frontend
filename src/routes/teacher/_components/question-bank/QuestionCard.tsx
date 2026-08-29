import { useTranslation } from "react-i18next";
import { ChevronDown, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuestionCardActions } from "./QuestionCardActions";
import { QuestionCardBody } from "./QuestionCardBody";
import { QuestionCardMeta } from "./QuestionCardMeta";
import type { QuestionCardProps } from "./types";

/**
 * One question row in the bank: selection checkbox, drag handle + position
 * number, prompt + metadata, status/action controls and the expandable
 * answer/edit body.
 *
 * Extracted verbatim from the former 2.4k-line question-bank.tsx; behaviour,
 * markup and class names unchanged.
 */
export function QuestionCard(props: QuestionCardProps) {
  const {
    q,
    expanded,
    editing,
    deleting,
    saving,
    selected,
    onToggleSelect,
    isPublished,
    compact,
    dndEnabled,
    dragging,
    showLineBefore,
    showLineAfter,
    onDragStartCard,
    onDragOverCard,
    onDragEndCard,
    onDropCard,
  } = props;
  const { t } = useTranslation();

  // Drag is enabled only outside edit mode (so text selection in the editor
  // isn't hijacked) and only when the parent allows it (flat, unfiltered list).
  const canDrag = dndEnabled && !editing && !deleting;

  return (
    // No `aria-selected` here. It used to carry `expanded`, which was wrong
    // twice over: the attribute is not valid on an implicit `listitem` role
    // (axe flags aria-allowed-attr), and its value described the accordion
    // rather than selection — while this card genuinely does have a selected
    // state, exposed through its checkbox. Expansion is already announced
    // correctly by `aria-expanded` on the toggle button below.
    <li
      onDragOver={(e) => {
        if (!canDrag) return;
        e.preventDefault();
        // Which half of the card is the cursor in? Top half → insert above,
        // bottom half → insert below. Drives the between-cards insertion line.
        const rect = e.currentTarget.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        onDragOverCard(before);
      }}
      onDrop={(e) => {
        if (!canDrag) return;
        e.preventDefault();
        onDropCard();
      }}
      className={cn(
        // relative so the absolutely-positioned insertion lines anchor here.
        // `group` drives the hover treatments on the prompt text and the action
        // column below. NOTE: this element owns the transforms (delete
        // slide-out, hover lift), so it must never carry a keyframe animation —
        // `fade-in-up ... both` pins transform forever and would silently
        // cancel both. Entrance belongs on an inner wrapper.
        "group relative rounded-xl border bg-m3-surface origin-top overflow-hidden transition-all duration-300 ease-in motion-reduce:transition-none",
        selected
          ? "border-m3-primary/50 ring-1 ring-m3-primary/30"
          : "border-m3-outline-variant/20",
        dragging && "opacity-40",
        // Hover lift only when the card is at rest: a card that drifts under
        // the cursor while you are editing it is worse than no affordance.
        !editing &&
          !deleting &&
          "hover:-translate-y-0.5 hover:border-m3-primary/40 hover:shadow-editorial",
        deleting
          ? "opacity-0 scale-95 -translate-x-4 max-h-0 !p-0 !my-0 border-transparent"
          : "max-h-[1200px]",
      )}
    >
      {/* Between-cards insertion line — marks exactly which gap a drop lands
          in. Anchored just inside the card edge (the card has overflow-hidden
          for the delete animation, so a line in the outer gap would be
          clipped). A glow makes it read as sitting in the gap. */}
      {showLineBefore && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-2 right-2 z-10 h-0.5 rounded-full bg-m3-primary shadow-[0_0_0_2px_rgba(103,80,164,0.25)]"
        />
      )}
      {showLineAfter && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-2 right-2 z-10 h-0.5 rounded-full bg-m3-primary shadow-[0_0_0_2px_rgba(103,80,164,0.25)]"
        />
      )}
      {/* Collapsed header row */}
      <div className={cn("flex items-start gap-2", compact ? "p-2" : "p-3")}>
        {/* Selection checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          disabled={isPublished}
          aria-label={t("teacher_interview_config.qbank.bulk.select_one")}
          className="mt-1 h-4 w-4 shrink-0 rounded border-m3-outline-variant/60 text-m3-primary focus:ring-2 focus:ring-m3-primary/30 cursor-pointer"
        />
        {/* Drag handle + number + reorder */}
        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
          {canDrag && (
            <span
              draggable
              onDragStart={onDragStartCard}
              onDragEnd={onDragEndCard}
              title={t("teacher_interview_config.qbank.drag_hint")}
              aria-label={t("teacher_interview_config.qbank.drag_hint")}
              className="text-m3-on-surface-variant/50 hover:text-m3-primary cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </span>
          )}
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-m3-primary-fixed text-xs font-extrabold tabular-nums text-m3-primary"
            aria-hidden="true"
          >
            {String(props.index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Prompt + metadata */}
        <QuestionCardPrompt
          q={q}
          expanded={expanded}
          compact={compact}
          saving={saving}
          isPublished={isPublished}
          outcomeOptions={props.outcomeOptions}
          moduleTitles={props.moduleTitles}
          onToggleExpand={props.onToggleExpand}
          onSetOutcome={props.onSetOutcome}
        />

        {/* Right-side controls: status + actions */}
        <QuestionCardActions
          q={q}
          index={props.index}
          total={props.total}
          expanded={expanded}
          editing={editing}
          saving={saving}
          reordering={props.reordering}
          isPublished={isPublished}
          banking={props.banking}
          alreadyInBank={props.alreadyInBank}
          onSetStatus={props.onSetStatus}
          onToggleExpand={props.onToggleExpand}
          onBeginEdit={props.onBeginEdit}
          onDelete={props.onDelete}
          onMoveToTop={props.onMoveToTop}
          onMoveToBottom={props.onMoveToBottom}
          onAddToBank={props.onAddToBank}
        />
      </div>

      {/* Expanded / editing body — slides open/closed via a grid-rows
          transition (0fr → 1fr) so "View answer"/"Hide answer" animates up and
          down instead of snapping. */}
      <QuestionCardBody
        q={q}
        expanded={expanded}
        editing={editing}
        editingText={props.editingText}
        editingAnswer={props.editingAnswer}
        saving={saving}
        onCancelEdit={props.onCancelEdit}
        onSaveEdit={props.onSaveEdit}
        onChangeEditingText={props.onChangeEditingText}
        onChangeEditingAnswer={props.onChangeEditingAnswer}
      />
    </li>
  );
}

/** Prompt text, the answer toggle, and the metadata row beneath them. */
function QuestionCardPrompt({
  q,
  expanded,
  compact,
  saving,
  isPublished,
  outcomeOptions,
  moduleTitles,
  onToggleExpand,
  onSetOutcome,
}: Pick<
  QuestionCardProps,
  | "q"
  | "expanded"
  | "compact"
  | "saving"
  | "isPublished"
  | "outcomeOptions"
  | "moduleTitles"
  | "onToggleExpand"
  | "onSetOutcome"
>) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <p
        className={cn(
          "text-m3-on-surface font-semibold leading-relaxed",
          // Recolours with the row so the whole card reads as one hover
          // target rather than a set of separately-hoverable pieces.
          "transition-colors group-hover:text-m3-primary",
          // The prompt is the content — give it more weight than its
          // surrounding chrome. Slightly smaller in compact mode.
          compact ? "text-sm" : "text-[15px]",
        )}
      >
        {q.prompt_text}
      </p>
      {/* Explicit answer toggle — a labelled button reads far clearer than
          a bare chevron, so it's obvious this reveals the model answer. */}
      <Button
        type="button"
        variant={expanded ? "secondary" : "outline"}
        size="sm"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        aria-controls={`qbank-body-${q.id}`}
        className="mt-1 h-7 gap-1.5 text-xs"
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform motion-reduce:transition-none",
            expanded ? "rotate-0" : "-rotate-90",
          )}
          aria-hidden="true"
        />
        {expanded
          ? t("teacher_interview_config.qbank.hide_answer")
          : t("teacher_interview_config.qbank.view_answer")}
      </Button>

      {/* Metadata row (real fields only). Hidden in compact mode unless
          the card is expanded, so triage lists stay dense. */}
      {(!compact || expanded) && (
        <QuestionCardMeta
          q={q}
          outcomeOptions={outcomeOptions}
          saving={saving}
          isPublished={isPublished}
          onSetOutcome={onSetOutcome}
          moduleTitles={moduleTitles}
        />
      )}
    </div>
  );
}
