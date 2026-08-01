import { useTranslation } from "react-i18next";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmActionBar } from "./ConfirmActionBar";
import { usePathActions } from "./use-path-actions";

/**
 * Publish / archive buttons in the detail header. While a confirmation is
 * pending the whole cluster is replaced by the inline confirm bar — the same
 * three-branch render it had before the split.
 */
export function PathActions({
  id,
  status,
  organizationId: _organizationId,
}: {
  id: string;
  status: string;
  organizationId: string;
}) {
  const { t } = useTranslation();
  const actions = usePathActions(id, t);

  if (actions.confirming === "publish") {
    return (
      <ConfirmActionBar
        confirmLabel={t(
          "management_career_path_detail.dialogs.confirm_publish",
        )}
        cancelLabel={t("common.cancel")}
        onConfirm={actions.handlePublish}
        onCancel={() => actions.setConfirming(null)}
        isPending={actions.publish.isPending}
      />
    );
  }

  if (actions.confirming === "archive") {
    return (
      <ConfirmActionBar
        variant="destructive"
        confirmLabel={t(
          "management_career_path_detail.dialogs.confirm_archive",
        )}
        cancelLabel={t("common.cancel")}
        onConfirm={actions.handleArchive}
        onCancel={() => actions.setConfirming(null)}
        isPending={actions.archive.isPending}
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {status !== "published" && status !== "archived" && (
        <Button size="sm" onClick={() => actions.setConfirming("publish")}>
          {t("management_career_path_detail.actions.publish")}
        </Button>
      )}
      {status !== "archived" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => actions.setConfirming("archive")}
          className="gap-2"
        >
          <Archive className="h-4 w-4" />
          {t("management_career_path_detail.actions.archive")}
        </Button>
      )}
    </div>
  );
}
