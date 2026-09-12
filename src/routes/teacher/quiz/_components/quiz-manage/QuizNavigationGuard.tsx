import { useBlocker } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/** The shared leave guard handles tabs/reload; this covers links and Back. */
export function QuizNavigationGuard({ dirty, busy = false }: { dirty: boolean; busy?: boolean }) {
  const { t } = useTranslation();
  const blocker = useBlocker({
    shouldBlockFn: () => dirty || busy,
    withResolver: true,
    enableBeforeUnload: false,
  });
  return <ConfirmDialog
    open={blocker.status === "blocked"}
    onOpenChange={(open) => { if (!open) blocker.reset?.(); }}
    title={t("common.unsaved.title")}
    description={t(busy ? "teacher_quiz_manage.settings.assist.mutation_pending" : "common.unsaved.description")}
    confirmDisabled={busy}
    confirmLabel={t("common.unsaved.quit")}
    cancelLabel={t("common.cancel")}
    onConfirm={() => blocker.proceed?.()}
  />;
}
