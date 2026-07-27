import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  CircleDollarSign,
  Clock,
  Cpu,
  Download,
  Pencil,
  Plus,
  Trash2,
  X,
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
  useAiCostsByCategory,
  useAiCostsByModel,
  useAiCostsByPipeline,
  useAiCostsByUser,
  useAiCostsSummary,
  useAiModelPricing,
  useCreateAiModelPricing,
  useDeleteAiModelPricing,
  useRecentAiCalls,
  useUpdateAiModelPricing,
  type AiCostsDimension,
  type AiCostsFilters,
  type AiCostsPeriod,
  type AiModelPricingInput,
} from "@/lib/api/hooks/admin";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { downloadCsv } from "@/lib/csv-export";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { ApiError } from "@/lib/api/client";
import type {
  AiCostsByCategory as AiCostsByCategoryRow,
  AiCostsByModel as AiCostsByModelRow,
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
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
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
        {t("admin.ai_costs.trend_legend.tokens")}:{" "}
        {fmt.number.format(point.tokens)}
      </p>
    </div>
  );
}

function TrendAreaChart({
  data,
  period,
}: {
  data: AiCostsTimeBucket[];
  period: AiCostsPeriod;
}) {
  const { t, i18n } = useTranslation();
  const fmt = useFormatters();
  const reducedMotion = useReducedMotion();

  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
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
        <p className="text-sm text-text-muted">
          {t("admin.ai_costs.empty.trend")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <defs>
            <linearGradient id="aiCostTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-primary)"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="var(--color-primary)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
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
          <Tooltip
            content={<TrendTooltip />}
            cursor={{ stroke: "var(--color-primary)", strokeWidth: 1 }}
          />
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
        <p className="text-sm text-text-muted">
          {t("admin.ai_costs.empty.by_role")}
        </p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="role"
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
          />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => fmt.usd.format(value)}
            width={80}
          />
          <Tooltip
            content={<ChartTooltipUsd />}
            cursor={{ fill: "var(--color-surface-muted)" }}
          />
          <Bar
            dataKey="usd"
            fill="var(--color-primary)"
            radius={[6, 6, 0, 0]}
            isAnimationActive={!reducedMotion}
          />
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
        <p className="text-sm text-text-muted">
          {t("admin.ai_costs.empty.by_stage")}
        </p>
      </div>
    );
  }
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="stage_name"
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
          />
          <YAxis
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => fmt.usd.format(value)}
            width={80}
          />
          <Tooltip
            content={<ChartTooltipUsd />}
            cursor={{ fill: "var(--color-surface-muted)" }}
          />
          <Bar
            dataKey="usd"
            fill="var(--color-primary)"
            radius={[6, 6, 0, 0]}
            isAnimationActive={!reducedMotion}
          />
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
      sortable: true,
      sortValue: (r) => r.display_name ?? "",
      cell: (r) => (
        <span className="font-medium text-text-strong">{r.display_name}</span>
      ),
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.total_usd ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.total_usd ?? 0)}
        </span>
      ),
    },
    {
      id: "tokens",
      header: t("admin.ai_costs.cols.tokens"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.total_tokens ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.total_tokens ?? 0)}
        </span>
      ),
    },
    {
      id: "calls",
      header: t("admin.ai_costs.cols.calls"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.call_count ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.call_count ?? 0)}
        </span>
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

function PipelineTable({
  rows,
  onRowClick,
}: {
  rows: AiCostsByPipelineRow[];
  onRowClick: (row: AiCostsByPipelineRow) => void;
}) {
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
      sortable: true,
      sortValue: (r) => r.generation_type ?? "",
      cell: (r) => (
        <span className="text-text-muted">{r.generation_type ?? "—"}</span>
      ),
    },
    {
      id: "calls",
      header: t("admin.ai_costs.cols.calls"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.call_count ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.call_count ?? 0)}
        </span>
      ),
    },
    {
      id: "tokens",
      header: t("admin.ai_costs.cols.tokens"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.total_tokens ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.total_tokens ?? 0)}
        </span>
      ),
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.total_usd ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.total_usd ?? 0)}
        </span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.pipeline_run_id}
      onRowClick={onRowClick}
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
      sortable: true,
      sortValue: (r) => (r.created_at ? new Date(r.created_at) : new Date(0)),
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-text-muted">
          {r.created_at ? fmt.datetime.format(new Date(r.created_at)) : "—"}
        </span>
      ),
    },
    {
      id: "model",
      header: t("admin.ai_costs.cols.model"),
      sortable: true,
      sortValue: (r) => r.model ?? "",
      cell: (r) => (
        <span className="font-mono text-xs text-text-strong">
          {r.model ?? "—"}
        </span>
      ),
    },
    {
      id: "role",
      header: t("admin.ai_costs.cols.role"),
      sortable: true,
      sortValue: (r) => r.role ?? "",
      cell: (r) => <span className="text-text-muted">{r.role ?? "—"}</span>,
    },
    {
      id: "stage",
      header: t("admin.ai_costs.cols.stage"),
      cell: (r) => (
        <span className="text-text-muted">{r.stage_name ?? "—"}</span>
      ),
    },
    {
      id: "status",
      header: t("admin.ai_costs.cols.status"),
      cell: (r) => {
        const s = r.status ?? "—";
        const failed = s === "failed";
        return (
          <span
            className={
              failed
                ? "inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger"
                : "text-text-muted text-xs"
            }
          >
            {s}
          </span>
        );
      },
    },
    {
      id: "latency",
      header: t("admin.ai_costs.cols.latency"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.latency_ms ?? 0,
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
      sortable: true,
      sortValue: (r) => r.tokens ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.tokens ?? 0)}
        </span>
      ),
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost_short"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.usd ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.usd ?? 0)}
        </span>
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
  input_usd_per_1m: string;
  output_usd_per_1m: string;
  notes: string;
}

const EMPTY_PRICING_FORM: PricingFormState = {
  model_name: "",
  input_usd_per_1m: "",
  output_usd_per_1m: "",
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
            input_usd_per_1m: String(editing.input_usd_per_1m),
            output_usd_per_1m: String(editing.output_usd_per_1m),
            notes: editing.notes ?? "",
          }
        : EMPTY_PRICING_FORM,
    );
  }, [open, editing]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const inputRate = Number(form.input_usd_per_1m);
    const outputRate = Number(form.output_usd_per_1m);
    if (
      !form.model_name.trim() ||
      Number.isNaN(inputRate) ||
      Number.isNaN(outputRate)
    ) {
      return;
    }
    onSubmit({
      model_name: form.model_name.trim(),
      input_usd_per_1m: inputRate,
      output_usd_per_1m: outputRate,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-6">
        <h2 className="font-headline text-lg font-bold text-text-strong">
          {editing
            ? t("admin.ai_costs.pricing.edit_title")
            : t("admin.ai_costs.pricing.add_title")}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted">
              {t("admin.ai_costs.pricing.fields.model_name")}
            </label>
            <Input
              value={form.model_name}
              disabled={Boolean(editing)}
              onChange={(e) =>
                setForm((f) => ({ ...f, model_name: e.target.value }))
              }
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
              value={form.input_usd_per_1m}
              onChange={(e) =>
                setForm((f) => ({ ...f, input_usd_per_1m: e.target.value }))
              }
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
              value={form.output_usd_per_1m}
              onChange={(e) =>
                setForm((f) => ({ ...f, output_usd_per_1m: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted">
              {t("admin.ai_costs.pricing.fields.notes")}
            </label>
            <Input
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
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
          input_usd_per_1m: values.input_usd_per_1m,
          output_usd_per_1m: values.output_usd_per_1m,
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
          <span className="font-mono text-xs text-text-strong">
            {r.model_name}
          </span>
          {r.notes ? (
            <p className="mt-0.5 text-xs text-text-muted">{r.notes}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "input_rate",
      header: t("admin.ai_costs.pricing.cols.input_rate"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.input_usd_per_1m)}
        </span>
      ),
    },
    {
      id: "output_rate",
      header: t("admin.ai_costs.pricing.cols.output_rate"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.output_usd_per_1m)}
        </span>
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
        <p className="text-sm text-text-muted">
          {t("admin.ai_costs.pricing.subtitle")}
        </p>
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
          <p className="text-sm text-danger">
            {t("admin.ai_costs.pricing.load_failed")}
          </p>
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

const DIMENSION_VALUES: AiCostsDimension[] = [
  "operation",
  "role",
  "tier",
  "stage_name",
  "model_name",
  "status",
];

function DimensionSwitcher({
  value,
  onChange,
}: {
  value: AiCostsDimension;
  onChange: (next: AiCostsDimension) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={t("admin.ai_costs.dimension_aria")}
      className="inline-flex flex-wrap gap-2 bg-surface-elev border border-border rounded-lg p-1"
    >
      {DIMENSION_VALUES.map((d) => {
        const active = d === value;
        return (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(d)}
            className={
              active
                ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white cursor-pointer"
                : "px-3 py-1.5 text-xs font-semibold rounded-md text-text-strong hover:bg-surface-muted cursor-pointer transition-colors duration-200"
            }
          >
            {t(`admin.ai_costs.dimension_options.${d}`)}
          </button>
        );
      })}
    </div>
  );
}

function CategoryBarChart({ data }: { data: AiCostsByCategoryRow[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const reducedMotion = useReducedMotion();
  if (data.length === 0) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-8 text-center">
        <p className="text-sm text-text-muted">
          {t("admin.ai_costs.empty.by_category")}
        </p>
      </div>
    );
  }
  const chartData = data.slice(0, 15);
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            tickFormatter={(value: number) => fmt.usd.format(value)}
          />
          <YAxis
            type="category"
            dataKey="dimension_value"
            tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
            stroke="var(--color-border)"
            width={140}
          />
          <Tooltip
            content={<ChartTooltipUsd />}
            cursor={{ fill: "var(--color-surface-muted)" }}
          />
          <Bar
            dataKey="total_usd"
            fill="var(--color-primary)"
            radius={[0, 6, 6, 0]}
            isAnimationActive={!reducedMotion}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryTable({ rows }: { rows: AiCostsByCategoryRow[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const columns: DataTableColumn<AiCostsByCategoryRow>[] = [
    {
      id: "value",
      header: t("admin.ai_costs.cols.category"),
      sortable: true,
      sortValue: (r) => r.dimension_value,
      cell: (r) => (
        <span className="font-medium text-text-strong">
          {r.dimension_value}
        </span>
      ),
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.total_usd,
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.total_usd)}
        </span>
      ),
    },
    {
      id: "in",
      header: t("admin.ai_costs.cols.input_tokens"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.input_tokens,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.input_tokens)}
        </span>
      ),
    },
    {
      id: "out",
      header: t("admin.ai_costs.cols.output_tokens"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.output_tokens,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.output_tokens)}
        </span>
      ),
    },
    {
      id: "cached",
      header: t("admin.ai_costs.cols.cached_tokens"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.cached_tokens,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.cached_tokens)}
        </span>
      ),
    },
    {
      id: "calls",
      header: t("admin.ai_costs.cols.calls"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.call_count,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.call_count)}
        </span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.dimension_value}
      pagination
      pageSize={10}
      pageSizeOptions={[10, 20, 50]}
      emptyState={t("admin.ai_costs.empty.by_category")}
    />
  );
}

function ModelEfficiencyTable({ rows }: { rows: AiCostsByModelRow[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const columns: DataTableColumn<AiCostsByModelRow>[] = [
    {
      id: "model",
      header: t("admin.ai_costs.cols.model"),
      sortable: true,
      sortValue: (r) => r.model_name,
      cell: (r) => (
        <span className="font-mono text-xs text-text-strong">
          {r.model_name}
        </span>
      ),
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.total_usd,
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.total_usd)}
        </span>
      ),
    },
    {
      id: "per1m",
      header: t("admin.ai_costs.cols.usd_per_1m"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.usd_per_1m_tokens,
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.usd_per_1m_tokens)}
        </span>
      ),
    },
    {
      id: "p50",
      header: t("admin.ai_costs.cols.latency_p50"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.latency_p50_ms,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.latency_p50_ms)} ms
        </span>
      ),
    },
    {
      id: "p95",
      header: t("admin.ai_costs.cols.latency_p95"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.latency_p95_ms,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.latency_p95_ms)} ms
        </span>
      ),
    },
    {
      id: "calls",
      header: t("admin.ai_costs.cols.calls"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.call_count,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.call_count)}
        </span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.model_name}
      pagination
      pageSize={10}
      pageSizeOptions={[10, 20, 50]}
      emptyState={t("admin.ai_costs.empty.by_model")}
    />
  );
}

function FilterBar({
  filters,
  onChange,
}: {
  filters: AiCostsFilters;
  onChange: (next: AiCostsFilters) => void;
}) {
  const { t } = useTranslation();
  const active = Object.values(filters).some((v) => v);
  const set = (key: keyof AiCostsFilters, value: string) =>
    onChange({ ...filters, [key]: value.trim() || null });
  return (
    <div className="flex flex-wrap items-end gap-3 bg-surface-elev border border-border rounded-lg p-4">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-text-muted">
          {t("admin.ai_costs.filters.model")}
        </label>
        <Input
          value={filters.model ?? ""}
          onChange={(e) => set("model", e.target.value)}
          placeholder={t("admin.ai_costs.filters.model_placeholder")}
          className="w-40 h-9"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-text-muted">
          {t("admin.ai_costs.filters.role")}
        </label>
        <Input
          value={filters.role ?? ""}
          onChange={(e) => set("role", e.target.value)}
          placeholder={t("admin.ai_costs.filters.role_placeholder")}
          className="w-40 h-9"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-text-muted">
          {t("admin.ai_costs.filters.operation")}
        </label>
        <Select
          value={filters.operation ?? ""}
          onValueChange={(next) => set("operation", next)}
          options={[
            { value: "", label: t("admin.ai_costs.filters.any") },
            { value: "chat_completion", label: "chat_completion" },
            { value: "embedding", label: "embedding" },
          ]}
          className="w-40 h-9"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-text-muted">
          {t("admin.ai_costs.filters.status")}
        </label>
        <Select
          value={filters.status ?? ""}
          onValueChange={(next) => set("status", next)}
          options={[
            { value: "", label: t("admin.ai_costs.filters.any") },
            { value: "success", label: "success" },
            { value: "failed", label: "failed" },
          ]}
          className="w-40 h-9"
        />
      </div>
      {active ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({ model: null, role: null, operation: null, status: null })
          }
        >
          <X className="h-4 w-4 mr-1" />
          {t("admin.ai_costs.filters.clear")}
        </Button>
      ) : null}
    </div>
  );
}

function PipelineDrilldownSheet({
  pipeline,
  onOpenChange,
}: {
  pipeline: AiCostsByPipelineRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  return (
    <Sheet open={Boolean(pipeline)} onOpenChange={onOpenChange}>
      <SheetContent className="p-6 overflow-y-auto">
        <h2 className="font-headline text-lg font-bold text-text-strong">
          {t("admin.ai_costs.drilldown.title")}
        </h2>
        {pipeline ? (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-text-muted">
                  {t("admin.ai_costs.cols.pipeline")}
                </p>
                <p className="font-mono text-xs text-text-strong break-all">
                  {pipeline.pipeline_run_id}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">
                  {t("admin.ai_costs.cols.type")}
                </p>
                <p className="text-text-strong">
                  {pipeline.generation_type ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">
                  {t("admin.ai_costs.cols.cost")}
                </p>
                <p className="tabular-nums text-text-strong">
                  {fmt.usd.format(pipeline.total_usd ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">
                  {t("admin.ai_costs.cols.calls")}
                </p>
                <p className="tabular-nums text-text-strong">
                  {fmt.number.format(pipeline.call_count ?? 0)}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-text-muted mb-2">
                {t("admin.ai_costs.drilldown.stages")}
              </p>
              <div className="space-y-1.5">
                {pipeline.stages_breakdown.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    {t("admin.ai_costs.drilldown.no_stages")}
                  </p>
                ) : (
                  pipeline.stages_breakdown.map((s) => (
                    <div
                      key={s.stage_name}
                      className="flex items-center justify-between rounded-md bg-surface-muted px-3 py-2"
                    >
                      <span className="text-sm text-text-strong">
                        {s.stage_name}
                      </span>
                      <span className="flex items-center gap-4">
                        <span className="tabular-nums text-xs text-text-muted">
                          {fmt.number.format(s.tokens)} tok
                        </span>
                        <span className="tabular-nums text-sm text-text-strong">
                          {fmt.usd.format(s.usd)}
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <SheetClose render={<Button variant="ghost" className="w-full" />}>
              {t("admin.ai_costs.drilldown.close")}
            </SheetClose>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
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
  const [dimension, setDimension] = useState<AiCostsDimension>("operation");
  // Seed the status filter from ?status= so the admin dashboard's "Failed AI
  // calls" tile deep-links straight to the failures instead of dropping the
  // operator on the unfiltered view.
  const search = useSearch({ strict: false }) as { status?: string };
  const [filters, setFilters] = useState<AiCostsFilters>({
    model: null,
    role: null,
    operation: null,
    status: search.status ?? null,
  });
  const [drilldown, setDrilldown] = useState<AiCostsByPipelineRow | null>(null);

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canAdmin) {
      toast.error(t("admin.users.roles.errors.no_permission"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canAdmin, navigate, t]);

  const summary = useAiCostsSummary(period, filters);
  const byCategory = useAiCostsByCategory({ period, dimension, filters });
  const byModel = useAiCostsByModel({ period, filters });
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
  const failedCallCount = summary.data?.failed?.call_count ?? 0;
  const failedUsd = summary.data?.failed?.usd ?? 0;

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

      <FilterBar filters={filters} onChange={setFilters} />

      {summary.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.ai_costs.summary_load_failed")}
          </p>
        </div>
      ) : summary.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-surface-muted animate-pulse rounded-xl"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label={t("admin.ai_costs.stats.total_cost")}
            value={
              totals?.usd !== undefined && totals?.usd !== null
                ? fmt.usd.format(totals.usd)
                : "—"
            }
            icon={CircleDollarSign}
          />
          <StatCard
            label={t("admin.ai_costs.stats.total_tokens")}
            value={
              totals?.tokens !== undefined && totals?.tokens !== null
                ? fmt.number.format(totals.tokens)
                : "—"
            }
            icon={Cpu}
          />
          <StatCard
            label={t("admin.ai_costs.stats.call_count")}
            value={
              totals?.call_count !== undefined && totals?.call_count !== null
                ? fmt.number.format(totals.call_count)
                : "—"
            }
            icon={Activity}
          />
          <StatCard
            label={t("admin.ai_costs.stats.period")}
            value={t(`admin.ai_costs.period_short.${period}`)}
            icon={Clock}
          />
          {failedCallCount > 0 ? (
            <StatCard
              label={t("admin.ai_costs.stats.failed_spend")}
              value={fmt.usd.format(failedUsd)}
              sublabel={t("admin.ai_costs.stats.failed_spend_hint", {
                count: failedCallCount,
              })}
              icon={AlertTriangle}
            />
          ) : null}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-headline font-bold text-text-strong">
            {t("admin.ai_costs.sections.by_category")}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <DimensionSwitcher value={dimension} onChange={setDimension} />
            <Button
              variant="ghost"
              size="sm"
              disabled={(byCategory.data ?? []).length === 0}
              onClick={() =>
                downloadCsv("ai-costs-by-" + dimension, byCategory.data ?? [], [
                  { header: "category", value: (r) => r.dimension_value },
                  { header: "total_usd", value: (r) => r.total_usd },
                  { header: "input_tokens", value: (r) => r.input_tokens },
                  { header: "output_tokens", value: (r) => r.output_tokens },
                  { header: "cached_tokens", value: (r) => r.cached_tokens },
                  { header: "total_tokens", value: (r) => r.total_tokens },
                  { header: "call_count", value: (r) => r.call_count },
                ])
              }
            >
              <Download className="h-4 w-4 mr-1" />
              {t("admin.ai_costs.export_csv")}
            </Button>
          </div>
        </div>
        {byCategory.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">
              {t("admin.ai_costs.category_load_failed")}
            </p>
          </div>
        ) : byCategory.isLoading ? (
          <div className="h-[300px] bg-surface-muted animate-pulse rounded-lg" />
        ) : (
          <div className="space-y-4">
            <CategoryBarChart data={byCategory.data ?? []} />
            <CategoryTable rows={byCategory.data ?? []} />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.top_users")}
        </h2>
        {byUser.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">
              {t("admin.ai_costs.users_load_failed")}
            </p>
          </div>
        ) : byUser.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-surface-muted animate-pulse rounded-lg"
              />
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
            <p className="text-sm text-danger">
              {t("admin.ai_costs.pipelines_load_failed")}
            </p>
          </div>
        ) : byPipeline.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-surface-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : (
          <PipelineTable
            rows={byPipeline.data ?? []}
            onRowClick={setDrilldown}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-headline font-bold text-text-strong">
            {t("admin.ai_costs.sections.by_model")}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            disabled={(byModel.data ?? []).length === 0}
            onClick={() =>
              downloadCsv("ai-costs-by-model", byModel.data ?? [], [
                { header: "model_name", value: (r) => r.model_name },
                { header: "total_usd", value: (r) => r.total_usd },
                {
                  header: "usd_per_1m_tokens",
                  value: (r) => r.usd_per_1m_tokens,
                },
                { header: "latency_p50_ms", value: (r) => r.latency_p50_ms },
                { header: "latency_p95_ms", value: (r) => r.latency_p95_ms },
                { header: "total_tokens", value: (r) => r.total_tokens },
                { header: "call_count", value: (r) => r.call_count },
              ])
            }
          >
            <Download className="h-4 w-4 mr-1" />
            {t("admin.ai_costs.export_csv")}
          </Button>
        </div>
        {byModel.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">
              {t("admin.ai_costs.model_load_failed")}
            </p>
          </div>
        ) : byModel.isLoading ? (
          <div className="h-[300px] bg-surface-muted animate-pulse rounded-lg" />
        ) : (
          <ModelEfficiencyTable rows={byModel.data ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.recent_calls")}
        </h2>
        {recent.isError ? (
          <div className="bg-surface-elev border border-border rounded-lg p-5">
            <p className="text-sm text-danger">
              {t("admin.ai_costs.recent_load_failed")}
            </p>
          </div>
        ) : recent.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 bg-surface-muted animate-pulse rounded-lg"
              />
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

      <PipelineDrilldownSheet
        pipeline={drilldown}
        onOpenChange={(open) => {
          if (!open) setDrilldown(null);
        }}
      />
    </div>
  );
}
