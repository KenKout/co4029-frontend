import { Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { MembershipStatus } from "@/lib/api/types/admin-organizations";
import { MEMBERSHIP_STATUS_VALUES } from "./constants";
import type { MembershipRowController } from "./use-membership-row";

/**
 * Right-hand action cluster of a membership row: an explicit Edit button
 * (pencil) that opens the inline status `<Select>`, plus the delete button.
 * The status itself lives in its own static badge column — the old pill
 * doubled as the edit trigger, which read as a confusing active/inactive
 * toggle.
 */
export function MembershipRowActions({
  controller,
}: {
  controller: MembershipRowController;
}) {
  const {
    t,
    patch,
    editing,
    setEditing,
    draftStatus,
    setDraftStatus,
    originalStatus,
    handleSave,
    handleRemove,
  } = controller;
  return (
    <div className="flex items-center justify-end gap-1.5 shrink-0">
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
            variant="ghost"
            className="p-1.5 h-auto text-emerald-700 hover:bg-emerald-50 rounded-md"
            onClick={handleSave}
            disabled={patch.isPending}
            aria-label={t("admin.organizations.actions.save")}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="p-1.5 h-auto text-text-muted hover:bg-surface-muted rounded-md"
            onClick={() => {
              setEditing(false);
              setDraftStatus(originalStatus);
            }}
            aria-label={t("admin.organizations.actions.cancel")}
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            type="button"
            size="sm"
            className="p-1.5 h-auto text-m3-primary hover:bg-m3-primary-fixed/40 rounded-md"
            onClick={() => setEditing(true)}
            aria-label={t("admin.organizations.actions.edit_status", {
              defaultValue: "Edit status",
            })}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            type="button"
            size="sm"
            className="p-1.5 h-auto text-red-600 hover:bg-red-50 rounded-md"
            onClick={handleRemove}
            aria-label={t("admin.organizations.actions.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
