import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/use-confirm";
import {
  useCreateDomain,
  useDeleteDomain,
  useOrganizationDomains,
} from "@/lib/api/hooks/admin-organizations";
import { errorMessage } from "./helpers";

/**
 * Stateful half of the domains tab: the list query, the create/delete
 * mutations, the two form fields, the shared confirm dialog and the two
 * submit handlers.
 *
 * Hook order is identical to the original inline `DomainsTab` — translation,
 * query, create, delete, domain field, auto-provision field, confirm — and the
 * component has no early return, so nothing moved across a conditional.
 */
export function useDomainsTab(orgId: string) {
  const { t } = useTranslation();
  const { data: domains, isLoading } = useOrganizationDomains(orgId);
  const create = useCreateDomain(orgId);
  const remove = useDeleteDomain(orgId);
  const [domain, setDomain] = useState("");
  const [autoProvision, setAutoProvision] = useState(false);
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm({
    title: t("admin.organizations.actions.delete"),
    confirmLabel: t("admin.organizations.actions.delete"),
    cancelLabel: t("common.cancel"),
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ domain, auto_provision: autoProvision });
      setDomain("");
      setAutoProvision(false);
      toast.success(t("admin.organizations.toasts.domain_added"));
    } catch (err) {
      toast.error(
        errorMessage(err, t("admin.organizations.toasts.create_failed")),
      );
    }
  }

  async function handleRemove(id: string) {
    if (
      !(await confirmDelete({
        description: t("admin.organizations.confirm.delete_domain"),
      }))
    )
      return;
    try {
      await remove.mutateAsync(id);
      toast.success(t("admin.organizations.toasts.delete_success"));
    } catch (err) {
      toast.error(
        errorMessage(err, t("admin.organizations.toasts.delete_failed")),
      );
    }
  }

  return {
    t,
    domains,
    isLoading,
    create,
    domain,
    setDomain,
    autoProvision,
    setAutoProvision,
    confirmDialog,
    handleAdd,
    handleRemove,
  };
}

export type DomainsTabController = ReturnType<typeof useDomainsTab>;
