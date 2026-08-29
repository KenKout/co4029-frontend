import { Info } from "lucide-react";

import type { AdminDashboardOut } from "@/lib/api/hooks/admin";

import type { AdminStatsController } from "./types";

type ScopeField = Extract<
  keyof AdminDashboardOut,
  "usage_scope" | "tenant_scope" | "job_scope" | "cost_scope" | "api_scope"
>;

/**
 * Says out loud when a row ignored the tenant filter.
 *
 * `processing_jobs`, `ai_model_calls` and `http_audit_log` have no organization
 * column, so filtering the dashboard to one tenant cannot narrow them. Showing
 * the global figure under an org-filtered heading without saying so is the
 * exact kind of quiet mismatch ADM-004 is about — the number is not wrong, the
 * silence is. Renders nothing when no filter is applied, or when the row
 * honoured it.
 */
export function ScopeNote({
  c,
  scopeKey,
  noteKey,
}: {
  c: AdminStatsController;
  scopeKey: ScopeField;
  noteKey: string;
}) {
  const filtered = c.scope.organizationId !== null;
  const honoured = c.data?.[scopeKey] === "organization";
  if (!filtered || honoured) return null;

  return (
    <p className="flex items-center gap-1.5 text-xs text-text-muted">
      <Info aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {c.t(noteKey)}
    </p>
  );
}
