import type {
  MembershipStatus,
  OrganizationStatus,
  UnitType,
} from "@/lib/api/types/admin-organizations";
import type { TabKey } from "./types";

/**
 * Constant tables for the admin organization-detail page: the tab order, the
 * three enum option lists the `<Select>`s map over, the bulk-add UUID guard,
 * and the bulk textarea placeholder.
 */

export const TAB_KEYS: TabKey[] = ["info", "domains", "units", "memberships"];

export const ORGANIZATION_STATUS_VALUES: OrganizationStatus[] = [
  "active",
  "inactive",
  "archived",
];

export const UNIT_TYPE_VALUES: UnitType[] = [
  "faculty",
  "department",
  "office",
  "program",
  "campus",
  "other",
];

export const MEMBERSHIP_STATUS_VALUES: MembershipStatus[] = [
  "active",
  "inactive",
  "suspended",
];

/**
 * Bulk-add lines are accepted only when they are a bare user UUID. Anchored
 * and flagless (no `g`), so `.test` stays stateless and the regex is safe to
 * hoist to module scope.
 */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const BULK_USER_IDS_PLACEHOLDER =
  "550e8400-e29b-41d4-a716-446655440000\na1b2c3d4-e5f6-7890-abcd-ef1234567890";
