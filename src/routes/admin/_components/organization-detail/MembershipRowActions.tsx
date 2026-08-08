import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { MembershipStatus } from "@/lib/api/types/admin-organizations";
import { MEMBERSHIP_STATUS_VALUES } from "./constants";
import { StatusBadge } from "./StatusBadge";
import type { MembershipRowController } from "./use-membership-row";

/**
 * Right-hand action cluster of a membership row: the status pill doubling as
 * the edit trigger plus the delete button, swapped for the inline status
 * `<Select>` and save/cancel pair while editing.
 */
export function MembershipRowActions({
  controller,
  status,
}: {
  controller: MembershipRowController;
  status: string;
}) {
  const {
    t,
    patch,
    editing,
    setEditing,
    draftStatus,
    setDraftStatus,
    handleSave,
    handleRemove,
  } = controller;
  return (
    <div className="flex items-center gap-2 shrink-0">
      {editing ? (
        <>
          <Select<MembershipStatus>
            value={draftStatus}
            onValueChange={(next) => setDraftStatus(next)}
            size="sm"
            options={MEMBERSHIP_STATUS_VALUES.map((k) => ({
              value: k,
              label: t(`admin.organizations.membership_status_label.${k}`),
            }))}
            className="w-32"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={patch.isPending}
          >
            {t("admin.organizations.actions.save")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(false);
              setDraftStatus(status as MembershipStatus);
            }}
          >
            {t("admin.organizations.actions.cancel")}
          </Button>
        </>
      ) : (
        <>
          <Button variant="ghost"
            type="button"
            onClick={() => setEditing(true)}
            className="cursor-pointer"
            aria-label={t("admin.organizations.actions.edit")}
          >
            <StatusBadge status={status} type="membership" />
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={handleRemove}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
            aria-label={t("admin.organizations.actions.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
