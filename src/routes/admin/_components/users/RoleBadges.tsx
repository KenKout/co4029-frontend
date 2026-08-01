import { useTranslation } from "react-i18next";

import { ROLE_BADGE_COLOR } from "./constants";

export function RoleBadges({
  roles,
  labelFor,
}: {
  roles: string[];
  labelFor: (code: string) => string;
}) {
  const { t } = useTranslation();
  if (roles.length === 0) {
    return (
      <span className="text-xs text-text-muted italic">
        {t("admin.users.roles.none", { defaultValue: "No role" })}
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((code) => (
        <span
          key={code}
          className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${
            ROLE_BADGE_COLOR[code] ?? "bg-slate-100 text-slate-700"
          }`}
        >
          {labelFor(code)}
        </span>
      ))}
    </div>
  );
}
