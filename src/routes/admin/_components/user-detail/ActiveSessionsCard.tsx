import { formatDate } from "./helpers";
import type { AdminUserDetailData, TFn } from "./types";

type ActiveSessions = AdminUserDetailData["active_sessions"];

export function ActiveSessionsCard({
  t,
  locale,
  sessions,
}: {
  t: TFn;
  locale: string;
  sessions: ActiveSessions;
}) {
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-5">
      <h2 className="text-sm font-headline font-bold text-text-strong mb-3">
        {t("admin.users.roles.active_sessions")} ({sessions.length})
      </h2>
      <ul className="divide-y divide-border">
        {sessions.map((s) => (
          <li key={s.id} className="py-2 text-xs text-text-muted">
            <span className="font-mono">{s.id}</span> —{" "}
            {t("admin.users.roles.session_ip")} {s.ip_address ?? "—"} ·{" "}
            {t("admin.users.roles.session_expires")}{" "}
            {formatDate(s.expires_at, locale)}
          </li>
        ))}
      </ul>
    </div>
  );
}
