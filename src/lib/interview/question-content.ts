/**
 * Question-content normalization (interview main-screen spec §6).
 *
 * The learner-facing Question Card must render ONLY the actual interview
 * question. Occasionally the model that produces `prompt_text` leaks
 * candidate-hostile content into the field — refusal boilerplate ("I can't
 * provide hidden interview questions, answers, grading criteria…"), guardrail
 * notices, raw response wrappers, or role/JSON scaffolding. Rendering that
 * verbatim (as the pre-fix Question Card did) both confuses the candidate and
 * risks exposing grading criteria.
 *
 * This module is the single normalization seam: raw `InterviewQuestionPublic`
 * rows are mapped through {@link toInterviewQuestion} before they ever reach a
 * `ConversationTurn`, so the fix lives at the data-mapping layer rather than in
 * fragile per-render string replacements. Sanitization is sentence-scoped, so a
 * response that *mixes* a guardrail preamble with a real question keeps the
 * question and drops only the offending sentences.
 */

/** Structured, render-ready question (spec §6 recommended shape). */
export interface InterviewQuestion {
  id: string;
  number: number;
  totalQuestions?: number;
  category?: string;
  questionText: string;
}

/** Minimal shape this layer needs from the public question projection. */
export interface RawInterviewQuestion {
  id: string;
  prompt_text: string;
  question_type?: string | null;
}

/**
 * Sentence-level guardrail / policy / meta markers. A sentence matching any of
 * these is internal text that must never render as part of the question.
 * Deliberately conservative: only phrases that are unambiguously interviewer
 * meta-talk, never legitimate question wording.
 */
const GUARDRAIL_SENTENCE_PATTERNS: readonly RegExp[] = [
  /\bI\s+(?:can(?:'|’)?t|cannot|can\s+not|won(?:'|’)?t|am\s+not\s+able\s+to|am\s+unable\s+to)\b[^.?!]*\b(?:provide|share|reveal|disclose|give|expose)\b/i,
  /\bhidden\s+(?:interview\s+)?questions?\b/i,
  /\bgrading\s+criteria\b/i,
  /\bmarking\s+(?:scheme|criteria)\b/i,
  /\brubric(?:s)?\b[^.?!]*\b(?:criteria|internal|hidden)\b/i,
  /\bmodel\s+answers?\b/i,
  /\banswer\s+keys?\b/i,
  /\bas\s+an?\s+AI(?:\s+language)?\s+(?:model|assistant)\b/i,
  /\b(?:system|hidden|internal)\s+(?:prompt|instruction)s?\b/i,
  /\bmy\s+(?:instructions|guidelines|guardrails)\b/i,
  /\b(?:against|violate[sd]?)\s+(?:my\s+)?(?:policy|policies|guidelines)\b/i,
];

/**
 * Wrapper artifacts to peel before sentence analysis: fenced code blocks,
 * leading speaker labels, JSON-ish envelopes, and surrounding quotes. These are
 * scaffolding, not content.
 */
function stripWrappers(input: string): string {
  let text = input.trim();

  // Markdown code fences around the whole payload: ```…``` or ```json …```.
  const fence = text.match(/^```[a-zA-Z]*\s*\n?([\s\S]*?)\n?```$/);
  if (fence) text = fence[1].trim();

  // A JSON envelope like {"question": "…"} / {"question_text": "…"}.
  if (/^\{[\s\S]*\}$/.test(text)) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const candidate =
        parsed.question_text ??
        parsed.questionText ??
        parsed.question ??
        parsed.prompt ??
        parsed.prompt_text ??
        parsed.text;
      if (typeof candidate === "string" && candidate.trim()) {
        text = candidate.trim();
      }
    } catch {
      // Not valid JSON — fall through and treat as plain text.
    }
  }

  // Leading role / wrapper labels: "AI:", "Interviewer:", "Question:",
  // "Assistant -", "[SYSTEM]" etc. Only strip a single leading label.
  text = text.replace(
    /^\s*(?:\[[^\]]{1,24}\]\s*)?(?:ai|assistant|interviewer|system|question|prompt|response|output)\s*[:\-–—]\s*/i,
    "",
  );

  // Symmetric surrounding quotes (straight or smart) wrapping the entire value.
  const quoted = text.match(/^(["'“”‘’])([\s\S]*)(["'“”‘’])$/);
  if (quoted && quoted[2].trim()) text = quoted[2].trim();

  return text.trim();
}

/** Split into sentences while preserving their trailing punctuation. */
function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+(?:["'”’)\]]+)?|\S[^.!?]*$/g);
  return matches ? matches.map((sentence) => sentence.trim()).filter(Boolean) : [];
}

function isGuardrailSentence(sentence: string): boolean {
  return GUARDRAIL_SENTENCE_PATTERNS.some((pattern) => pattern.test(sentence));
}

export interface NormalizedQuestionText {
  /** Candidate-safe question text (may be empty when nothing safe remained). */
  text: string;
  /** True when guardrail/meta content was detected and removed. */
  sanitized: boolean;
}

/**
 * Strip guardrail / policy / wrapper content from a raw question string,
 * keeping any legitimate question sentences that were mixed in.
 */
export function normalizeQuestionText(raw: string | null | undefined): NormalizedQuestionText {
  if (!raw) return { text: "", sanitized: false };

  const unwrapped = stripWrappers(raw);
  const sentences = splitSentences(unwrapped);

  if (sentences.length === 0) {
    // No sentence punctuation: treat the whole thing as one unit.
    const guarded = isGuardrailSentence(unwrapped);
    return { text: guarded ? "" : unwrapped, sanitized: guarded };
  }

  const kept = sentences.filter((sentence) => !isGuardrailSentence(sentence));
  const removedAny = kept.length !== sentences.length || unwrapped !== raw.trim();
  const text = kept.join(" ").replace(/\s+/g, " ").trim();

  return { text, sanitized: removedAny && kept.length !== sentences.length };
}

/**
 * Map a raw public question row to the structured, render-ready shape used by
 * the Question Card. `questionText` is guaranteed candidate-safe; when the raw
 * prompt was entirely guardrail/refusal text, `questionText` is empty and the
 * caller should render the "preparing question" state rather than the leak.
 */
export function toInterviewQuestion(
  raw: RawInterviewQuestion,
  meta: { number: number; totalQuestions?: number | null; category?: string | null },
): InterviewQuestion {
  const { text } = normalizeQuestionText(raw.prompt_text);
  return {
    id: raw.id,
    number: meta.number,
    totalQuestions: meta.totalQuestions ?? undefined,
    category: meta.category ?? undefined,
    questionText: text,
  };
}
