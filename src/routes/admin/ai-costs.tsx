import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Activity,
  CircleDollarSign,
  Clock,
  Cpu,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useAiCostsByPipeline,
  useAiCostsByUser,
  useAiCostsSummary,
  useAiModelPricing,
  useCreateAiModelPricing,
  useDeleteAiModelPricing,
  useRecentAiCalls,
  useUpdateAiModelPricing,
  type AiCostsPeriod,
  type AiModelPricingInput,
} from "@/lib/api/hooks/admin";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet,
  SheetClose,
  SheetContent,
} from "@/components/ui/sheet";
import { ApiError } from "@/lib/api/client";
import type {
  AiCostsByPipeline as AiCostsByPipelineRow,
  AiCostsByUser as AiCostsByUserRow,
  AiCostsRecentCall,
  AiCostsRoleBreakdown,
  AiCostsStageBreakdown,
  AiCostsSummary,
  AiModelPricing,
} from "@/lib/api/types";

type AiCostsTimeBucket = AiCostsSummary["buckets"][number];

const PERIOD_VALUES: AiCostsPeriod[] = ["24h", "7d", "30d"];

function useFormatters() {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi" ? "vi-VN" : "en-US";
  return useMemo(
    () => ({
      usd: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 4,
      }),
      number: new Intl.NumberFormat(locale),
      datetime: new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
      }),
    }),
    [locale],
  );
}

function ChartTooltipUsd({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: Record<string, unknown> }[];
  label?: string;
}) {
  const fmt = useFormatters();
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value;
  return (
    <div className="bg-surface-elev border border-border rounded-md px-3 py-2 shadow-editorial">
      <p className="text-xs font-semibold text-text-strong">{label}</p>
      <p className="text-xs text-text-muted mt-0.5">{fmt.usd.format(value)}</p>
    </div>
  );
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: AiCostsPeriod;
  onChange: (next: AiCostsPeriod) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={t("admin.ai_costs.period_aria")}
      className="inline-flex flex-wrap gap-2 bg-surface-elev border border-border rounded-lg p-1"
    >
      {PERIOD_VALUES.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p)}
            className={
              active
                ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white cursor-pointer"
                : "px-3 py-1.5 text-xs font-semibold rounded-md text-text-strong hover:bg-surface-muted cursor-pointer transition-colors duration-200"
            }
          >
            {t(`admin.ai_costs.period_options.${p}`)}
          </button>
        );
      })}
    </div>
  );
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey?: string; payload: AiCostsTimeBucket }[];
  label?: string;
}) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-surface-elev border border-border rounded-md px-3 py-2 shadow-editorial space-y-1">
      <p className="text-xs font-semibold text-text-strong">{label}</p>
      <p className="text-xs text-primary">
        {t("admin.ai_costs.trend_legend.cost")}: {fmt.usd.format(point.usd)}
      </p>
      <p className="text-xs text-text-muted">
        {t("admin.ai_costs.trend_legend.tokens")}: {fmt.number.format(point.tokens)}
      </p>
    </div>
  );
}

function TrendAreaChart({ data, period }: { data: AiCostsTimeBucket[]; period: AiCostsPeriod }) {
  const { t, i18n } = useTranslation();
  const fmt = useFormatters();
  const reducedMotion = useReducedMotion();

  const locale = (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi" ? "vi-VN" : "en-US";
  const labelFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        ...(period === "24h" ? { hour: "2-digit" } : {}),
      }),
    [locale, period],
  );

  const chartData = useMemo(
    () =>
      data.map((b) => ({
        ...b,
        label: labelFmt.format(new Date(b.bucket_start_ts)),
      })),
    [data, labelFmt],
  );

  if (data.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">{t("admin.ai_costs.empty.trend")}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="aiCostTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
          />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => fmt.usd.format(value)}
            width={80}
          />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: "var(--color-primary)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="usd"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#aiCostTrendFill)"
            isAnimationActive={!reducedMotion}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RoleBarChart({ data }: { data: AiCostsRoleBreakdown[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const reducedMotion = useReducedMotion();
  if (data.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">{t("admin.ai_costs.empty.by_role")}</p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="role" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} stroke="var(--color-border)" />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => fmt.usd.format(value)}
            width={80}
          />
          <Tooltip content={<ChartTooltipUsd />} cursor={{ fill: "var(--color-surface-muted)" }} />
          <Bar dataKey="usd" fill="var(--color-primary)" radius={[6, 6, 0, 0]} isAnimationActive={!reducedMotion} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StageBarChart({ data }: { data: AiCostsStageBreakdown[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const reducedMotion = useReducedMotion();
  if (data.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">{t("admin.ai_costs.empty.by_stage")}</p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="stage_name" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} stroke="var(--color-border)" />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => fmt.usd.format(value)}
            width={80}
          />
          <Tooltip content={<ChartTooltipUsd />} cursor={{ fill: "var(--color-surface-muted)" }} />
          <Bar dataKey="usd" fill="var(--color-primary)" radius={[6, 6, 0, 0]} isAnimationActive={!reducedMotion} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopUsersTable({ rows }: { rows: AiCostsByUserRow[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const columns: DataTableColumn<AiCostsByUserRow>[] = [
    {
      id: "user",
      header: t("admin.ai_costs.cols.user"),
      cell: (r) => <span className="font-medium text-text-strong">{r.display_name}</span>,
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-strong">{fmt.usd.format(r.total_usd ?? 0)}</span>
      ),
    },
    {
      id: "tokens",
      header: t("admin.ai_costs.cols.tokens"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">{fmt.number.format(r.total_tokens ?? 0)}</span>
      ),
    },
    {
      id: "calls",
      header: t("admin.ai_costs.cols.calls"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">{fmt.number.format(r.call_count ?? 0)}</span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.user_id}
      pagination
      pageSize={10}
      pageSizeOptions={[10, 20, 50]}
      emptyState={t("admin.ai_costs.empty.users")}
    />
  );
}

function PipelineTable({ rows }: { rows: AiCostsByPipelineRow[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const columns: DataTableColumn<AiCostsByPipelineRow>[] = [
    {
      id: "pipeline",
      header: t("admin.ai_costs.cols.pipeline"),
      cell: (r) => (
        <span className="font-mono text-xs text-text-strong">
          {r.pipeline_run_id.slice(0, 8)}…
        </span>
      ),
    },
    {
      id: "type",
      header: t("admin.ai_costs.cols.type"),
      cell: (r) => <span className="text-text-muted">{r.generation_type ?? "—"}</span>,
    },
    {
      id: "calls",
      header: t("admin.ai_costs.cols.calls"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">{fmt.number.format(r.call_count ?? 0)}</span>
      ),
    },
    {
      id: "tokens",
      header: t("admin.ai_costs.cols.tokens"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">{fmt.number.format(r.total_tokens ?? 0)}</span>
      ),
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-strong">{fmt.usd.format(r.total_usd ?? 0)}</span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.pipeline_run_id}
      pagination
      pageSize={10}
      pageSizeOptions={[10, 20, 50]}
      emptyState={t("admin.ai_costs.empty.pipelines")}
    />
  );
}

function RecentCallsTable({ rows }: { rows: AiCostsRecentCall[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const columns: DataTableColumn<AiCostsRecentCall>[] = [
    {
      id: "time",
      header: t("admin.ai_costs.cols.time"),
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-text-muted">
          {r.created_at ? fmt.datetime.format(new Date(r.created_at)) : "—"}
        </span>
      ),
    },
    {
      id: "model",
      header: t("admin.ai_costs.cols.model"),
      cell: (r) => <span className="font-mono text-xs text-text-strong">{r.model ?? "—"}</span>,
    },
    {
      id: "role",
      header: t("admin.ai_costs.cols.role"),
      cell: (r) => <span className="text-text-muted">{r.role ?? "—"}</span>,
    },
    {
      id: "stage",
      header: t("admin.ai_costs.cols.stage"),
      cell: (r) => <span className="text-text-muted">{r.stage_name ?? "—"}</span>,
    },
    {
      id: "latency",
      header: t("admin.ai_costs.cols.latency"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {r.latency_ms !== null && r.latency_ms !== undefined
            ? `${fmt.number.format(r.latency_ms)} ms`
            : "—"}
        </span>
      ),
    },
    {
      id: "tokens",
      header: t("admin.ai_costs.cols.tokens_short"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-muted">{fmt.number.format(r.tokens ?? 0)}</span>
      ),
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost_short"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-strong">{fmt.usd.format(r.usd ?? 0)}</span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      pagination
      pageSize={15}
      pageSizeOptions={[15, 30, 50]}
      emptyState={t("admin.ai_costs.empty.recent")}
    />
  );
}

interface PricingFormState {
  model_name: string;
  input_usd_per_1k: string;
  output_usd_per_1k: string;
  notes: string;
}

const EMPTY_PRICING_FORM: PricingFormState = {
  model_name: "",
  input_usd_per_1k: "",
  output_usd_per_1k: "",
  notes: "",
};

function PricingFormSheet({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AiModelPricing | null;
  onSubmit: (values: AiModelPricingInput) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<PricingFormState>(EMPTY_PRICING_FORM);

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            model_name: editing.model_name,
            input_usd_per_1k: String(editing.input_usd_per_1k),
            output_usd_per_1k: String(editing.output_usd_per_1k),
            notes: editing.notes ?? "",
          }
        : EMPTY_PRICING_FORM,
    );
  }, [open, editing]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const inputRate = Number(form.input_usd_per_1k);
    const outputRate = Number(form.output_usd_per_1k);
    if (!form.model_name.trim() || Number.isNaN(inputRate) || Number.isNaN(outputRate)) {
      return;
    }
    onSubmit({
      model_name: form.model_name.trim(),
      input_usd_per_1k: inputRate,
      output_usd_per_1k: outputRate,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-6">
        <h2 className="font-headline text-lg font-bold text-text-strong">
          {editing ? t("admin.ai_costs.pricing.edit_title") : t("admin.ai_costs.pricing.add_title")}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted">
              {t("admin.ai_costs.pricing.fields.model_name")}
            </label>
            <Input
              value={form.model_name}
              disabled={Boolean(editing)}
              onChange={(e) => setForm((f) => ({ ...f, model_name: e.target.value }))}
              placeholder="gpt-4o-mini"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted">
              {t("admin.ai_costs.pricing.fields.input_rate")}
            </label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              value={form.input_usd_per_1k}
              onChange={(e) => setForm((f) => ({ ...f, input_usd_per_1k: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted">
              {t("admin.ai_costs.pricing.fields.output_rate")}
            </label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              value={form.output_usd_per_1k}
              onChange={(e) => setForm((f) => ({ ...f, output_usd_per_1k: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted">
              {t("admin.ai_costs.pricing.fields.notes")}
            </label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <SheetClose render={<Button type="button" variant="ghost" />}>
              {t("admin.ai_costs.pricing.cancel")}
            </SheetClose>
            <Button type="submit" disabled={isPending}>
              {t("admin.ai_costs.pricing.save")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function PricingSection() {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const pricing = useAiModelPricing();
  const createMutation = useCreateAiModelPricing();
  const updateMutation = useUpdateAiModelPricing();
  const deleteMutation = useDeleteAiModelPricing();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<AiModelPricing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiModelPricing | null>(null);

  const handleSubmit = (values: AiModelPricingInput) => {
    const onError = (err: unknown) => {
      const message = err instanceof ApiError ? err.message : undefined;
      toast.error(message ?? t("admin.ai_costs.pricing.save_failed"));
    };
    if (editing) {
      updateMutation.mutate(
        {
          id: editing.id,
          input_usd_per_1k: values.input_usd_per_1k,
          output_usd_per_1k: values.output_usd_per_1k,
          notes: values.notes,
        },
        {
          onSuccess: () => {
            toast.success(t("admin.ai_costs.pricing.save_success"));
            setSheetOpen(false);
          },
          onError,
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success(t("admin.ai_costs.pricing.save_success"));
          setSheetOpen(false);
        },
        onError,
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t("admin.ai_costs.pricing.delete_success"));
        setDeleteTarget(null);
      },
      onError: () => {
        toast.error(t("admin.ai_costs.pricing.delete_failed"));
      },
    });
  };

  const columns: DataTableColumn<AiModelPricing>[] = [
    {
      id: "model",
      header: t("admin.ai_costs.cols.model"),
      cell: (r) => (
        <div>
          <span className="font-mono text-xs text-text-strong">{r.model_name}</span>
          {r.notes ? <p className="mt-0.5 text-xs text-text-muted">{r.notes}</p> : null}
        </div>
      ),
    },
    {
      id: "input_rate",
      header: t("admin.ai_costs.pricing.cols.input_rate"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-strong">{fmt.usd.format(r.input_usd_per_1k)}</span>
      ),
    },
    {
      id: "output_rate",
      header: t("admin.ai_costs.pricing.cols.output_rate"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-strong">{fmt.usd.format(r.output_usd_per_1k)}</span>
      ),
    },
    {
      id: "updated",
      header: t("admin.ai_costs.pricing.cols.updated"),
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-text-muted">
          {fmt.datetime.format(new Date(r.updated_at))}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-text-muted">{t("admin.ai_costs.pricing.subtitle")}</p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t("admin.ai_costs.pricing.add")}
        </Button>
      </div>

      {pricing.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">{t("admin.ai_costs.pricing.load_failed")}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={pricing.data ?? []}
          getRowId={(r) => r.id}
          loading={pricing.isLoading}
          emptyState={t("admin.ai_costs.empty.pricing")}
          actionsHeader={t("admin.ai_costs.cols.actions")}
          actions={(r) => (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("admin.ai_costs.pricing.edit")}
                onClick={() => {
                  setEditing(r);
                  setSheetOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("admin.ai_costs.pricing.delete_confirm")}
                onClick={() => setDeleteTarget(r)}
              >
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
          )}
        />
      )}

      <PricingFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("admin.ai_costs.pricing.delete_title")}
        description={t("admin.ai_costs.pricing.delete_description", {
          model: deleteTarget?.model_name ?? "",
        })}
        confirmLabel={t("admin.ai_costs.pricing.delete_confirm")}
        cancelLabel={t("admin.ai_costs.pricing.cancel")}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}

export default function AdminAiCostsPage() {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const navigate = useNavigate();
  const permissions = useMyPermissions();
  const canAdmin =
    permissions.data?.permissions.includes("system.administer") ?? false;

  const [period, setPeriod] = useState<AiCostsPeriod>("30d");

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canAdmin) {
      toast.error(t("admin.users.roles.errors.no_permission"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canAdmin, navigate, t]);

  const summary = useAiCostsSummary(period);
  const byUser = useAiCostsByUser({ period, topN: 20 });
  const byPipeline = useAiCostsByPipeline({ period });
  const recent = useRecentAiCalls({ limit: 50 });

  if (permissions.isLoading || !canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  const totals = summary.data?.totals;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-text-strong">
            {t("admin.ai_costs.title")}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t("admin.ai_costs.subtitle")}
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {summary.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">{t("admin.ai_costs.summary_load_failed")}</p>
        </div>
      ) : summary.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label={t("admin.ai_costs.stats.total_cost")}
            value={totals?.usd !== undefined && totals?.usd !== null ? fmt.usd.format(totals.usd) : "—"}
            icon={CircleDollarSign}
          />
          <StatCard
            label={t("admin.ai_costs.stats.total_tokens")}
            value={totals?.tokens !== undefined && totals?.tokens !== null ? fmt.number.format(totals.tokens) : "—"}
            icon={Cpu}
          />
          <StatCard
            label={t("admin.ai_costs.stats.call_count")}
            value={totals?.call_count !== undefined && totals?.call_count !== null ? fmt.number.format(totals.call_count) : "—"}
            icon={Activity}
          />
          <StatCard
            label={t("admin.ai_costs.stats.period")}
            value={t(`admin.ai_costs.period_short.${period}`)}
            icon={Clock}
          />
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.trend")}
        </h2>
        {summary.isLoading ? (
          <div className="h-[280px] bg-surface-muted animate-pulse rounded-lg" />
        ) : (
          <TrendAreaChart data={summary.data?.buckets ?? []} period={period} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.by_role")}
        </h2>
        {summary.isLoading ? (
          <div className="h-[300px] bg-surface-muted animate-pulse rounded-lg" />
        ) : (
          <RoleBarChart data={summary.data?.by_role ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.by_stage")}
        </h2>
        {summary.isLoading ? (
          <div className="h-[300px] bg-surface-muted animate-pulse rounded-lg" />
        ) : (
          <StageBarChart data={summary.data?.by_stage ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.top_users")}
        </h2>
        {byUser.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">{t("admin.ai_costs.users_load_failed")}</p>
          </div>
        ) : byUser.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-surface-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <TopUsersTable rows={byUser.data ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.top_pipelines")}
        </h2>
        {byPipeline.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">{t("admin.ai_costs.pipelines_load_failed")}</p>
          </div>
        ) : byPipeline.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-surface-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <PipelineTable rows={byPipeline.data ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.recent_calls")}
        </h2>
        {recent.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">{t("admin.ai_costs.recent_load_failed")}</p>
          </div>
        ) : recent.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-surface-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <RecentCallsTable rows={recent.data ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.pricing")}
        </h2>
        <PricingSection />
      </section>
    </div>
  );
}
