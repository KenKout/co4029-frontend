import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { SortState } from "@/components/ui/data-table";

/**
 * Shape returned by the backend offset base (`core/pagination.PageResponse`).
 * Declared here because these endpoints post-date the committed OpenAPI
 * snapshot used by codegen.
 */
export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UseServerTableOptions {
  /** react-query key root; the live params are appended automatically. */
  queryKey: readonly unknown[];
  /** Endpoint path, e.g. `/admin/organizations/search`. */
  path: string;
  pageSize?: number;
  initialSort?: SortState | null;
  /** Extra query params (filters); falsy values are omitted. */
  filters?: Record<string, string | undefined>;
  /** Debounce for the search box, ms. */
  debounceMs?: number;
  enabled?: boolean;
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(handle);
  }, [value, ms]);
  return debounced;
}

/**
 * Server-side search + sort + filter + page for a `DataTable` in manual mode.
 *
 * Pairs with `<DataTable manualPagination manualSorting rowCount={total}
 * page={page} onPageChange={setPage} sort={sort} onSortChange={setSort} … />`
 * and a toolbar bound to `search`/`setSearch`. Uses `keepPreviousData` so
 * paging/searching never flashes an empty table.
 */
export function useServerTable<T>({
  queryKey,
  path,
  pageSize: initialPageSize = 25,
  initialSort = null,
  filters,
  debounceMs = 350,
  enabled = true,
}: UseServerTableOptions) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState | null>(initialSort);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  // Optional stateful single-select filter (e.g. the admin users role filter).
  // Static `filters` remain supported alongside this; both are sent as params.
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);

  const debouncedSearch = useDebounced(search.trim(), debounceMs);
  const filterKey = JSON.stringify(filters ?? {});

  // Any change to what's *queried* (except page itself) resets to page 0.
  useEffect(() => {
    setPage(0);
  }, [
    debouncedSearch,
    sort?.columnId,
    sort?.direction,
    pageSize,
    filterKey,
    roleFilter,
  ]);

  const query = useQuery({
    queryKey: [
      ...queryKey,
      { search: debouncedSearch, sort, page, pageSize, filterKey, roleFilter },
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter) params.set("role", roleFilter);
      if (sort?.columnId && sort.direction) {
        params.set("sort", sort.columnId);
        params.set("sort_dir", sort.direction);
      }
      for (const [k, v] of Object.entries(filters ?? {})) {
        if (v) params.set(k, v);
      }
      return apiFetch<PageResponse<T>>(`${path}?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
    enabled,
  });

  return {
    rows: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.total_pages ?? 0,
    page,
    pageSize,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    sort,
    setSort,
    setPage,
    setPageSize,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}
