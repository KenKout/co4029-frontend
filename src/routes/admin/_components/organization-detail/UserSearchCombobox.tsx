import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchInput } from "@/components/ui/search-input";
import {
  useAdminUsersSearch,
  type AdminUserSearchRow,
} from "@/lib/api/hooks/admin-organizations";
import { SelectedUserCard } from "./SelectedUserCard";
import { UserSearchResults } from "./UserSearchResults";

// Combobox typeahead — server-side search via /admin/users?q=. Fires
// the request 200ms after the user stops typing. The membership-add
// button enables the query so we don't pay the round-trip until the
// form opens.
export function UserSearchCombobox({
  value,
  onSelect,
  enabled,
}: {
  value: AdminUserSearchRow | null;
  onSelect: (user: AdminUserSearchRow | null) => void;
  enabled: boolean;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: matches, isLoading } = useAdminUsersSearch(
    debouncedQuery,
    enabled,
  );

  if (value) {
    return <SelectedUserCard value={value} onClear={() => onSelect(null)} />;
  }

  return (
    <div className="relative">
      <SearchInput
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t(
          "admin.organizations.memberships.user_search_placeholder",
        )}
        className="pl-10"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-m3-outline-variant bg-white shadow-lg max-h-64 overflow-auto">
          <UserSearchResults
            matches={matches}
            isLoading={isLoading}
            onPick={(u) => {
              onSelect(u);
              setQuery("");
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
