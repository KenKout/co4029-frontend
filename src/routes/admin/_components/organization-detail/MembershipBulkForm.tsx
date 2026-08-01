import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkAddResultsPanel } from "./BulkAddResultsPanel";
import { BULK_USER_IDS_PLACEHOLDER } from "./constants";
import type { MembershipsTabController } from "./use-memberships-tab";

/**
 * Paste-many "bulk add" form: the UUID textarea, the parsed/invalid counters,
 * the submit button and the outcome panel.
 */
export function MembershipBulkForm({
  controller,
}: {
  controller: MembershipsTabController;
}) {
  const {
    t,
    bulkText,
    setBulkText,
    bulkPending,
    bulkResults,
    parsedBulk,
    handleBulkAdd,
  } = controller;
  return (
    <form
      onSubmit={handleBulkAdd}
      className="rounded-xl bg-white border border-m3-outline-variant/40 p-4 space-y-3"
    >
      <div>
        <p className="text-sm font-semibold text-text-strong">
          {t("admin.organizations.memberships.bulk_add_title", {
            defaultValue: "Bulk Add Members",
          })}
        </p>
        <p className="text-xs text-text-muted mt-1">
          {t("admin.organizations.memberships.bulk_add_hint", {
            defaultValue:
              "Paste one user UUID per line. All will be added as active members. Find user UUIDs on the Users page.",
          })}
        </p>
      </div>
      <textarea
        value={bulkText}
        onChange={(e) => setBulkText(e.target.value)}
        rows={8}
        placeholder={BULK_USER_IDS_PLACEHOLDER}
        className="w-full px-4 py-3 text-sm font-mono bg-white border border-m3-outline-variant/40 rounded-xl text-text-strong focus:outline-none focus:ring-2 focus:ring-m3-primary/30 placeholder:text-text-muted/40"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
        <div className="flex gap-3">
          <span>
            UUID: <strong>{parsedBulk.userIds.length}</strong>
          </span>
          {parsedBulk.invalid.length > 0 && (
            <span className="text-amber-700">
              {parsedBulk.invalid.length} invalid line(s) will be skipped
            </span>
          )}
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={bulkPending || parsedBulk.userIds.length === 0}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {bulkPending
            ? t("admin.organizations.actions.adding")
            : t("admin.organizations.memberships.bulk_add_title", {
                defaultValue: "Add All",
              })}
        </Button>
      </div>

      {bulkResults && <BulkAddResultsPanel results={bulkResults} />}
    </form>
  );
}
