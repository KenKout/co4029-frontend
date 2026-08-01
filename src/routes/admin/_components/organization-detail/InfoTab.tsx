import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrganizationStatus } from "@/lib/api/types/admin-organizations";
import { errorMessage } from "./helpers";
import { OrganizationEditFields } from "./OrganizationEditFields";
import { OrganizationMetaList } from "./OrganizationMetaList";
import { useInfoTab } from "./use-info-tab";

export function InfoTab({ orgId }: { orgId: string }) {
  const controller = useInfoTab(orgId);
  const { t, i18n, org, patch, draftName, draftStatus } = controller;

  if (!org) {
    return <Skeleton className="h-72 rounded-xl" />;
  }

  const name = draftName ?? org.name;
  const orgStatus = draftStatus ?? (org.status as OrganizationStatus);
  const dirty = name !== org.name || orgStatus !== org.status;

  async function handleSave() {
    try {
      await patch.mutateAsync({
        name: name !== org!.name ? name : undefined,
        status: orgStatus !== org!.status ? orgStatus : undefined,
      });
      controller.setDraftName(null);
      controller.setDraftStatus(null);
      toast.success(t("admin.organizations.toasts.update_success"));
    } catch (err) {
      toast.error(
        errorMessage(err, t("admin.organizations.toasts.update_failed")),
      );
    }
  }

  return (
    <div className="rounded-xl bg-white border border-m3-outline-variant/40 p-6 space-y-6">
      <OrganizationMetaList org={org} language={i18n.language} />

      <OrganizationEditFields
        controller={controller}
        name={name}
        orgStatus={orgStatus}
        dirty={dirty}
        onSave={handleSave}
      />
    </div>
  );
}
