import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AdminUserSearchRow } from "@/lib/api/hooks/admin-organizations";
import { Button } from "@/components/ui/button";

/**
 * Dropdown body of the user typeahead: the loading line, the empty line, or the
 * hit list. Kept in its own module so the combobox itself stays a thin shell
 * around the query and the open/close state.
 */
export function UserSearchResults({
  matches,
  isLoading,
  onPick,
}: {
  matches: AdminUserSearchRow[] | undefined;
  isLoading: boolean;
  onPick: (user: AdminUserSearchRow) => void;
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <p className="p-3 text-sm text-text-muted">
        {t("admin.organizations.memberships.user_search_loading")}
      </p>
    );
  }
  if (!matches || matches.length === 0) {
    return (
      <p className="p-3 text-sm text-text-muted">
        {t("admin.organizations.memberships.user_search_empty")}
      </p>
    );
  }
  return (
    <ul className="py-1">
      {matches.map((u) => (
        <li key={u.user_id}>
          <Button
            variant="ghost"
            type="button"
            onClick={() => onPick(u)}
            className="w-full text-left px-3 py-2 hover:bg-m3-primary-fixed/40 flex items-center gap-3 h-auto whitespace-normal"
          >
            <div className="w-8 h-8 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-m3-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-strong truncate">
                {u.display_name?.trim() || u.primary_email}
              </p>
              <p className="text-xs text-text-muted truncate">
                {u.primary_email}
              </p>
            </div>
          </Button>
        </li>
      ))}
    </ul>
  );
}
