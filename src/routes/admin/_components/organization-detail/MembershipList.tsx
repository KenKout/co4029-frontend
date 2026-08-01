import type { MembershipRead } from "@/lib/api/types/admin-organizations";
import { MembershipRow } from "./MembershipRow";

/**
 * Membership roster. Rendered only once the query has settled and the list is
 * non-empty — the loading and empty branches stay in `MembershipsTab`.
 */
export function MembershipList({
  members,
  orgId,
}: {
  members: MembershipRead[];
  orgId: string;
}) {
  return (
    <ul className="rounded-xl bg-white border border-m3-outline-variant/40 divide-y divide-m3-outline-variant/40">
      {members.map((m) => (
        <MembershipRow key={m.id} m={m} orgId={orgId} />
      ))}
    </ul>
  );
}
