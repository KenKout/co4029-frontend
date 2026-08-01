import { Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DomainAddForm } from "./DomainAddForm";
import { DomainList } from "./DomainList";
import { EmptyState } from "./EmptyState";
import { useDomainsTab } from "./use-domains-tab";

export function DomainsTab({ orgId }: { orgId: string }) {
  const controller = useDomainsTab(orgId);
  const { t, domains, isLoading, confirmDialog, handleRemove } = controller;

  return (
    <div className="space-y-4">
      <DomainAddForm controller={controller} />

      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (domains ?? []).length === 0 ? (
        <EmptyState
          icon={Globe}
          message={t("admin.organizations.empty.domains")}
        />
      ) : (
        <DomainList domains={domains ?? []} onRemove={handleRemove} />
      )}
      {confirmDialog}
    </div>
  );
}
