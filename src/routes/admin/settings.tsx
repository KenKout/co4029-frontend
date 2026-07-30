import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Popover } from "@base-ui/react/popover";
import {
  Check,
  ChevronDown,
  Code2,
  Copy,
  RotateCcw,
  Search,
  Table2,
  Rows3,
} from "lucide-react";

import {
  useClearRuntimeSetting,
  useRuntimeSettings,
  useSetRuntimeSetting,
  type RuntimeSetting,
  type SettingSource,
} from "@/lib/api/hooks/admin-settings";
import { useOrganizations } from "@/lib/api/hooks/admin-organizations";
import { Switch } from "@/components/ui/switch";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { cn } from "@/lib/utils";

const GROUP_ORDER = [
  "ai",
  "chunking",
  "preprocessing",
  "knowledge_graph",
  "retrieval",
  "spaced_repetition",
  "notifications",
] as const;

const GROUP_LABELS: Record<string, string> = {
  ai: "AI models",
  chunking: "Chunking",
  preprocessing: "Preprocessing",
  knowledge_graph: "Knowledge graph",
  retrieval: "Retrieval",
  spaced_repetition: "Spaced repetition",
  notifications: "Notifications",
};

// A few groups only take effect on the next ingest of a document — changing
// them never rewrites existing content. Stated once per section instead of a
// badge shouting on every row.
const REPROCESS_NOTE =
  "Changes apply to the next ingest, not to already-processed content.";

/** Derive a short unit suffix for a numeric field from its key. */
function unitFor(setting: RuntimeSetting): string | null {
  const k = setting.key;
  if (k.endsWith("_seconds")) return "s";
  if (k.endsWith("_hours")) return "h";
  if (k.includes("tokens")) return "tok";
  if (k.endsWith("_dpi")) return "dpi";
  return null;
}

const SOURCE_META: Record<
  SettingSource,
  { label: string; badge: string; dot: string }
> = {
  organization: {
    label: "org override",
    badge: "bg-indigo-100 text-indigo-700",
    dot: "bg-indigo-500",
  },
  global: {
    label: "global",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  environment: {
    label: "env var",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  default: {
    label: "built-in",
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
};

function SourceBadge({ source }: { source: SettingSource }) {
  const m = SOURCE_META[source];
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${m.badge}`}
    >
      {m.label}
    </span>
  );
}

/** The resolution chain popover: org → global → env → built-in, winner lit. */
function ResolutionPopover({ setting }: { setting: RuntimeSetting }) {
  const layers: {
    source: SettingSource;
    name: string;
    value: boolean | number | null;
    present: boolean;
  }[] = [
    {
      source: "organization",
      name: "Organization override",
      value: setting.org_value,
      present: setting.org_value !== null,
    },
    {
      source: "global",
      name: "Global default",
      value: setting.global_value,
      present: setting.global_value !== null,
    },
    {
      source: "environment",
      name: "Environment variable",
      value: setting.env_value,
      present: setting.env_value !== null,
    },
    {
      source: "default",
      name: "Built-in default",
      value: setting.default_value,
      present: true,
    },
  ];

  return (
    <Popover.Root>
      <Popover.Trigger
        className="cursor-pointer rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/40"
        aria-label="Show where this value comes from"
      >
        <SourceBadge source={setting.source} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end">
          <Popover.Popup className="z-50 w-72 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg outline-none">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Resolution order
            </p>
            <ol className="space-y-1">
              {layers.map((layer) => {
                const isWinner = layer.source === setting.source;
                return (
                  <li
                    key={layer.source}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md px-2 py-1.5",
                      isWinner
                        ? "bg-m3-primary/10 ring-1 ring-m3-primary/30"
                        : layer.present
                          ? ""
                          : "opacity-45",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          SOURCE_META[layer.source].dot,
                        )}
                      />
                      <span
                        className={cn(
                          isWinner
                            ? "font-semibold text-slate-900"
                            : "text-slate-600",
                        )}
                      >
                        {layer.name}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-slate-700">
                        {layer.present ? String(layer.value) : "—"}
                      </span>
                      {isWinner && (
                        <Check className="h-3.5 w-3.5 text-m3-primary" />
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Small </> button revealing the config key + env var, copy on click. */
function ConfigKeyReveal({
  setting,
  forceShow,
}: {
  setting: RuntimeSetting;
  forceShow: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const text = setting.env_var
      ? `${setting.key} · ${setting.env_var}`
      : setting.key;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };

  if (forceShow) {
    return (
      <button
        type="button"
        onClick={copy}
        title="Copy config key"
        className="group inline-flex items-center gap-1 font-mono text-xs text-slate-400 hover:text-slate-700"
      >
        <span>{setting.key}</span>
        {setting.env_var && <span className="text-slate-300">·</span>}
        {setting.env_var && <span>{setting.env_var}</span>}
        {copied ? (
          <Check className="h-3 w-3 text-emerald-600" />
        ) : (
          <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`${setting.key}${setting.env_var ? ` · ${setting.env_var}` : ""} — click to copy`}
      className="inline-flex items-center rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Code2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function NumberField({
  setting,
  value,
  onCommit,
  disabled,
}: {
  setting: RuntimeSetting;
  value: string;
  onCommit: (v: string) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const unit = unitFor(setting);
  const shown = draft !== null ? draft : value;

  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="number"
          className={cn(
            "w-full rounded-md border border-slate-300 py-1.5 pl-2.5 text-sm tabular-nums",
            "focus:border-m3-primary focus:outline-none focus:ring-1 focus:ring-m3-primary/40",
            unit ? "pr-10" : "pr-2.5",
          )}
          value={shown}
          step={setting.type === "float" ? "0.01" : "1"}
          min={setting.minimum ?? undefined}
          max={setting.maximum ?? undefined}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== null) {
              onCommit(draft);
              setDraft(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft !== null) {
              onCommit(draft);
              setDraft(null);
            }
            if (e.key === "Escape") setDraft(null);
          }}
        />
        {unit && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {unit}
          </span>
        )}
      </div>
      {setting.minimum !== null && setting.maximum !== null && (
        <p className="mt-1 text-[11px] text-slate-400">
          {setting.minimum}–{setting.maximum}
          {unit ? ` ${unit}` : ""}
        </p>
      )}
    </div>
  );
}

function SettingRow({
  setting,
  orgId,
  showKeys,
}: {
  setting: RuntimeSetting;
  orgId?: string;
  showKeys: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const setMutation = useSetRuntimeSetting(orgId);
  const clearMutation = useClearRuntimeSetting(orgId);

  const overrideAtThisScope =
    orgId !== undefined
      ? setting.org_value !== null
      : setting.global_value !== null;

  const save = (value: boolean | number) => {
    setMutation.mutate(
      { key: setting.key, value },
      {
        onSuccess: () => toast.success(`${setting.label} saved`),
        onError: (err: unknown) =>
          toast.error(err instanceof Error ? err.message : "Could not save"),
      },
    );
  };

  const commitNumber = (raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() === "" || Number.isNaN(parsed)) {
      toast.error(`${setting.label} must be a number`);
      return;
    }
    save(parsed);
  };

  // Split the description into a lead sentence (always shown) + the rest
  // (revealed on demand). The ingest guidance is worth keeping — just not all
  // of it, always, at full width.
  const [lead, ...restParts] = setting.description.split(/(?<=\.)\s+/);
  const rest = restParts.join(" ").trim();

  // Scope comparison: when editing an org, show the global default it would
  // fall back to alongside the org value.
  const showComparison = orgId !== undefined;
  const globalFallback =
    setting.global_value ?? setting.env_value ?? setting.default_value;

  const control =
    setting.type === "bool" ? (
      <div className="flex items-center gap-2">
        <Switch
          checked={Boolean(setting.effective_value)}
          disabled={setMutation.isPending}
          onCheckedChange={(c) => save(c)}
          aria-label={setting.label}
        />
        <span className="text-xs text-slate-500">
          {setting.effective_value ? "On" : "Off"}
        </span>
      </div>
    ) : (
      <NumberField
        setting={setting}
        value={String(setting.effective_value)}
        onCommit={commitNumber}
        disabled={setMutation.isPending}
      />
    );

  return (
    <div className="border-b border-slate-100 py-3.5 last:border-b-0">
      <div className="grid grid-cols-1 items-start gap-x-6 gap-y-2 md:grid-cols-[minmax(0,1fr)_200px]">
        {/* Label + description */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {setting.requires_reprocess && (
              <span
                title="Applies on next ingest"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
              />
            )}
            <span className="font-medium text-slate-900">{setting.label}</span>
            <ResolutionPopover setting={setting} />
            {rest && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={expanded ? "Hide details" : "Show details"}
                aria-expanded={expanded}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </button>
            )}
            <ConfigKeyReveal setting={setting} forceShow={showKeys} />
          </div>
          <p className="mt-1 max-w-[60ch] text-sm text-slate-600">{lead}</p>
          {expanded && rest && (
            <p className="mt-1 max-w-[60ch] text-sm text-slate-500">{rest}</p>
          )}
        </div>

        {/* Control column — fixed 200px so every right edge lines up. */}
        <div className="flex items-start gap-1.5">
          <div className="min-w-0 flex-1">
            {showComparison && (
              <p className="mb-1 text-[11px] text-slate-400">
                Global:{" "}
                <span className="font-mono text-slate-500">
                  {String(globalFallback)}
                </span>
              </p>
            )}
            {control}
          </div>
          <button
            type="button"
            title={
              overrideAtThisScope
                ? "Remove this override and fall back to the level below"
                : "Nothing is overridden at this scope"
            }
            className="mt-0.5 shrink-0 rounded-md p-1.5 text-slate-400 enabled:hover:bg-slate-100 enabled:hover:text-slate-700 disabled:opacity-30"
            disabled={!overrideAtThisScope || clearMutation.isPending}
            onClick={() =>
              clearMutation.mutate(setting.key, {
                onSuccess: () => toast.success(`${setting.label} reset`),
              })
            }
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Dense alternate layout as ONE hierarchical table: each group is a
 * collapsible parent row, each setting a child row. Using the shared DataTable
 * (rather than one <table> per group) means every column shares a single
 * layout, so Value / Default / Source / Scope line up across all groups
 * instead of each group's table sizing its own columns.
 */
type TableNode =
  | {
      kind: "group";
      id: string;
      group: string;
      overrideCount: number;
      count: number;
      children: TableNode[];
    }
  | { kind: "setting"; id: string; setting: RuntimeSetting };

function SettingsTable({
  groups,
  grouped,
  overrideCounts,
  orgId,
  showKeys,
}: {
  groups: readonly string[];
  grouped: Map<string, RuntimeSetting[]>;
  overrideCounts: Record<string, number>;
  orgId?: string;
  showKeys: boolean;
}) {
  const setMutation = useSetRuntimeSetting(orgId);
  const clearMutation = useClearRuntimeSetting(orgId);

  const scopeLabel = orgId ? "This org" : "Global";

  const nodes: TableNode[] = groups.map((group) => {
    const rows = grouped.get(group) ?? [];
    return {
      kind: "group" as const,
      id: `group:${group}`,
      group,
      overrideCount: overrideCounts[group] ?? 0,
      count: rows.length,
      children: rows.map((s) => ({
        kind: "setting" as const,
        id: s.key,
        setting: s,
      })),
    };
  });

  const overrideAtScope = (s: RuntimeSetting) =>
    orgId !== undefined ? s.org_value !== null : s.global_value !== null;

  const columns: DataTableColumn<TableNode>[] = [
    {
      id: "setting",
      header: "Setting",
      cell: (node) => {
        if (node.kind === "group") {
          return (
            <span className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                {GROUP_LABELS[node.group] ?? node.group}
              </span>
              <span className="text-xs font-normal text-slate-400">
                {node.count}
              </span>
              {node.overrideCount > 0 && (
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                  {node.overrideCount} overridden
                </span>
              )}
            </span>
          );
        }
        const s = node.setting;
        return (
          <span className="flex flex-col">
            <span className="flex items-center gap-1.5">
              {s.requires_reprocess && (
                <span
                  title="Applies on next ingest"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                />
              )}
              <span className="font-medium text-slate-800">{s.label}</span>
            </span>
            {showKeys && (
              <span className="font-mono text-[11px] text-slate-400">
                {s.key}
              </span>
            )}
          </span>
        );
      },
    },
    {
      id: "value",
      header: "Value",
      width: 140,
      cell: (node) => {
        if (node.kind === "group") return null;
        const s = node.setting;
        return s.type === "bool" ? (
          <Switch
            checked={Boolean(s.effective_value)}
            disabled={setMutation.isPending}
            onCheckedChange={(c) => setMutation.mutate({ key: s.key, value: c })}
            aria-label={s.label}
          />
        ) : (
          <input
            type="number"
            defaultValue={String(s.effective_value)}
            step={s.type === "float" ? "0.01" : "1"}
            min={s.minimum ?? undefined}
            max={s.maximum ?? undefined}
            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm tabular-nums focus:border-m3-primary focus:outline-none focus:ring-1 focus:ring-m3-primary/40"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = Number((e.target as HTMLInputElement).value);
                if (!Number.isNaN(v)) setMutation.mutate({ key: s.key, value: v });
              }
            }}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v) && v !== Number(s.effective_value))
                setMutation.mutate({ key: s.key, value: v });
            }}
          />
        );
      },
    },
    {
      id: "default",
      header: "Default",
      width: 100,
      cell: (node) => {
        if (node.kind === "group") return null;
        const s = node.setting;
        const unit = unitFor(s);
        return (
          <span className="font-mono text-xs text-slate-500">
            {String(s.default_value)}
            {unit ? ` ${unit}` : ""}
          </span>
        );
      },
    },
    {
      id: "source",
      header: "Source",
      width: 120,
      cell: (node) =>
        node.kind === "group" ? null : (
          <ResolutionPopover setting={node.setting} />
        ),
    },
    {
      id: "scope",
      header: scopeLabel,
      width: 110,
      cell: (node) =>
        node.kind === "group" ? null : (
          <span className="text-xs text-slate-500">
            {overrideAtScope(node.setting) ? "overridden" : "inherited"}
          </span>
        ),
    },
  ];

  return (
    <DataTable<TableNode>
      columns={columns}
      data={nodes}
      getRowId={(n) => n.id}
      getSubRows={(n) => (n.kind === "group" ? n.children : undefined)}
      defaultExpanded
      rowClassName={(n) =>
        n.kind === "group" ? "bg-slate-50/60" : undefined
      }
      actionsHeader={<span className="sr-only">Reset</span>}
      actions={(node) => {
        if (node.kind === "group") return null;
        const s = node.setting;
        const canReset = overrideAtScope(s);
        return (
          <button
            type="button"
            title={
              canReset
                ? "Remove this override"
                : "Nothing overridden at this scope"
            }
            className="rounded-md p-1 text-slate-400 enabled:hover:bg-slate-100 enabled:hover:text-slate-700 disabled:opacity-30"
            disabled={!canReset || clearMutation.isPending}
            onClick={() => clearMutation.mutate(s.key)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        );
      }}
    />
  );
}

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  // "" is the global scope; a uuid selects one organization's overrides.
  const [orgId, setOrgId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [overriddenOnly, setOverriddenOnly] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [dense, setDense] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  const orgs = useOrganizations({ limit: 200 });
  const settings = useRuntimeSettings(orgId || undefined);

  const isOverriddenAtScope = (s: RuntimeSetting) =>
    orgId ? s.org_value !== null : s.global_value !== null;

  // Filter (search + overridden-only) then group in registry order.
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, RuntimeSetting[]>();
    for (const s of settings.data ?? []) {
      if (overriddenOnly && !isOverriddenAtScope(s)) continue;
      if (
        q &&
        !s.label.toLowerCase().includes(q) &&
        !s.key.toLowerCase().includes(q) &&
        !(s.env_var ?? "").toLowerCase().includes(q) &&
        !s.description.toLowerCase().includes(q)
      )
        continue;
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.data, search, overriddenOnly, orgId]);

  const visibleGroups = GROUP_ORDER.filter((g) => grouped.has(g));

  // Total override count at this scope (across everything, ignoring filters).
  const overrideCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of settings.data ?? []) {
      if (isOverriddenAtScope(s))
        counts[s.group] = (counts[s.group] ?? 0) + 1;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.data, orgId]);
  const totalOverrides = Object.values(overrideCounts).reduce(
    (a, b) => a + b,
    0,
  );

  // Scroll-spy for the section rail. The section rail is what navigates; the
  // toolbar and section headers are NOT sticky, so a fixed activation line
  // near the top of the viewport is all we need.
  const contentRef = useRef<HTMLDivElement>(null);
  const SPY_LINE = 120;

  useEffect(() => {
    if (dense) return;
    const onScroll = () => {
      let current = "";
      for (const g of visibleGroups) {
        const el = document.getElementById(`section-${g}`);
        if (el && el.getBoundingClientRect().top <= SPY_LINE + 4) current = g;
      }
      // A short final section can never scroll its top past the activation
      // line — the page bottom stops first — so it would never highlight.
      // When we're within a hair of the bottom, force the last section active
      // regardless of its top.
      const doc = document.documentElement;
      const atBottom =
        window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
      if (atBottom && visibleGroups.length > 0) {
        current = visibleGroups[visibleGroups.length - 1];
      }
      setActiveSection(current || visibleGroups[0] || "");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [dense, visibleGroups]);

  const scrollToSection = (g: string) => {
    const el = document.getElementById(`section-${g}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - (SPY_LINE + 8);
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  return (
    <div className="px-4 py-6">
      <div className="mx-auto flex max-w-[1440px] gap-8">
        {/* ── Section rail ── */}
        {!dense && (
          <aside className="hidden w-[200px] shrink-0 lg:block">
            <div className="sticky top-24">
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Sections
              </p>
              <nav className="space-y-0.5">
                {visibleGroups.map((g) => {
                  const count = overrideCounts[g] ?? 0;
                  const active = g === activeSection;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => scrollToSection(g)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        active
                          ? "bg-m3-primary/10 font-semibold text-m3-primary"
                          : "text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      <span className="truncate">{GROUP_LABELS[g] ?? g}</span>
                      {count > 0 && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                            active
                              ? "bg-m3-primary text-white"
                              : "bg-indigo-100 text-indigo-700",
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>
        )}

        {/* ── Content ── In table mode the rail is hidden, so drop the width
            cap and let the table fill the (centered) container — otherwise the
            capped column hugs the left edge with dead space on the right. */}
        <div
          ref={contentRef}
          className={cn("min-w-0 flex-1", !dense && "lg:max-w-[1040px]")}
        >
          <h1 className="text-2xl font-semibold text-slate-900">
            {t("admin.settings.title", { defaultValue: "Runtime settings" })}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ingestion and retrieval behaviour, changeable without a deploy.
            Resolves organization → global → environment → built-in.
          </p>

          {/* ── Toolbar ── (not sticky: kept overlapping the section headers) */}
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

              <button
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
              </button>

              <button
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
              </button>
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

          {settings.isLoading && (
            <p className="mt-8 text-sm text-slate-500">Loading…</p>
          )}
          {settings.isError && (
            <p className="mt-8 text-sm text-red-600">
              Could not load settings. You may not have permission for this
              scope.
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
              />
            </div>
          )}

          {settings.data && !dense && visibleGroups.length > 0 && (
            <div className="mt-4 space-y-6">
              {visibleGroups.map((group) => {
                const rows = grouped.get(group) ?? [];
                const anyReprocess = rows.some((r) => r.requires_reprocess);
                return (
                  <section
                    key={group}
                    id={`section-${group}`}
                    className="rounded-lg border border-slate-200 bg-white"
                    style={{ scrollMarginTop: SPY_LINE + 8 }}
                  >
                    {/* Section header — plain (not sticky), so it never
                        overlaps or gets overlapped. The section rail handles
                        jumping between sections. */}
                    <div className="rounded-t-lg border-b border-slate-200 bg-white px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-slate-900">
                          {GROUP_LABELS[group] ?? group}
                        </h2>
                        <span className="text-xs text-slate-400">
                          {rows.length} setting{rows.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {anyReprocess && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-amber-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          {REPROCESS_NOTE}
                        </p>
                      )}
                    </div>
                    <div className="px-5">
                      {rows.map((setting) => (
                        <SettingRow
                          key={setting.key}
                          setting={setting}
                          orgId={orgId || undefined}
                          showKeys={showKeys}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Long scrolling page — floating jump back to top. */}
      <ScrollToTop />
    </div>
  );
}
