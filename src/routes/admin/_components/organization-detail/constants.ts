import type {
  MembershipStatus,
  OrganizationStatus,
  UnitType,
} from "@/lib/api/types/admin-organizations";
import type { TabKey } from "./types";

/**
 * Constant tables for the admin organization-detail page: the tab order, the
 * three enum option lists the `<Select>`s map over.
 */

// Operations sits second, right after Info: an operator opening a tenant is
// usually asking an operational question, not looking for its domain list.
export const TAB_KEYS: TabKey[] = [
  "info",
  "operations",
  "domains",
  "units",
  "memberships",
];

export const ORGANIZATION_STATUS_VALUES: OrganizationStatus[] = [
  "active",
  "inactive",
  "archived",
];

export const UNIT_TYPE_VALUES: UnitType[] = [
  "faculty",
];

export const MEMBERSHIP_STATUS_VALUES: MembershipStatus[] = [
  "active",
  "inactive",
  "suspended",
];
