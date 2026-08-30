import { formatDate } from "./helpers";
import type { AdminUserDetailData, TFn } from "./types";
import { Button } from "@/components/ui/button";

type ActiveSessions = AdminUserDetailData["active_sessions"];

export function ActiveSessionsCard({
  t,
  locale,
  sessions,
  onRevoke,
  isRevoking,
}: {
  t: TFn;
  locale: string;
  sessions: ActiveSessions;
  onRevoke: (sessionId: string) => void;
  isRevoking: boolean;
}) {
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-5">
      <h2 className="text-sm font-headline font-bold text-text-strong mb-3">
        {t("admin.users.roles.active_sessions")} ({sessions.length})
      </h2>
      {sessions.length === 0 && (
        <p className="text-sm text-text-muted">
          {t("admin.users.roles.no_active_sessions")}
        </p>
      )}
      <ul className="divide-y divide-border">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs text-text-muted"
          >
            <div className="min-w-0 space-y-1">
              <p>
                <span className="font-mono">{s.id}</span>
              </p>
              <p>
                {t("admin.users.roles.session_ip")} {s.ip_address ?? "—"} ·{" "}
                {t("admin.users.roles.session_created")}{" "}
                {formatDate(s.created_at, locale)} ·{" "}
                {t("admin.users.roles.session_expires")}{" "}
                {formatDate(s.expires_at, locale)}
              </p>
              <p
                className="truncate font-mono"
                title={s.user_agent ?? undefined}
              >
                {s.user_agent ?? t("admin.dashboard.no_data")}
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0"
              disabled={isRevoking}
              onClick={() => onRevoke(s.id)}
            >
              {t("admin.users.roles.revoke_session")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
