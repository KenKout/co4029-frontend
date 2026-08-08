import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AdminUserSearchRow } from "@/lib/api/hooks/admin-organizations";
import { Button } from "@/components/ui/button";

/**
 * Chosen-user card the typeahead collapses into once a hit is picked; the X
 * clears the selection and puts the search input back.
 */
export function SelectedUserCard({
  value,
  onClear,
}: {
  value: AdminUserSearchRow;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border border-m3-outline-variant bg-white px-3 py-2 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-strong truncate">
          {value.display_name?.trim() || value.primary_email}
        </p>
        <p className="text-xs text-text-muted truncate">
          {value.primary_email}
        </p>
      </div>
      <Button variant="ghost"
        type="button"
        onClick={onClear}
        className="text-text-muted hover:text-text-strong shrink-0"
        aria-label={t("admin.organizations.actions.cancel")}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
