/**
 * Moved to `@/lib/hooks/useAssessmentFullscreen` — nothing in it was ever
 * interview-specific and the quiz take now uses it too. Re-exported here under
 * the old name so existing interview call sites and their tests are unchanged.
 */
export {
  useAssessmentFullscreen,
  useAssessmentFullscreen as useInterviewFullscreen,
  type AssessmentFullscreenOptions,
  type AssessmentFullscreenOptions as InterviewFullscreenOptions,
} from "@/lib/hooks/useAssessmentFullscreen";
