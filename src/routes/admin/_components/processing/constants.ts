export const STATUS_FILTERS = [
  { value: "", i18nKey: "admin.processing.filters.all" },
  { value: "pending", i18nKey: "admin.processing.filters.pending" },
  { value: "running", i18nKey: "admin.processing.filters.running" },
  { value: "completed", i18nKey: "admin.processing.filters.completed" },
  { value: "failed", i18nKey: "admin.processing.filters.failed" },
  { value: "cancelled", i18nKey: "admin.processing.filters.cancelled" },
] as const;
