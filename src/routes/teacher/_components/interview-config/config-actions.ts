/**
 * The toast-wrapped status transitions of an interview config (publish, archive,
 * unarchive, unpublish) and the publish-failure message mapping.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 7 of that file's
 * decomposition). Messages arrive already translated so this module never needs
 * the i18n instance, which keeps it a plain async helper the page can await.
 */

import { toast } from "sonner";

/**
 * Run a status mutation and report the outcome. Archive / unarchive / unpublish
 * are the same three lines each, differing only in which mutation runs and which
 * two messages it reports.
 */
export async function runConfigAction({
  mutateAsync,
  successMessage,
  failureMessage,
}: {
  mutateAsync: () => Promise<unknown>;
  successMessage: string;
  failureMessage: string;
}): Promise<void> {
  try {
    await mutateAsync();
    toast.success(successMessage);
  } catch (err: unknown) {
    toast.error((err as Error).message || failureMessage);
  }
}

/** Pre-translated copy for every way a publish can fail. */
export interface PublishFailureMessages {
  archived: string;
  outcomesRequired: string;
  questionsRequired: string;
  fallback: string;
}

/**
 * Which failure to show for a rejected publish. The backend surfaces its gates
 * as error codes inside the message, so the mapping is a series of early returns
 * over that string plus the two conditions the client already knows about (the
 * config is archived; nothing is approved yet).
 */
export function publishFailureMessage({
  message,
  isArchived,
  approvedCount,
  messages,
}: {
  message: string;
  isArchived: boolean;
  approvedCount: number;
  messages: PublishFailureMessages;
}): string {
  if (isArchived || /archived/i.test(message)) return messages.archived;
  if (/interview_no_outcomes|outcome/i.test(message)) {
    return messages.outcomesRequired;
  }
  if (
    approvedCount === 0 ||
    /interview_no_approved_questions|question|insufficient|empty/i.test(message)
  ) {
    return messages.questionsRequired;
  }
  return message || messages.fallback;
}

/** Comma- or newline-separated topic list → trimmed, non-empty entries. */
export function splitTopics(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
