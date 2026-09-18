import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Code2, Rows3, Table2 } from "lucide-react";
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
        <SearchInput
          wrapperClassName="min-w-[180px] flex-1"
          size="sm"
          placeholder="Search settings…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <Select
          size="sm"
          value={orgId}
          onValueChange={setOrgId}
          options={[
            { value: "", label: "Global (all orgs)" },
            ...orgs.items.map((org) => ({ value: org.id, label: org.name })),
          ]}
          aria-label="Scope"
        />

        <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-600">
          <Checkbox
            className="h-3.5 w-3.5"
            checked={overriddenOnly}
            onCheckedChange={setOverriddenOnly}
          />
          Overridden only
          {totalOverrides > 0 && (
            <span className="rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-700">
              {totalOverrides}
            </span>
          )}
        </label>

        <Button
          variant="ghost"
          type="button"
          onClick={() => setShowKeys((v) => !v)}
          title="Show config keys and env vars"
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm h-auto whitespace-normal",
            showKeys
              ? "border-m3-primary/40 bg-m3-primary/10 text-m3-primary"
              : "border-slate-300 text-slate-600 hover:bg-slate-50",
          )}
        >
          <Code2 className="h-4 w-4" />
          Keys
        </Button>

        <Button
          variant="ghost"
          type="button"
          onClick={() => setDense((v) => !v)}
          title={dense ? "Card view" : "Table view"}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm h-auto whitespace-normal",
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

      {/* Nothing here writes on edit any more. Say so plainly: an operator who
          still believes this page autosaves will treat a half-finished draft
          as already applied, which is the more dangerous misreading of the
          two. */}
      <p className="mt-1.5 text-[11px] text-slate-400">
        Changes are staged until you review and apply them.
        {orgId
          ? " Editing overrides for the selected organization only."
          : " Editing the global default for all organizations."}
      </p>
    </div>
  );
}
