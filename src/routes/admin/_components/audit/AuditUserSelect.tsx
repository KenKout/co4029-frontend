import { useMemo, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAdminUsersSearch,
  type AdminUserSearchRow,
} from "@/lib/api/hooks/admin-organizations";
import { cn } from "@/lib/utils";

const INITIAL_USER_LIMIT = 50;

function userLabel(user: AdminUserSearchRow): string {
  return user.display_name
    ? `${user.display_name} · ${user.primary_email}`
    : user.primary_email;
}

/** Server-backed single-user selector for audit filters. */
export function AuditUserSelect({
  value,
  onChange,
}: {
  value?: AdminUserSearchRow;
  onChange: (user: AdminUserSearchRow | undefined) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const { data = [], isFetching } = useAdminUsersSearch(
    query,
    true,
    undefined,
    INITIAL_USER_LIMIT,
  );
  const options = useMemo(() => {
    if (!value || data.some((user) => user.user_id === value.user_id)) {
      return data;
    }
    return [value, ...data];
  }, [data, value]);
  const labelById = useMemo(
    () => new Map(options.map((user) => [user.user_id, userLabel(user)])),
    [options],
  );

  return (
    <div className="w-full min-w-[18rem] max-w-md">
      <Combobox.Root
        items={options.map((user) => user.user_id)}
        value={value?.user_id ?? null}
        inputValue={query}
        itemToStringLabel={(id) => labelById.get(id) ?? ""}
        onInputValueChange={setQuery}
        onValueChange={(next) => {
          const selected = options.find((user) => user.user_id === next);
          if (selected) {
            onChange(selected);
            setQuery("");
          }
        }}
      >
        <div className="relative">
          <Combobox.Input
            render={<Input />}
            aria-label={t("admin.audit.user_filter.label")}
            placeholder={
              value
                ? userLabel(value)
                : t("admin.audit.user_filter.placeholder")
            }
            className={cn(
              "h-9 pr-16",
              value && "text-m3-on-surface",
            )}
          />
          <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-m3-outline" />}
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("admin.audit.user_filter.clear")}
                className="h-7 w-7"
                onClick={() => {
                  onChange(undefined);
                  setQuery("");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={6} className="z-50">
            <Combobox.Popup className="max-h-72 w-[var(--anchor-width)] overflow-auto rounded-xl border border-border bg-m3-surface p-1 shadow-xl">
              <Combobox.Empty className="px-3 py-2 text-sm text-m3-on-surface-variant">
                {t("admin.audit.user_filter.empty")}
              </Combobox.Empty>
              <Combobox.List>
                {(id: string) => (
                  <Combobox.Item
                    key={id}
                    value={id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[highlighted]:bg-m3-primary/10"
                  >
                    <Combobox.ItemIndicator className="shrink-0">
                      <Check className="h-4 w-4" />
                    </Combobox.ItemIndicator>
                    <span className="min-w-0 truncate">
                      {labelById.get(id)}
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
