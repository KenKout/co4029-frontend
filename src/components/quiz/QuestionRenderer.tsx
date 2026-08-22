import { useMemo, useRef, useState } from "react";
import { CheckCircle2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichContent } from "@/components/ui/rich-content";
import type { QuizQuestionPublic } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Per-type input UI for the student quiz attempt page.
 *
 * Maps each ``question_type`` to the right input shape:
 * - ``multiple_choice`` / ``true_false`` → option buttons (caller-supplied
 *   ``onSelectOption`` updates ``selectedOptionId``).
 * - ``short_answer`` → single-line text input bound to ``answerText``.
 * - ``fill_blank`` → tap-to-fill word bank with N fill slots (drag optional);
 *   the stem's ``___`` placeholders are split out and rendered inline,
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
  switch (props.question.question_type) {
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
    <div className="space-y-2">
      {sortedOptions.map((option) => {
        const isSelected = selectedOptionId === option.id;
        return (
          <Button variant="ghost"
            key={option.id}
            type="button"
            onClick={() => {
              if (disabled) return;
              onSelectOption(option.id);
            }}
            className={cn(
              "w-full text-left p-3 sm:p-4 rounded-xl flex items-start gap-3 transition-all duration-200 border-2 group/opt cursor-pointer h-auto whitespace-normal",
              isSelected
                ? "bg-m3-primary-fixed/20 border-m3-primary shadow-lg shadow-m3-primary/10 ring-2 ring-m3-primary"
                : "bg-m3-surface-container-low border-transparent hover:bg-m3-surface-container-high hover:border-m3-outline-variant/30",
            )}
          >
            <span
              className={cn(
                "w-8 h-8 shrink-0 flex items-center justify-center rounded-lg font-bold text-xs transition-colors shadow-sm mt-0.5",
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
          </Button>
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
      <Textarea
        value={answerText ?? ""}
        onChange={(e) => onAnswerTextChange(e.target.value || null)}
        disabled={disabled}
        rows={3}
        placeholder="Type your answer..."
        variant="lowest" className="border-2 px-4 py-3 text-base"
        aria-label="Short answer input"
      />
    </div>
  );
}

/**
 * Tap-to-fill word bank for fill_blank (drag-and-drop is an optional shortcut).
 *
 * Interaction model — the blank is the target, the word is the value:
 *   1. Tap a blank to focus it (renders "Choose answer").
 *   2. Tap a word to fill the focused blank, then focus auto-advances to the
 *      next empty blank. With no blank focused, a word tap fills the first empty.
 *   3. Tap a filled blank to focus it, then tap another word to replace/swap.
 *   4. × clears a filled blank; dragging a word onto a blank still works.
 *
 * The word bank comes from ``question.fill_blank_choices`` — a no-leak
 * projection the backend derives from the answer words (or the AI-generated
 * option bank with distractors), shuffled so the positional answer key never
 * reaches the learner. Falls back to ``question.options`` then "Word 1..N".
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
  const slots = useMemo(
    () => parseFillBlankSlots(answerText, blankCount),
    [answerText, blankCount],
  );
  const wordBank = useMemo(
    () => buildFillBlankWordBank(question, blankCount),
    [question, blankCount],
  );
  const [focusedBlank, setFocusedBlank] = useState<number | null>(null);

  function commitSlots(next: Array<string | null>) {
    onAnswerTextChange(JSON.stringify(next.map((value) => value ?? "")));
  }

  function placeAt(index: number, word: string) {
    if (disabled) return;
    const next = [...slots];
    const fromSlot = next.indexOf(word);
    const bankCount = wordBank.filter((w) => w === word).length;
    const placedCount = next.filter((s) => s === word).length;
    // Move (swap) an existing occurrence only when no spare copy remains —
    // otherwise a duplicate answer would be stolen from its slot.
    if (fromSlot >= 0 && fromSlot !== index && placedCount >= bankCount) {
      next[fromSlot] = next[index];
    }
    next[index] = word;
    commitSlots(next);
    const nextEmpty = next.findIndex((s) => s === null);
    setFocusedBlank(nextEmpty >= 0 ? nextEmpty : null);
  }

  function clearSlot(index: number) {
    if (disabled) return;
    const next = [...slots];
    next[index] = null;
    commitSlots(next);
    setFocusedBlank(index);
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
              <FillBlankSlot
                value={slots[i]}
                focused={focusedBlank === i}
                disabled={disabled}
                onTap={() => {
                  if (disabled) return;
                  setFocusedBlank((cur) => (cur === i ? null : i));
                }}
                onClear={() => clearSlot(i)}
                onDrop={(word) => placeAt(i, word)}
              />
            )}
          </span>
        ))}
      </div>
      <FillBlankWordBank
        wordBank={wordBank}
        slots={slots}
        focusedBlank={focusedBlank}
        disabled={disabled}
        onWordTap={(word) => {
          if (disabled) return;
          const target =
            focusedBlank != null
              ? focusedBlank
              : slots.findIndex((s) => s === null);
          if (target < 0 || slots[target] === word) return;
          placeAt(target, word);
        }}
      />
    </div>
  );
}

/** Decode a fill_blank ``answerText`` (JSON array of slot values) into a
 * ``slots`` array of length ``blankCount``. Non-JSON / short arrays degrade to
 * empty slots. */
function parseFillBlankSlots(
  answerText: string | null,
  blankCount: number,
): Array<string | null> {
  const parsed: Array<string | null> = Array(blankCount).fill(null);
  if (blankCount === 0 || !answerText) return parsed;
  try {
    const data = JSON.parse(answerText);
    if (Array.isArray(data)) {
      return Array.from({ length: blankCount }, (_, i) => {
        const value = data[i];
        return typeof value === "string" && value ? value : null;
      });
    }
  } catch {
    // Not JSON — leave slots empty.
  }
  return parsed;
}

/** Build the fill_blank word bank: ``fill_blank_choices`` (backend no-leak
 * projection) when present, else ``options``, else "Word 1..N" placeholders. */
function buildFillBlankWordBank(
  question: QuizQuestionPublic,
  blankCount: number,
): string[] {
  const fillChoices = (
    question as unknown as { fill_blank_choices?: string[] | null }
  ).fill_blank_choices;
  if (Array.isArray(fillChoices)) {
    const cleaned = fillChoices.filter(
      (w) => typeof w === "string" && w.trim().length > 0,
    );
    if (cleaned.length > 0) return cleaned;
  }
  const fromOptions = question.options
    .map((opt) => opt.option_text)
    .filter((text) => typeof text === "string" && text.length > 0);
  if (fromOptions.length > 0) return fromOptions;
  return Array.from({ length: blankCount }, (_, i) => `Word ${i + 1}`);
}

function FillBlankWordBank({
  wordBank,
  slots,
  focusedBlank,
  disabled,
  onWordTap,
}: {
  wordBank: string[];
  slots: Array<string | null>;
  focusedBlank: number | null;
  disabled: boolean;
  onWordTap: (word: string) => void;
}) {
  function isUnavailable(word: string): boolean {
    if (disabled) return true;
    const placed = slots.filter((s) => s === word).length;
    const available = wordBank.filter((w) => w === word).length;
    if (available - placed > 0) {
      // Spare copy — enabled unless it would be a no-op on the focused blank.
      return focusedBlank != null && slots[focusedBlank] === word;
    }
    // Fully placed — enabled only to swap into a focused, filled, different blank.
    const swappable =
      focusedBlank != null &&
      slots[focusedBlank] != null &&
      slots[focusedBlank] !== word;
    return !swappable;
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        Word bank
      </div>
      <div className="flex flex-wrap gap-2">
        {wordBank.map((word, wordIndex) => {
          const unavailable = isUnavailable(word);
          return (
            <Button variant="ghost"
              key={`${word}-${wordIndex}`}
              type="button"
              draggable={!disabled && !unavailable}
              onDragStart={(e) => {
                if (unavailable || disabled) {
                  e.preventDefault();
                  return;
                }
                e.dataTransfer.setData("text/plain", word);
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => onWordTap(word)}
              disabled={unavailable}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 cursor-grab active:cursor-grabbing h-auto whitespace-normal",
                unavailable
                  ? "bg-m3-surface-container-low text-m3-on-surface-variant border-transparent line-through opacity-50 cursor-not-allowed"
                  : "bg-m3-secondary-fixed/40 text-m3-on-surface border-m3-secondary/30 hover:bg-m3-secondary-fixed/60 hover:border-m3-secondary",
              )}
            >
              {word}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

interface FillBlankSlotProps {
  value: string | null;
  focused: boolean;
  disabled: boolean;
  onTap: () => void;
  onClear: () => void;
  onDrop: (word: string) => void;
}

function FillBlankSlot({
  value,
  focused,
  disabled,
  onTap,
  onClear,
  onDrop,
}: FillBlankSlotProps) {
  const [hovered, setHovered] = useState(false);
  const filled = value != null && value.length > 0;
  const label = filled
    ? `Blank filled with ${value}`
    : focused
      ? "Blank: choose answer"
      : "Blank: empty";
  return (
    <Button
      variant="ghost"
      type="button"
      onClick={onTap}
      disabled={disabled}
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
      aria-label={label}
      className={cn(
        "inline-flex items-center align-middle gap-1 mx-1 px-3 min-w-[6rem] min-h-[2rem] rounded-lg border-2 transition-all h-auto whitespace-normal disabled:opacity-100",
        filled
          ? "border-m3-primary border-solid bg-m3-primary-fixed/30 text-m3-primary font-semibold hover:bg-m3-primary-fixed/30 hover:text-m3-primary"
          : focused || hovered
            ? "border-m3-primary border-solid bg-m3-secondary-fixed/30 hover:bg-m3-secondary-fixed/30"
            : "border-dashed bg-m3-surface-container-low border-m3-outline-variant/40 hover:bg-m3-secondary-fixed/30",
        focused && "ring-2 ring-m3-primary/20",
      )}
    >
      {filled ? (
        <>
          <span className="cursor-grab active:cursor-grabbing">{value}</span>
          {!disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onClear();
                }
              }}
              aria-label="Clear blank"
              className="ml-1 text-m3-primary/60 hover:text-m3-primary text-xs leading-none"
            >
              ×
            </span>
          )}
        </>
      ) : (
        <span
          className={cn(
            "text-xs italic select-none",
            focused ? "text-m3-primary font-medium" : "text-m3-on-surface-variant",
          )}
        >
          {focused ? "Choose answer" : "+ Answer"}
        </span>
      )}
    </Button>
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
    <div className="space-y-2">
      {sortedOptions.map((option) => {
        const isSelected = chosen.includes(option.id);
        return (
          <Button variant="ghost"
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            aria-pressed={isSelected}
            className={cn(
              "w-full text-left p-3 sm:p-4 rounded-xl flex items-start gap-3 transition-all duration-200 border-2 group/opt cursor-pointer h-auto whitespace-normal",
              isSelected
                ? "bg-m3-primary-fixed/20 border-m3-primary shadow-lg shadow-m3-primary/10 ring-2 ring-m3-primary"
                : "bg-m3-surface-container-low border-transparent hover:bg-m3-surface-container-high hover:border-m3-outline-variant/30",
            )}
          >
            <span
              className={cn(
                "w-5 h-5 shrink-0 flex items-center justify-center rounded-md border-2 transition-colors mt-0.5",
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
          </Button>
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
        })}
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
  const dragIndexRef = useRef<number | null>(null);

  function commit(next: string[]) {
    onAnswerTextChange(JSON.stringify(next));
  }

  /** HTML5 drag-and-drop reorder (desktop). The ▲/▼ buttons stay for
   *  touch and keyboard. */
  function onDragStart(i: number, e: React.DragEvent) {
    if (disabled) return;
    dragIndexRef.current = i;
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent) {
    if (disabled || dragIndexRef.current == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(i: number, e: React.DragEvent) {
    e.preventDefault();
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (disabled || from == null || from === i) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    commit(next);
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
        })}
      />
    );
  }

  return (
    <div className="space-y-2">
      {order.map((item, i) => (
        <div
          key={`${item}-${i}`}
          draggable={!disabled}
          onDragStart={(e) => onDragStart(i, e)}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(i, e)}
          className="flex items-center gap-3 rounded-xl border-2 border-m3-outline-variant/20 bg-m3-surface-container-lowest p-3 cursor-grab active:cursor-grabbing select-none"
        >
          <GripVertical className="h-4 w-4 shrink-0 text-m3-outline" />
          <span className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg bg-m3-primary/10 text-m3-primary font-bold text-sm tabular-nums">
            {i + 1}
          </span>
          <span className="flex-1 text-sm sm:text-base text-m3-on-surface font-medium min-w-0">
            {item}
          </span>
          <div className="flex flex-col gap-0.5 shrink-0">
            <Button variant="ghost"
              type="button"
              onClick={() => move(i, -1)}
              disabled={disabled || i === 0}
              aria-label="Move up"
              className="px-2 rounded bg-m3-surface-container-high text-m3-on-surface hover:bg-m3-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-tight h-auto whitespace-normal"
            >
              ▲
            </Button>
            <Button variant="ghost"
              type="button"
              onClick={() => move(i, 1)}
              disabled={disabled || i === order.length - 1}
              aria-label="Move down"
              className="px-2 rounded bg-m3-surface-container-high text-m3-on-surface hover:bg-m3-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-tight h-auto whitespace-normal"
            >
              ▼
            </Button>
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
