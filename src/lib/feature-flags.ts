/**
 * Client-side feature flags.
 *
 * Minimal, compile-time flag registry — no backend/config service. Flags
 * default OFF so in-progress features never reach live students/teachers
 * until we explicitly flip them on for a sign-off run.
 *
 * To enable a flag locally for development or a sign-off smoke test, flip the
 * value here and rebuild (`npm run build` → `pm2 restart abridgeai-frontend`).
 *
 * Usage:
 *   import { isFeatureEnabled } from "@/lib/feature-flags";
 *   if (isFeatureEnabled("quiz_results_dashboard")) { ... }
 */

export interface FeatureFlags {
  /**
   * Teacher-facing per-quiz results & analytics dashboard
   * (route `/teacher/courses/$courseId/quizzes/$quizId/results`, plus the
   * "Results" entry points in the quiz editor and the Assessments tab).
   * Default OFF until sign-off.
   */
  quiz_results_dashboard: boolean;
}

const FLAGS: FeatureFlags = {
  quiz_results_dashboard: false,
};

/** Returns whether a feature flag is currently enabled. */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return FLAGS[flag];
}
