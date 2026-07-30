import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

import {
  useClearRuntimeSetting,
  useRuntimeSettings,
  useSetRuntimeSetting,
  type RuntimeSetting,
  type SettingSource,
} from "@/lib/api/hooks/admin-settings";
import { useOrganizations } from "@/lib/api/hooks/admin-organizations";

const GROUP_ORDER = [
  "ai",
  "chunking",
  "preprocessing",
  "knowledge_graph",
  "retrieval",
  "notifications",
] as const;

const GROUP_LABELS: Record<string, string> = {
  ai: "AI models (timeouts & retry)",
  chunking: "Chunking",
  preprocessing: "Document preprocessing",
  knowledge_graph: "Knowledge graph",
  retrieval: "Retrieval",
  notifications: "Notifications",
};

/**
 * Where the value in force came from. This is the column that makes the page
 * answer the question an operator actually has — "is this 800 because someone
 * chose it, or because nobody has?" — rather than just showing a number.
 */
function SourceBadge({ source }: { source: SettingSource }) {
  const styles: Record<SettingSource, string> = {
    organization: "bg-indigo-100 text-indigo-700",
    global: "bg-emerald-100 text-emerald-700",
    environment: "bg-amber-100 text-amber-700",
    default: "bg-slate-100 text-slate-600",
  };
  const labels: Record<SettingSource, string> = {
    organization: "org override",
    global: "global",
    environment: "env var",
    default: "default",
  };
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${styles[source]}`}
    >
      {labels[source]}
    </span>
  );
}

function SettingRow({
  setting,
  orgId,
}: {
  setting: RuntimeSetting;
  orgId?: string;
}) {
  // The value the caller has typed but not yet saved. `null` means "showing
  // the server's value" — distinct from an empty string, which is a field the
  // user has cleared and must not be silently re-populated under them.
  const [draft, setDraft] = useState<string | null>(null);
  const setMutation = useSetRuntimeSetting(orgId);
  const clearMutation = useClearRuntimeSetting(orgId);

  // An override exists at THIS scope — the only thing "Reset" can remove.
  const overrideAtThisScope =
    orgId !== undefined ? setting.org_value !== null : setting.global_value !== null;

  const save = (value: boolean | number) => {
    setMutation.mutate(
      { key: setting.key, value },
      {
        onSuccess: () => {
          setDraft(null);
          toast.success(`${setting.label} saved`);
        },
        onError: (err: unknown) =>
          toast.error(err instanceof Error ? err.message : "Could not save"),
      },
    );
  };

  const commitNumber = () => {
    if (draft === null) return;
    const parsed = Number(draft);
    if (draft.trim() === "" || Number.isNaN(parsed)) {
      toast.error(`${setting.label} must be a number`);
      return;
    }
    save(parsed);
  };

  const shown =
    draft !== null ? draft : String(setting.effective_value);

  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 py-4 last:border-b-0 md:flex-row md:items-start md:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">{setting.label}</span>
          <SourceBadge source={setting.source} />
          {setting.requires_reprocess && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              applies on next ingest
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-600">{setting.description}</p>
        <p className="mt-1 font-mono text-xs text-slate-400">
          {setting.key}
          {setting.env_var ? ` · ${setting.env_var}` : ""}
          {" · default "}
          {String(setting.default_value)}
          {setting.minimum !== null && setting.maximum !== null
            ? ` · range ${setting.minimum}–${setting.maximum}`
            : ""}
        </p>
      </div>

      <div className="flex items-center gap-2 md:w-64 md:justify-end">
        {setting.type === "bool" ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={Boolean(setting.effective_value)}
              disabled={setMutation.isPending}
              onChange={(e) => save(e.target.checked)}
            />
            <span>{setting.effective_value ? "Enabled" : "Disabled"}</span>
          </label>
        ) : (
          <input
            type="number"
            className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={shown}
            step={setting.type === "float" ? "0.01" : "1"}
            min={setting.minimum ?? undefined}
            max={setting.maximum ?? undefined}
            disabled={setMutation.isPending}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitNumber}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitNumber();
              if (e.key === "Escape") setDraft(null);
            }}
          />
        )}

        <button
          type="button"
          title={
            overrideAtThisScope
              ? "Remove this override and fall back to the level below"
              : "Nothing is overridden at this scope"
          }
          className="rounded-md p-1.5 text-slate-400 enabled:hover:bg-slate-100 enabled:hover:text-slate-700 disabled:opacity-30"
          disabled={!overrideAtThisScope || clearMutation.isPending}
          onClick={() =>
            clearMutation.mutate(setting.key, {
              onSuccess: () => {
                setDraft(null);
                toast.success(`${setting.label} reset`);
              },
            })
          }
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  // "" is the global scope; a uuid selects one organization's overrides.
  const [orgId, setOrgId] = useState<string>("");
  const orgs = useOrganizations({ limit: 200 });
  const settings = useRuntimeSettings(orgId || undefined);

  const grouped = useMemo(() => {
    const map = new Map<string, RuntimeSetting[]>();
    for (const s of settings.data ?? []) {
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return map;
  }, [settings.data]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">
        {t("admin.settings.title", { defaultValue: "Runtime settings" })}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Ingestion and retrieval behaviour, changeable without a deploy. A value
        resolves as organization override → global default → environment
        variable → built-in default.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <label htmlFor="scope" className="text-sm font-medium text-slate-700">
          Scope
        </label>
        <select
          id="scope"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
        >
          <option value="">Global default (all organizations)</option>
          {orgs.items.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {orgId && (
        <p className="mt-3 rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
          Editing overrides for this organization only. Settings left untouched
          keep following the global default.
        </p>
      )}

      {settings.isLoading && (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      )}
      {settings.isError && (
        <p className="mt-8 text-sm text-red-600">
          Could not load settings. You may not have permission for this scope.
        </p>
      )}

      {settings.data && (
        <div className="mt-6 space-y-8">
          {GROUP_ORDER.filter((g) => grouped.has(g)).map((group) => (
            <section
              key={group}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {GROUP_LABELS[group] ?? group}
              </h2>
              <div className="mt-2">
                {(grouped.get(group) ?? []).map((setting) => (
                  <SettingRow
                    key={setting.key}
                    setting={setting}
                    orgId={orgId || undefined}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
