import type { AiCostsSummary } from "@/lib/api/types";

/**
 * Shared types for the admin AI-costs dashboard, extracted from the former
 * 1.7k-line ai-costs.tsx so the section components and the page shell can
 * agree on one definition instead of passing loosely-typed props.
 */

export type AiCostsTimeBucket = AiCostsSummary["buckets"][number];

export interface PricingFormState {
  model_name: string;
  input_usd_per_1m: string;
  output_usd_per_1m: string;
  notes: string;
}

/**
 * Structural subset of a TanStack `UseQueryResult` — only the three fields the
 * section components branch on. Keeps the child props narrow while staying
 * assignable from the real query results the page holds.
 */
export interface SectionQuery<T> {
  data: T | undefined;
  isError: boolean;
  isLoading: boolean;
}
