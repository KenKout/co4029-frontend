import { formatDate } from "./helpers";
import type { AdminUserDetailData, TFn } from "./types";

export function RoleHistoryCard({
  t,
  locale,
  history,
}: {
  t: TFn;
  locale: string;
  history: AdminUserDetailData["role_history"];
}) {
  return (
    <section className="rounded-lg border border-border bg-surface-elev p-5">
      <h2 className="mb-3 text-sm font-headline font-bold text-text-strong">
        {t("admin.users.roles.history")}
      </h2>
      {history.length === 0 ? (
        <p className="text-sm text-text-muted">
          {t("admin.users.roles.history_empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {history.map((item) => (
            <li key={item.assignment_id} className="py-3 text-xs">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold text-text-strong">
                  {item.role_name}
                </span>
                <span
                  className={
                    item.revoked_at ? "text-red-700" : "text-emerald-700"
                  }
                >
                  {item.revoked_at
                    ? t("admin.audit.revoked")
                    : t("admin.audit.active")}
                </span>
              </div>
              <p className="mt-1 text-text-muted">
                {item.scope_kind} ·{" "}
                {item.organization_name ??
                  item.org_unit_name ??
                  item.course_title ??
                  t("admin.users.roles.scope_global")}
              </p>
              <p className="mt-1 text-text-muted">
                {t("admin.users.roles.granted_by_actor", {
                  actor: item.granted_by_email ?? t("admin.audit.system"),
                  at: formatDate(item.created_at, locale),
                })}
              </p>
              {item.revoked_at && (
                <p className="text-text-muted">
                  {t("admin.users.roles.revoked_by_actor", {
                    actor: item.revoked_by_email ?? t("admin.audit.system"),
                    at: formatDate(item.revoked_at, locale),
                  })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
