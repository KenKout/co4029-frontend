import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlayCircle,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProcessingQueueDepth } from "@/lib/api/types";

/**
 * The job-status tabs.
 *
 * `value` is the API's `?status=` param and doubles as the deep-link value the
 * admin dashboard sends (`/admin/operations?tab=failures` from the "Job failure
 * rate" tile), so these strings must stay exactly as the backend spells them.
 * `""` is the unfiltered "All" tab.
 *
 * `countKey` maps each tab to its field on the queue-depth payload, which
 * already returns every per-status count — so the tab badges need no extra
 * request and replace the old row of six counter cards.
 */
export const STATUS_FILTERS: {
  value: string;
  i18nKey: string;
  icon: LucideIcon;
  countKey: keyof ProcessingQueueDepth;
}[] = [
  {
    value: "",
    i18nKey: "admin.processing.filters.all",
    icon: Activity,
    countKey: "total",
  },
  {
    value: "pending",
    i18nKey: "admin.processing.filters.pending",
    icon: Clock,
    countKey: "pending",
  },
  {
    value: "running",
    i18nKey: "admin.processing.filters.running",
    icon: PlayCircle,
    countKey: "running",
  },
  {
    value: "completed",
    i18nKey: "admin.processing.filters.completed",
    icon: CheckCircle2,
    countKey: "completed",
  },
  {
    value: "failed",
    i18nKey: "admin.processing.filters.failed",
    icon: AlertTriangle,
    countKey: "failed",
  },
  {
    value: "cancelled",
    i18nKey: "admin.processing.filters.cancelled",
    icon: XCircle,
    countKey: "cancelled",
  },
];
