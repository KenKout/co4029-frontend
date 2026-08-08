import { Code2, Rows3, Search, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AdminSettingsPageController } from "./use-admin-settings-page";

/** Toolbar — (not sticky: kept overlapping the section headers) */
export function SettingsToolbar({
  controller,
}: {
  controller: AdminSettingsPageController;
}) {
  const {
    orgId,
    setOrgId,
    search,
    setSearch,
    overriddenOnly,
    setOverriddenOnly,
    showKeys,
    setShowKeys,
    dense,
    setDense,
    orgs,
    totalOverrides,
  } = controller;

  return (
    <div className="-mx-1 mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search settings…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-slate-300 py-1.5 pl-8 pr-2.5 text-sm focus:border-m3-primary focus:outline-none focus:ring-1 focus:ring-m3-primary/40"
          />
        </div>

        <select
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          aria-label="Scope"
        >
          <option value="">Global (all orgs)</option>
          {orgs.items.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-m3-primary"
            checked={overriddenOnly}
            onChange={(e) => setOverriddenOnly(e.target.checked)}
          />
          Overridden only
          {totalOverrides > 0 && (
            <span className="rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-700">
              {totalOverrides}
            </span>
          )}
        </label>

        <Button variant="ghost"
          type="button"
          onClick={() => setShowKeys((v) => !v)}
          title="Show config keys and env vars"
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm",
            showKeys
              ? "border-m3-primary/40 bg-m3-primary/10 text-m3-primary"
              : "border-slate-300 text-slate-600 hover:bg-slate-50",
          )}
        >
          <Code2 className="h-4 w-4" />
          Keys
        </Button>

        <Button variant="ghost"
          type="button"
          onClick={() => setDense((v) => !v)}
          title={dense ? "Card view" : "Table view"}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm",
            dense
              ? "border-m3-primary/40 bg-m3-primary/10 text-m3-primary"
              : "border-slate-300 text-slate-600 hover:bg-slate-50",
          )}
        >
          {dense ? (
            <Rows3 className="h-4 w-4" />
          ) : (
            <Table2 className="h-4 w-4" />
          )}
          {dense ? "Cards" : "Table"}
        </Button>
      </div>

      {/* Autosave is explicit — runtime config that silently commits is
          scary, so say so rather than implying a Save button exists. */}
      <p className="mt-1.5 text-[11px] text-slate-400">
        Changes save automatically on edit.
        {orgId
          ? " Editing overrides for the selected organization only."
          : " Editing the global default for all organizations."}
      </p>
    </div>
  );
}
