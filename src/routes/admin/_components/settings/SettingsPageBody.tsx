import { useState } from "react";

import { ApplyChangesDialog } from "./ApplyChangesDialog";
import { ChangeHistorySection } from "./ChangeHistorySection";
import { PendingChangesBar } from "./PendingChangesBar";
import { SettingsCardList } from "./SettingsCardList";
import { SettingsTable } from "./SettingsTable";
import type { AdminSettingsPageController } from "./use-admin-settings-page";

/**
 * Everything below the toolbar: the query states, the empty-filter notice and
 * the two mutually exclusive layouts (dense table vs. cards).
 */
export function SettingsPageBody({
  controller,
}: {
  controller: AdminSettingsPageController;
}) {
  const {
    settings,
    dense,
    visibleGroups,
    grouped,
    overrideCounts,
    orgId,
    showKeys,
    draft,
  } = controller;

  return (
    <>
      {settings.isLoading && (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      )}
      {settings.isError && (
        <p className="mt-8 text-sm text-red-600">
          Could not load settings. You may not have permission for this scope.
        </p>
      )}

      {settings.data && visibleGroups.length === 0 && (
        <p className="mt-8 text-sm text-slate-500">
          No settings match your filters.
        </p>
      )}

      {settings.data && dense && visibleGroups.length > 0 && (
        <div className="mt-4">
          <SettingsTable
            groups={visibleGroups}
            grouped={grouped}
            overrideCounts={overrideCounts}
            orgId={orgId || undefined}
            showKeys={showKeys}
            draft={draft}
          />
        </div>
      )}

      {settings.data && !dense && visibleGroups.length > 0 && (
        <SettingsCardList controller={controller} />
      )}

      {settings.data && (
        <div className="mt-10">
          <ChangeHistorySection orgId={orgId || undefined} />
        </div>
      )}

      <ApplyFlow controller={controller} />
    </>
  );
}

/**
 * The staging affordances: the sticky pending bar and the apply dialog it
 * opens. Split out so the body above stays a straightforward render of query
 * states and layouts.
 */
function ApplyFlow({
  controller,
}: {
  controller: AdminSettingsPageController;
}) {
  const { draft, settings, orgId } = controller;
  const [reviewing, setReviewing] = useState(false);

  return (
    <>
      <PendingChangesBar draft={draft} onReview={() => setReviewing(true)} />
      <ApplyChangesDialog
        open={reviewing}
        onClose={() => setReviewing(false)}
        draft={draft}
        settings={settings.data ?? []}
        orgId={orgId || undefined}
      />
    </>
  );
}
