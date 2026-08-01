import { Clock } from "lucide-react";

import { formatDate } from "./helpers";
import type { AdminUserRecord, TFn } from "./types";

export function UserTimestampsGrid({
  t,
  locale,
  user,
}: {
  t: TFn;
  locale: string;
  user: AdminUserRecord;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-surface-elev border border-border rounded-lg p-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          {t("admin.users.fields.last_login")}
        </p>
        <p className="text-sm text-text-strong mt-1 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-text-muted" />
          {formatDate(user.last_login_at, locale)}
        </p>
      </div>
      <div className="bg-surface-elev border border-border rounded-lg p-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          {t("admin.users.fields.created_at")}
        </p>
        <p className="text-sm text-text-strong mt-1">
          {formatDate(user.created_at, locale)}
        </p>
      </div>
      <div className="bg-surface-elev border border-border rounded-lg p-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          {t("admin.users.fields.updated_at")}
        </p>
        <p className="text-sm text-text-strong mt-1">
          {formatDate(user.updated_at, locale)}
        </p>
      </div>
    </div>
  );
}
