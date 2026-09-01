/**
 * Typed payloads for the organization-management admin endpoints.
 *
 * Hand-written aliases over `openapi-types.d.ts` so consumers can
 * import flat names without having to spell out the long
 * `components["schemas"]["..."]` indirection. Mirrors the API surface
 * exposed by `abridgeai.features.access_control.routers.organizations`.
 *
 * The three string-literal aliases (`OrganizationStatus`, `UnitType`,
 * `MembershipStatus`) are duplicated here from the Python schemas
 * because openapi-typescript inlines `Literal[...]` enums into each
 * referencing schema rather than emitting a top-level alias. Keep
 * these in sync with `abridgeai/features/access_control/schemas/admin.py`.
 */

import type { components } from "../openapi-types";

type Schemas = components["schemas"];

export type OrganizationStatus = "active" | "inactive" | "archived";
export type UnitType = "faculty";
export type MembershipStatus =
  | "active"
  | "invited"
  | "inactive"
  | "suspended"
  | "left";

export type OrganizationRead = Schemas["OrganizationRead"];
export type OrganizationCreate = Schemas["OrganizationCreate"];
export type OrganizationPatch = Schemas["OrganizationPatch"];

export type OrganizationDomainRead = Schemas["OrganizationDomainRead"];
export type OrganizationDomainCreate = Schemas["OrganizationDomainCreate"];
export type OrganizationDomainPatch = Schemas["OrganizationDomainPatch"];

export type OrgUnitRead = Schemas["OrgUnitRead"];
export type OrgUnitCreate = Omit<
  Schemas["OrgUnitCreate"],
  "parent_unit_id" | "unit_type"
> & { unit_type?: "faculty" };
export type OrgUnitPatch = Omit<
  Schemas["OrgUnitPatch"],
  "parent_unit_id" | "unit_type"
>;

export type MembershipRead = Schemas["MembershipRead"];
export type MembershipCreate = Schemas["MembershipCreate"];
export type MembershipPatch = Schemas["MembershipPatch"];

export interface FacultyAssignmentRead {
  id: string;
  user_id: string;
  organization_id: string;
  faculty_id: string;
  status: "active" | "inactive";
  active_from: string;
  active_until?: string | null;
  created_by?: string | null;
  role_codes: string[];
}
