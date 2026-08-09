import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfoTooltip } from "@/components/ui/tooltip";
import type { DomainsTabController } from "./use-domains-tab";

/**
 * Inline "add a domain" form at the top of the domains tab.
 */
export function DomainAddForm({
  controller,
}: {
  controller: DomainsTabController;
}) {
  const {
    t,
    create,
    domain,
    setDomain,
    autoProvision,
    setAutoProvision,
    handleAdd,
  } = controller;
  return (
    <form
      onSubmit={handleAdd}
      className="rounded-xl bg-white border border-m3-outline-variant/40 p-4 flex flex-wrap items-end gap-3"
    >
      <label className="flex-1 min-w-[220px]">
        <span className="text-sm font-semibold text-text-strong">
          {t("admin.organizations.fields.domain")}
        </span>
        <Input
          type="text"
          required
          value={domain}
          onChange={(e) => setDomain(e.target.value.toLowerCase())}
          placeholder="example.edu.vn"
          className="mt-1"
        />
      </label>
      <label className="flex items-center gap-2 text-sm py-2">
        <input
          type="checkbox"
          checked={autoProvision}
          onChange={(e) => setAutoProvision(e.target.checked)}
          className="rounded"
        />
        {t("admin.organizations.fields.auto_provision")}
        <InfoTooltip
          content={t("admin.organizations.tooltips.auto_provision")}
          label={t("admin.organizations.fields.auto_provision")}
        />
      </label>
      <Button type="submit" disabled={create.isPending} className="gap-1">
        <Plus className="h-4 w-4" />
        {create.isPending
          ? t("admin.organizations.actions.adding")
          : t("admin.organizations.actions.add")}
      </Button>
    </form>
  );
}
