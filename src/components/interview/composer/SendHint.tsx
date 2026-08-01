import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Kbd } from "./Kbd";

/** The Enter / Shift+Enter keycap hint shared by both composers. */
export function SendHint({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={t("course_interview.workspace.send_hint")}
    >
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        <Kbd>Enter</Kbd>
        <span>{t("course_interview.workspace.send_hint_send")}</span>
      </span>
      {/* The Shift half drops on narrow screens: two keycap groups plus a timer
          do not fit, and "Enter send" is the half a student needs first. Hiding
          the whole hint instead would regress what mobile used to show. */}
      <span
        className="hidden items-center gap-1 sm:inline-flex"
        aria-hidden="true"
      >
        <span className="text-border">·</span>
        <Kbd>Shift</Kbd>
        <span className="text-text-subtle">+</span>
        <Kbd>Enter</Kbd>
        <span>{t("course_interview.workspace.send_hint_newline")}</span>
      </span>
    </span>
  );
}
