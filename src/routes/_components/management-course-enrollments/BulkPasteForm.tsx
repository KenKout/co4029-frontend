import { useTranslation } from "react-i18next";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { BulkTabController } from "./use-bulk-tab";

/**
 * The paste-a-list form: a textarea of user ids / emails, the live tally of what
 * parsed out of it, and the submit button.
 */
export function BulkPasteForm({
  controller,
}: {
  controller: BulkTabController;
}) {
  const { t } = useTranslation();
  const { bulk, text, setText, parsed, submitting, handleSubmitText } =
    controller;

  return (
    <form
      onSubmit={handleSubmitText}
      className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-4"
    >
      <div>
        <h2 className="text-sm font-bold text-m3-on-surface">
          {t("management_course_enrollments.bulk.label")}
        </h2>
        <p className="text-xs text-m3-on-surface-variant mt-1">
          {t("management_course_enrollments.bulk.hint")}
        </p>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        mono
        placeholder={
          "user@example.com\n550e8400-e29b-41d4-a716-446655440000\nanother@example.com"
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-m3-on-surface-variant">
        <div className="flex gap-3">
          <span>
            UUID: <strong>{parsed.userIds.length}</strong>
          </span>
          <span>
            Email: <strong>{parsed.emails.length}</strong>
          </span>
          {parsed.invalid.length > 0 && (
            <span className="text-amber-700">
              {t("management_course_enrollments.bulk.invalid_count", {
                count: parsed.invalid.length,
              })}
            </span>
          )}
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={
            submitting ||
            (parsed.userIds.length === 0 && parsed.emails.length === 0)
          }
          className="gap-2"
        >
          {bulk.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t("management_course_enrollments.bulk.submit")}
        </Button>
      </div>
    </form>
  );
}
