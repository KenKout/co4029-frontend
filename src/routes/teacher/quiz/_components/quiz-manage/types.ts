import type { useTranslation } from "react-i18next";

/**
 * Shared types for the quiz-manage page shell, extracted from the former
 * 829-line quiz-manage.tsx so the orchestrator, its hooks and the
 * presentational shell components agree on one definition. No behavioural
 * surface of its own.
 */

/** `t` exactly as the orchestrator's `useTranslation()` hands it out. */
export type TranslateFn = ReturnType<typeof useTranslation>["t"];
