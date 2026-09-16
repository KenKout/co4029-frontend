/**
 * Student verdict-state badge — now a thin re-export of the SHARED derivation.
 *
 * The logic lives in `@/lib/interview/verdict-state` so the teacher surfaces
 * (attempts list, assessments tables, filter helpers) render the same badge a
 * student sees for the same row. This path is kept because several modules
 * import `verdictState` from it; see the shared module for the reasoning
 * (server-derived `evaluation_state` beats the `status` heuristic, legacy
 * fallback included).
 */
export type {
  VerdictState,
  VerdictStateInput,
} from "@/lib/interview/verdict-state";
export { verdictState } from "@/lib/interview/verdict-state";
