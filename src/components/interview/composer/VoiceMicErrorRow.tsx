import { useTranslation } from "react-i18next";
import { CircleAlert, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Microphone failure branch of the voice panel, with its retry affordance. */
export function VoiceMicErrorRow({
  errorKey,
  onRetry,
}: {
  errorKey: string | null;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-3" role="alert">
      <CircleAlert className="h-5 w-5 shrink-0 text-danger" />
      <p className="min-w-0 flex-1 text-sm text-danger">
        {t(
          errorKey ??
            "course_interview.workspace.microphone_errors.interrupted",
        )}
      </p>
      {onRetry && (
        <Button type="button" variant="outline" size="lg" onClick={onRetry}>
          <RotateCcw className="h-4 w-4" />
          {t("course_interview.workspace.retry_microphone")}
        </Button>
      )}
    </div>
  );
}
