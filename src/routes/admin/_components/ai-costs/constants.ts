import type {
  AiCostsDimension,
  AiCostsPeriod,
} from "@/lib/api/hooks/admin-costs";
import type { CsvColumn } from "@/lib/csv-export";
import type {
  AiCostsByCategory as AiCostsByCategoryRow,
  AiCostsByModel as AiCostsByModelRow,
} from "@/lib/api/types";
import type { PricingFormState } from "./types";

/**
 * Constant tables for the admin AI-costs dashboard: the selector option lists,
 * the blank pricing form, and the CSV export column specs.
 */

export const PERIOD_VALUES: AiCostsPeriod[] = ["24h", "7d", "30d"];

export const DIMENSION_VALUES: AiCostsDimension[] = [
  "operation",
  "role",
  "tier",
  "stage_name",
  "model_name",
  "status",
];

export const EMPTY_PRICING_FORM: PricingFormState = {
  model_name: "",
  input_usd_per_1m: "",
  output_usd_per_1m: "",
  notes: "",
};

export const CATEGORY_CSV_COLUMNS: CsvColumn<AiCostsByCategoryRow>[] = [
  { header: "category", value: (r) => r.dimension_value },
  { header: "total_usd", value: (r) => r.total_usd },
  { header: "input_tokens", value: (r) => r.input_tokens },
  { header: "output_tokens", value: (r) => r.output_tokens },
  { header: "cached_tokens", value: (r) => r.cached_tokens },
  { header: "total_tokens", value: (r) => r.total_tokens },
  { header: "call_count", value: (r) => r.call_count },
];

export const MODEL_CSV_COLUMNS: CsvColumn<AiCostsByModelRow>[] = [
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
];
