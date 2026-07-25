import { useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichContent } from "@/components/ui/rich-content";
import type { QuizQuestionPublic } from "@/lib/api/types";

/**
 * Per-type input UI for the student quiz attempt page.
 *
 * Maps each ``question_type`` to the right input shape:
 * - ``multiple_choice`` / ``true_false`` → option buttons (caller-supplied
 *   ``onSelectOption`` updates ``selectedOptionId``).
 * - ``short_answer`` → single-line text input bound to ``answerText``.
 * - ``fill_blank`` → drag-and-drop word bank with N drop slots; the
 *   stem's ``___`` placeholders are split out and rendered inline,
 *   and the parent receives a JSON-stringified array via
 *   ``onAnswerTextChange`` (matches the grader's contract).
 */
export interface QuestionRendererProps {
  question: QuizQuestionPublic;
  selectedOptionId: string | null;
  /** Free-text answer (for short_answer + fill_blank). For fill_blank
   * this is the JSON-stringified array of slot values. */
  answerText: string | null;
  disabled: boolean;
  onSelectOption: (optionId: string) => void;
  onAnswerTextChange: (value: string | null) => void;
}

export function QuestionRenderer(props: QuestionRendererProps) {
  // Cast to string: the generated schema literal predates the Phase 7 types
  // (numerical/matching/ordering), which the backend now serves.
  switch (props.question.question_type as string) {
    case "multiple_choice":
      // Phase 7: multi-select MCQ (single_answer=false) uses checkboxes and
      // submits a JSON array of chosen option ids via answerText; single-answer
      // keeps the radio-style OptionInput.
      return (props.question as { single_answer?: boolean }).single_answer ===
        false ? (
        <MultiSelectInput {...props} />
      ) : (
        <OptionInput {...props} />
      );
    case "true_false":
      return <OptionInput {...props} />;
    case "short_answer":
      return <ShortAnswerInput {...props} />;
    case "fill_blank":
      return <FillBlankInput {...props} />;
    case "numerical":
      return <NumericalInput {...props} />;
    case "matching":
      return <MatchingInput {...props} />;
    case "ordering":
      return <OrderingInput {...props} />;
    default:
      // ``code`` (and any future type) falls back to a text answer so
      // students can at least submit something.
      return <ShortAnswerInput {...props} />;
  }
}

function OptionInput({
  question,
  selectedOptionId,
  disabled,
  onSelectOption,
}: QuestionRendererProps) {
  const sortedOptions = useMemo(
    () => question.options.slice().sort((a, b) => a.position - b.position),
    [question.options],
  );
  return (
    <div className="space-y-3">
      {sortedOptions.map((option) => {
        const isSelected = selectedOptionId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              if (disabled) return;
              onSelectOption(option.id);
            }}
            className={cn(
              "w-full text-left p-5 sm:p-6 rounded-xl flex items-center gap-5 transition-all duration-200 border-2 group/opt cursor-pointer",
              isSelected
                ? "bg-m3-primary-fixed/20 border-m3-primary shadow-lg shadow-m3-primary/10 ring-2 ring-m3-primary"
                : "bg-m3-surface-container-low border-transparent hover:bg-m3-surface-container-high hover:border-m3-outline-variant/30",
            )}
          >
            <span
              className={cn(
                "w-10 h-10 shrink-0 flex items-center justify-center rounded-xl font-bold text-sm transition-colors shadow-sm",
                isSelected
                  ? "bg-m3-primary text-white"
                  : "bg-m3-surface-container-lowest text-m3-primary group-hover/opt:bg-m3-primary group-hover/opt:text-white",
              )}
            >
              {option.option_key}
            </span>
            <span
              className={cn(
                "flex-1 text-sm sm:text-base leading-snug",
                isSelected
                  ? "text-m3-primary font-semibold"
                  : "text-m3-on-surface font-medium",
              )}
            >
              <RichContent
                value={option.option_text}
                format={
                  (option as { option_format?: string | null }).option_format ??
                  "plain"
                }
                inline
              />
            </span>
            {isSelected && (
              <CheckCircle2 className="h-5 w-5 text-m3-primary shrink-0 fill-m3-primary/10" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function ShortAnswerInput({
  answerText,
  disabled,
  onAnswerTextChange,
}: QuestionRendererProps) {
  return (
    <div className="space-y-2">
      <textarea
        value={answerText ?? ""}
        onChange={(e) => onAnswerTextChange(e.target.value || null)}
        disabled={disabled}
        rows={3}
        placeholder="Type your answer..."
        className="w-full rounded-xl border-2 border-m3-outline-variant/30 bg-m3-surface-container-lowest px-4 py-3 text-base text-m3-on-surface focus:outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Short answer input"
      />
    </div>
  );
}

/**
 * Drag-and-drop word bank for fill_blank.
 *
 * Strategy:
 * 1. Split the stem on three-or-more underscores. Render the static
 *    fragments inline with drop slots between them.
 * 2. The word bank lists distinct candidate strings. To avoid leaking
 *    the answer key (which the public schema deliberately omits), the
 *    bank is built from synthesized hash distractors PLUS the slot
 *    values the student has already placed. We seed the bank from
 *    ``question.options`` if the backend ever decides to expose
 *    distractors there; otherwise we fall back to "Word 1..N".
 * 3. Slots are mutated via dragstart/dragover/drop on plain HTML5 DnD
 *    so we don't pull in @dnd-kit just for this.
 *
 * The stem must contain at least one ``___`` placeholder. If none are
 * found we degrade to a comma-separated list of N text inputs (where N
 * is inferred from the option count or defaults to 1).
 */
function FillBlankInput({
  question,
  answerText,
  disabled,
  onAnswerTextChange,
}: QuestionRendererProps) {
  const segments = useMemo(
    () => splitStemByBlanks(question.prompt_text ?? ""),
    [question.prompt_text],
  );
  const blankCount = Math.max(0, segments.length - 1);
  const slots: Array<string | null> = useMemo(() => {
    if (blankCount === 0) return [];
    let parsed: Array<string | null> = Array(blankCount).fill(null);
    if (answerText) {
      try {
        const data = JSON.parse(answerText);
        if (Array.isArray(data)) {
          parsed = Array.from({ length: blankCount }, (_, i) => {
            const value = data[i];
            return typeof value === "string" && value ? value : null;
          });
        }
      } catch {
        // Not JSON — leave slots empty.
      }
    }
    return parsed;
  }, [answerText, blankCount]);

  const wordBank: string[] = useMemo(() => {
    const fromOptions = question.options
      .map((opt) => opt.option_text)
      .filter((text) => typeof text === "string" && text.length > 0);
    if (fromOptions.length >= blankCount && fromOptions.length > 0) {
      return fromOptions;
    }
    return Array.from({ length: blankCount }, (_, i) => `Word ${i + 1}`);
  }, [question.options, blankCount]);

  const draggingFromSlotRef = useRef<number | null>(null);
  const draggingWordRef = useRef<string | null>(null);

  function commitSlots(next: Array<string | null>) {
    onAnswerTextChange(JSON.stringify(next.map((value) => value ?? "")));
  }

  function placeAt(index: number, word: string) {
    if (disabled) return;
    const next = [...slots];
    // If the word was already in another slot, swap; otherwise just place.
    const fromSlot = next.indexOf(word);
    if (fromSlot >= 0 && fromSlot !== index) {
      next[fromSlot] = next[index];
    }
    next[index] = word;
    commitSlots(next);
  }

  function clearSlot(index: number) {
    if (disabled) return;
    const next = [...slots];
    next[index] = null;
    commitSlots(next);
  }

  if (blankCount === 0) {
    // No ``___`` placeholders found — fall back to a single textarea.
    return (
      <ShortAnswerInput
        question={question}
        answerText={answerText}
        selectedOptionId={null}
        disabled={disabled}
        onSelectOption={() => {}}
        onAnswerTextChange={onAnswerTextChange}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-sm sm:text-base leading-loose text-m3-on-surface bg-m3-surface-container-lowest rounded-xl p-5">
        {segments.map((segment, i) => (
          <span key={i}>
            {segment}
            {i < blankCount && (
              <DropSlot
                index={i}
                value={slots[i]}
                disabled={disabled}
                onDrop={(word) => {
                  draggingFromSlotRef.current = null;
                  draggingWordRef.current = null;
                  placeAt(i, word);
                }}
                onClear={() => clearSlot(i)}
                onDragStartFromSlot={() => {
                  draggingFromSlotRef.current = i;
                  draggingWordRef.current = slots[i];
                }}
              />
            )}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Word bank
        </div>
        <div className="flex flex-wrap gap-2">
          {wordBank.map((word) => {
            const used = slots.includes(word);
            return (
              <button
                key={word}
                type="button"
                draggable={!disabled && !used}
                onDragStart={(e) => {
                  if (used || disabled) {
                    e.preventDefault();
                    return;
                  }
                  draggingFromSlotRef.current = null;
                  draggingWordRef.current = word;
                  e.dataTransfer.setData("text/plain", word);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => {
                  if (used || disabled) return;
                  // Click-to-place: drop into the first empty slot.
                  const firstEmpty = slots.findIndex((s) => s === null);
                  if (firstEmpty >= 0) placeAt(firstEmpty, word);
                }}
                disabled={used || disabled}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 cursor-grab active:cursor-grabbing",
                  used
                    ? "bg-m3-surface-container-low text-m3-on-surface-variant border-transparent line-through opacity-50 cursor-not-allowed"
                    : "bg-m3-secondary-fixed/40 text-m3-on-surface border-m3-secondary/30 hover:bg-m3-secondary-fixed/60 hover:border-m3-secondary",
                )}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface DropSlotProps {
  index: number;
  value: string | null;
  disabled: boolean;
  onDrop: (word: string) => void;
  onClear: () => void;
  onDragStartFromSlot: () => void;
}

function DropSlot({
  index: _index,
  value,
  disabled,
  onDrop,
  onClear,
  onDragStartFromSlot,
}: DropSlotProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setHovered(true);
      }}
      onDragLeave={() => setHovered(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setHovered(false);
        const word = e.dataTransfer.getData("text/plain");
        if (word) onDrop(word);
      }}
      className={cn(
        "inline-flex items-center align-middle gap-1 mx-1 px-3 min-w-[6rem] min-h-[2rem] rounded-lg border-2 border-dashed transition-all",
        value
          ? "bg-m3-primary-fixed/30 border-m3-primary border-solid text-m3-primary font-semibold"
          : hovered
            ? "bg-m3-secondary-fixed/30 border-m3-secondary"
            : "bg-m3-surface-container-low border-m3-outline-variant/40",
      )}
    >
      {value ? (
        <>
          <span
            draggable={!disabled}
            onDragStart={(e) => {
              if (disabled) {
                e.preventDefault();
                return;
              }
              onDragStartFromSlot();
              e.dataTransfer.setData("text/plain", value);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            {value}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear blank"
              className="ml-1 text-m3-primary/60 hover:text-m3-primary text-xs leading-none"
            >
              ×
            </button>
          )}
        </>
      ) : (
        <span className="text-m3-on-surface-variant text-xs italic select-none">
          drop here
        </span>
      )}
    </span>
  );
}

/** Phase 7: multi-select MCQ. Checkboxes; submits a JSON array of the chosen
 * option ids via answerText (the grader's multi-select contract). */
function MultiSelectInput({
  question,
  answerText,
  disabled,
  onAnswerTextChange,
}: QuestionRendererProps) {
  const sortedOptions = useMemo(
    () => question.options.slice().sort((a, b) => a.position - b.position),
    [question.options],
  );
  const chosen = useMemo<string[]>(() => {
    if (!answerText) return [];
    try {
      const data = JSON.parse(answerText);
      return Array.isArray(data) ? data.map((v) => String(v)) : [];
    } catch {
      return [];
    }
  }, [answerText]);

  function toggle(optionId: string) {
    if (disabled) return;
    const next = chosen.includes(optionId)
      ? chosen.filter((id) => id !== optionId)
      : [...chosen, optionId];
    onAnswerTextChange(next.length > 0 ? JSON.stringify(next) : null);
  }

  return (
    <div className="space-y-3">
      {sortedOptions.map((option) => {
        const isSelected = chosen.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            aria-pressed={isSelected}
            className={cn(
              "w-full text-left p-5 sm:p-6 rounded-xl flex items-center gap-5 transition-all duration-200 border-2 group/opt cursor-pointer",
              isSelected
                ? "bg-m3-primary-fixed/20 border-m3-primary shadow-lg shadow-m3-primary/10 ring-2 ring-m3-primary"
                : "bg-m3-surface-container-low border-transparent hover:bg-m3-surface-container-high hover:border-m3-outline-variant/30",
            )}
          >
            <span
              className={cn(
                "w-6 h-6 shrink-0 flex items-center justify-center rounded-md border-2 transition-colors",
                isSelected
                  ? "bg-m3-primary border-m3-primary text-white"
                  : "bg-m3-surface-container-lowest border-m3-outline-variant",
              )}
            >
              {isSelected && <CheckCircle2 className="h-4 w-4" />}
            </span>
            <span
              className={cn(
                "flex-1 text-sm sm:text-base leading-snug",
                isSelected
                  ? "text-m3-primary font-semibold"
                  : "text-m3-on-surface font-medium",
              )}
            >
              <RichContent
                value={option.option_text}
                format={
                  (option as { option_format?: string | null }).option_format ??
                  "plain"
                }
                inline
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Phase 7: numerical answer. Single number input; submits the raw string
 * (the grader parses + compares within tolerance). */
function NumericalInput({
  answerText,
  disabled,
  onAnswerTextChange,
}: QuestionRendererProps) {
  return (
    <div className="space-y-2 max-w-xs">
      <input
        type="number"
        inputMode="decimal"
        value={answerText ?? ""}
        onChange={(e) => onAnswerTextChange(e.target.value || null)}
        disabled={disabled}
        placeholder="0"
        className="w-full rounded-xl border-2 border-m3-outline-variant/30 bg-m3-surface-container-lowest px-4 py-3 text-base text-m3-on-surface focus:outline-none focus:border-m3-primary focus:ring-2 focus:ring-m3-primary/20 disabled:opacity-50 disabled:cursor-not-allowed tabular-nums"
        aria-label="Numerical answer input"
      />
    </div>
  );
}

/** Phase 7: matching. The backend serves ``match_prompts`` (left column, in
 * order) + ``match_choices`` (right values, shuffled — pairing not implied).
 * Each prompt gets a dropdown of the choices; submits ``{prompt: chosen}`` as
 * JSON (the grader's ``{left: chosen_right}`` contract). */
function MatchingInput({
  question,
  answerText,
  disabled,
  onAnswerTextChange,
}: QuestionRendererProps) {
  const q = question as unknown as {
    match_prompts?: string[] | null;
    match_choices?: string[] | null;
  };
  const prompts = useMemo(() => q.match_prompts ?? [], [q.match_prompts]);
  const choices = useMemo(() => q.match_choices ?? [], [q.match_choices]);

  const selected = useMemo<Record<string, string>>(() => {
    if (!answerText) return {};
    try {
      const data = JSON.parse(answerText);
      return data && typeof data === "object"
        ? (data as Record<string, string>)
        : {};
    } catch {
      return {};
    }
  }, [answerText]);

  function choose(prompt: string, choice: string) {
    if (disabled) return;
    const next = { ...selected };
    if (choice) next[prompt] = choice;
    else delete next[prompt];
    onAnswerTextChange(
      Object.keys(next).length > 0 ? JSON.stringify(next) : null,
    );
  }

  if (prompts.length === 0) {
    return (
      <ShortAnswerInput
        {...({
          question,
          answerText,
          disabled,
          onAnswerTextChange,
          selectedOptionId: null,
          onSelectOption: () => {},
        } as QuestionRendererProps)}
      />
    );
  }

  return (
    <div className="space-y-3">
      {prompts.map((prompt, i) => (
        <div
          key={`${prompt}-${i}`}
          className="flex items-center gap-3 rounded-xl border-2 border-m3-outline-variant/20 bg-m3-surface-container-lowest p-3"
        >
          <span className="flex-1 text-sm sm:text-base text-m3-on-surface font-medium min-w-0">
            {prompt}
          </span>
          <span className="text-m3-on-surface-variant shrink-0">→</span>
          <select
            value={selected[prompt] ?? ""}
            onChange={(e) => choose(prompt, e.target.value)}
            disabled={disabled}
            className="shrink-0 max-w-[45%] rounded-lg border-2 border-m3-outline-variant/30 bg-m3-surface px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:border-m3-primary disabled:opacity-50"
            aria-label={`Match for ${prompt}`}
          >
            <option value="">…</option>
            {choices.map((choice, j) => (
              <option key={`${choice}-${j}`} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

/** Phase 7: ordering. The backend serves ``ordering_items`` (shuffled). The
 * student reorders them (move up/down); submits the JSON array in chosen order
 * (the grader compares against the hidden correct sequence). */
function OrderingInput({
  question,
  answerText,
  disabled,
  onAnswerTextChange,
}: QuestionRendererProps) {
  const q = question as unknown as { ordering_items?: string[] | null };
  const initial = useMemo(() => q.ordering_items ?? [], [q.ordering_items]);

  const order = useMemo<string[]>(() => {
    if (answerText) {
      try {
        const data = JSON.parse(answerText);
        if (Array.isArray(data) && data.length === initial.length) {
          return data.map((v) => String(v));
        }
      } catch {
        // fall through to initial
      }
    }
    return initial;
  }, [answerText, initial]);

  function commit(next: string[]) {
    onAnswerTextChange(JSON.stringify(next));
  }

  function move(index: number, dir: -1 | 1) {
    if (disabled) return;
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  }

  if (initial.length === 0) {
    return (
      <ShortAnswerInput
        {...({
          question,
          answerText,
          disabled,
          onAnswerTextChange,
          selectedOptionId: null,
          onSelectOption: () => {},
        } as QuestionRendererProps)}
      />
    );
  }

  return (
    <div className="space-y-2">
      {order.map((item, i) => (
        <div
          key={`${item}-${i}`}
          className="flex items-center gap-3 rounded-xl border-2 border-m3-outline-variant/20 bg-m3-surface-container-lowest p-3"
        >
          <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg bg-m3-primary/10 text-m3-primary font-bold text-sm tabular-nums">
            {i + 1}
          </span>
          <span className="flex-1 text-sm sm:text-base text-m3-on-surface font-medium min-w-0">
            {item}
          </span>
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={disabled || i === 0}
              aria-label="Move up"
              className="px-2 rounded bg-m3-surface-container-high text-m3-on-surface hover:bg-m3-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-tight"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={disabled || i === order.length - 1}
              aria-label="Move down"
              className="px-2 rounded bg-m3-surface-container-high text-m3-on-surface hover:bg-m3-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-tight"
            >
              ▼
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Split a stem on runs of 3+ underscores. Returns the static fragments
 * around blanks; the number of blanks is ``segments.length - 1``. */
function splitStemByBlanks(stem: string): string[] {
  if (!stem) return [""];
  const parts = stem.split(/_{3,}/g);
  return parts;
}
