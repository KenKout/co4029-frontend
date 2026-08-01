import { useTranslation } from "react-i18next";
import { OrgMembershipStatusBadge } from "@/components/ui/status-badges";

/**
 * Status pill for both the organization header and the membership rows.
 * Extracted verbatim from organization-detail.tsx.
 */
export function StatusBadge({
  status,
  type = "org",
}: {
  status: string;
  type?: "org" | "membership";
}) {
  const { t } = useTranslation();
  // Two namespaces behind one badge (org vs membership rows), so the label is
  // resolved here rather than bound in status-badges.
  const ns =
    type === "org"
      ? "admin.organizations.status_label"
      : "admin.organizations.membership_status_label";
  return (
    <OrgMembershipStatusBadge
      status={status}
      label={t(`${ns}.${status}`, { defaultValue: status })}
    />
  );
}
