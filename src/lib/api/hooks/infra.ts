import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../client";
import { queryKeys } from "../query-keys";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface HealthzResponse {
  [key: string]: string;
}

export interface ReadyzResponse {
  [key: string]: unknown;
}

async function fetchPlain<T>(path: string): Promise<T> {
  const base = API_BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function useHealthz() {
  return useQuery({
    queryKey: queryKeys.infra.healthz(),
    queryFn: () => fetchPlain<HealthzResponse>("/healthz"),
    refetchInterval: 30_000,
    staleTime: 0,
  });
}

export function useReadyz() {
  return useQuery({
    queryKey: queryKeys.infra.readyz(),
    queryFn: () => fetchPlain<ReadyzResponse>("/readyz"),
    refetchInterval: 30_000,
    staleTime: 0,
  });
}

/** One dependency probe from `GET /healthz/deep`. */
export interface DeepHealthCheck {
  status: "ok" | "unhealthy" | "disabled" | "skipped";
  latency_ms: number | null;
}

export interface DeepHealthResponse {
  status: "ok" | "degraded" | "unhealthy";
  checks: Record<string, DeepHealthCheck>;
  version: string;
  git_sha: string | null;
}

/**
 * Per-dependency readiness — postgres, redis, neo4j, object storage, the LLM
 * provider — with a rolled-up status and the deployed version.
 *
 * `/readyz` only answers "can this instance serve traffic"; the operator's
 * Current Status row has to name *which* dependency is down, which is what
 * this endpoint is for. Admin-only (`system.administer`), so unlike the
 * unauthenticated probes it goes through `apiFetch`.
 */
export function useDeepHealth(enabled = true) {
  return useQuery({
    queryKey: queryKeys.infra.deepHealth(),
    queryFn: () => apiFetch<DeepHealthResponse>("/healthz/deep"),
    refetchInterval: 30_000,
    staleTime: 0,
    enabled,
  });
}
