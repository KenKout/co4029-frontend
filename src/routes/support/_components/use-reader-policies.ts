import { useAuth } from "@/components/auth/AuthProvider";
import { useMyRoles } from "@/lib/api/hooks/admin";
import { usePolicies } from "@/lib/api/hooks/policies";

/**
 * The policy index as this reader should see it.
 *
 * Policies name the parties they bind, and a reader is shown the ones they are
 * a party to plus everything public. That needs the viewer's roles — but these
 * pages are deliberately reachable signed out (you must be able to read the
 * terms before you have an account), so the roles request is gated on an
 * actual session rather than fired speculatively into a 401.
 *
 * The index request itself is never gated: signed out it simply returns the
 * public set. Scoping here is a courtesy filter over already-public documents,
 * not an access control — the server does not trust these codes for anything.
 *
 * Lives in the route layer rather than `lib/api/hooks` because it reaches into
 * the auth context, and `lib/` does not depend on `components/`.
 */
export function useReaderPolicies() {
  const { isAuthenticated } = useAuth();
  const roles = useMyRoles({ enabled: isAuthenticated });

  // While the roles are still in flight we ask for the public set, then widen
  // once they land — a visibly growing list beats an empty one behind a spinner.
  return usePolicies(roles.data ?? []);
}
