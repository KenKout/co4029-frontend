import { Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MembershipsTabController } from "./use-memberships-tab";

/**
 * Pane switcher above the roster: the two toggles that open the single-add and
 * bulk-add forms, plus the cancel button that appears once either is open.
 */
export function MembershipModeToolbar({
  controller,
}: {
  controller: MembershipsTabController;
}) {
  const { t, mode, setMode, setBulkResults } = controller;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          variant={mode === "add" ? "default" : "outline"}
          onClick={() => setMode(mode === "add" ? "list" : "add")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("admin.organizations.memberships.add_title")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "bulk" ? "default" : "outline"}
          onClick={() => setMode(mode === "bulk" ? "list" : "bulk")}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          {t("admin.organizations.memberships.bulk_add_title", {
            defaultValue: "Bulk Add",
          })}
        </Button>
      </div>
      {mode !== "list" && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setMode("list");
            setBulkResults(null);
          }}
          className="gap-1"
        >
          <X className="h-4 w-4" />
          {t("admin.organizations.actions.cancel")}
        </Button>
      )}
    </div>
  );
}
