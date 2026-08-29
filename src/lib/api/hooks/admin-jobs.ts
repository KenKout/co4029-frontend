import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ProcessingJobOut } from "@/lib/api/types";

/**
 * Job investigation (PRD ADM-013/014).
 *
 * Everything these types describe already existed in the database and was
 * reachable only by copying a job id between admin screens: the job's owner,
 * how long it queued versus ran, which pipeline stage spent the money, which
 * AI call failed, and the request that started the whole thing. The endpoint
 * assembles them; this module is the client contract for it.
 */

/** Who a job belongs to. Every field nullable: a generation run scoped to a
 *  lesson has no course, and a deleted course leaves a job orphaned. */
export interface JobOwner {
  course_id: string | null;
  course_title: string | null;
  course_slug: string | null;
  organization_id: string | null;
  organization_name: string | null;
}

/**
 * Derived timings. `queue_wait_seconds` is what separates a slow job from one
 * that merely waited behind other work — duration alone cannot tell those
 * apart. Both null before the job starts: "has not run" is not "ran for 0s".
 */
export interface JobTiming {
  queue_wait_seconds: number | null;
  duration_seconds: number | null;
  is_running: boolean;
}

export interface JobStage {
  stage: string;
  call_count: number;
  failed_count: number;
  spend_usd: number;
  tokens: number;
  max_latency_ms: number | null;
}

export interface JobAiCall {
  id: string;
  stage_name: string | null;
  role: string | null;
  model_name: string;
  operation: string;
  status: string;
  error_message: string | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  request_id: string | null;
  called_at: string;
}

export interface JobInvestigation {
  job: ProcessingJobOut;
  owner: JobOwner;
  timing: JobTiming;
  stages: JobStage[];
  ai_calls: JobAiCall[];
  /** The request that enqueued the job. Null for work no request started. */
  correlation_id: string | null;
  as_of: string;
}

/**
 * Everything needed to investigate one job, in one request (ADM-013/014).
 *
 * Separate from `useProcessingJob` rather than replacing it: the plain detail
 * stays the cheap read the jobs list uses, and the joins here are paid for
 * only when somebody actually opens an investigation.
 */
export function useJobInvestigation(jobId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.jobInvestigation(jobId),
    queryFn: () =>
      apiFetch<JobInvestigation>(
        `/admin/processing/jobs/${jobId}/investigation`,
      ),
    enabled: enabled && Boolean(jobId),
    staleTime: 1000 * 10,
  });
}
