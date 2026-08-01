import type { MembershipRead } from "@/lib/api/types/admin-organizations";
import { MembershipRowActions } from "./MembershipRowActions";
import { MembershipRowMeta } from "./MembershipRowMeta";
import { useMembershipRow } from "./use-membership-row";

// Membership row with inline status edit
export function MembershipRow({
  m,
  orgId,
}: {
  m: MembershipRead;
  orgId: string;
}) {
  const controller = useMembershipRow(m, orgId);
  const { i18n, confirmDialog } = controller;

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <MembershipRowMeta m={m} language={i18n.language} />
        <MembershipRowActions controller={controller} status={m.status} />
      </div>
      {confirmDialog}
    </li>
  );
}
