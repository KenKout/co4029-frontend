import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { GraduationCap, Plus, ShieldCheck, ShieldPlus, User, X } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  avatarColor,
  avatarInitials,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/use-confirm";
import { useAuth } from "@/components/auth/AuthProvider";
import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";
import { useManagedLearningPrograms } from "@/lib/api/hooks/learning-programs";
import { useUnitAssignment, type UnitPerson } from "./use-unit-assignment";
import { AddPeopleDialog } from "./AddPeopleDialog";
import { AppointDeanDialog } from "./AppointDeanDialog";

/** Staff affiliations for a flat Faculty. Courses are owned at creation time. */
export function UnitContentsPanel({
  orgId,
  unit,
  unitsById,
  isMasterDean,
  isDeanOfUnit,
}: {
  orgId: string | undefined;
  unit: OrgUnitNode;
  unitsById: Map<string, string>;
  isMasterDean: boolean;
  /** The caller is this Faculty's Dean (hod @ org_unit scope). */
  isDeanOfUnit: boolean;
}) {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { confirm, dialog } = useConfirm();
  const assignments = useUnitAssignment(orgId, unit.id);
  const [addingPeople, setAddingPeople] = useState(false);
  const [appointingDean, setAppointingDean] = useState(false);
  const prefix = "management_org_units";

  // Programs owned by this faculty, newest first — the side section mirrors
  // the people view so a faculty reads as one place: who is in it AND what
  // it runs.
  const programs = useManagedLearningPrograms(orgId);
  const unitPrograms = useMemo(
    () =>
      (programs.data ?? [])
        .filter((p) => p.faculty_id === unit.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [programs.data, unit.id],
  );
  const deans = useMemo(
    () =>
      assignments.peopleInUnit.filter((person) =>
        isFacultyDean(person, unit.id),
      ),
    [assignments.peopleInUnit, unit.id],
  );
  const otherStaff = useMemo(
    () =>
      assignments.peopleInUnit.filter(
        (person) => !isFacultyDean(person, unit.id),
      ),
    [assignments.peopleInUnit, unit.id],
  );

  async function requestRemovePerson(person: UnitPerson) {
    const accepted = await confirm({
      title: t(`${prefix}.remove_person_title`, { name: person.displayName }),
      description: t(`${prefix}.remove_person_description`, {
        name: person.displayName,
        faculty: unit.name,
      }),
      confirmLabel: t(`${prefix}.remove_person_confirm`),
      cancelLabel: t("common.cancel"),
      confirmVariant: "destructive",
    });
    if (accepted) assignments.removePerson(person.userId);
  }

  return (
    <div className="space-y-5">
      {dialog}
      {assignments.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/5 p-2 text-xs break-words text-danger">
          {assignments.error}
        </p>
      ) : null}

      <section>
        <div className="flex items-center gap-2 border-b border-border pb-1.5">
          <User className="h-4 w-4 text-m3-primary" />
          <span className="flex-1 text-xs font-semibold text-text-strong">
            {t(`${prefix}.people_in_unit`, {
              count: assignments.peopleInUnit.length,
            })}
          </span>
          <Badge
            variant="outline"
            className="border-m3-primary/30 bg-m3-primary-fixed/40 text-m3-primary"
          >
            <ShieldCheck />
            {t(`${prefix}.deans_in_unit`, { count: deans.length })}
          </Badge>
          {isMasterDean ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setAppointingDean(true)}
            >
              <ShieldPlus className="h-3.5 w-3.5" />
              {t(`${prefix}.appoint_dean`)}
            </Button>
          ) : null}
          {/* Only a Dean (of this Faculty, or the org's master Dean) may add
              people — the backend's org_unit.manage gate is broader, but the
              decision to grow a Faculty's staff belongs to its Dean. */}
          {isMasterDean || isDeanOfUnit ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setAddingPeople(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t(`${prefix}.add_people`)}
            </Button>
          ) : null}
        </div>
        <div
          className="mt-3 max-h-[45vh] space-y-4 overflow-y-auto overscroll-contain pr-1"
          role="region"
          aria-label={t(`${prefix}.people_in_unit`, {
            count: assignments.peopleInUnit.length,
          })}
        >
          {deans.length > 0 ? (
            <PeopleGroup
              label={t(`${prefix}.faculty_leadership`, { count: deans.length })}
              people={deans}
              facultyId={unit.id}
              onRemove={(person) => void requestRemovePerson(person)}
              disabled={
                assignments.isAssigningPerson || assignments.isAppointingDean
              }
            />
          ) : null}
          {otherStaff.length > 0 ? (
            <PeopleGroup
              label={t(`${prefix}.other_staff`, { count: otherStaff.length })}
              people={otherStaff}
              facultyId={unit.id}
              onRemove={(person) => void requestRemovePerson(person)}
              disabled={
                assignments.isAssigningPerson || assignments.isAppointingDean
              }
            />
          ) : null}
          {assignments.peopleInUnit.length === 0 ? (
            <p className="py-2 text-xs text-text-muted">
              {t(`${prefix}.no_people_in_unit`)}
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 border-b border-border pb-1.5">
          <GraduationCap className="h-4 w-4 text-m3-primary" />
          <span className="flex-1 text-xs font-semibold text-text-strong">
            {t(`${prefix}.programs_in_unit`, { count: unitPrograms.length })}
          </span>
        </div>
        <ul className="mt-2 space-y-1">
          {unitPrograms.map((program) => (
            <li key={program.id}>
              <Link
                to="/management/learning-programs/$id"
                params={{ id: program.id }}
                className="flex items-center gap-2 rounded px-1 py-1 hover:bg-m3-surface-container-low"
              >
                <span className="min-w-0 flex-1 truncate text-xs text-text-strong">
                  {program.name}
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-m3-on-surface-variant">
                  {program.status}
                </span>
              </Link>
            </li>
          ))}
          {unitPrograms.length === 0 ? (
            <li className="py-2 text-xs text-text-muted">
              {t(`${prefix}.no_programs_in_unit`)}
            </li>
          ) : null}
        </ul>
      </section>

      {addingPeople ? (
        <AddPeopleDialog
          unit={unit}
          unitsById={unitsById}
          controller={assignments}
          onClose={() => setAddingPeople(false)}
        />
      ) : null}

      {appointingDean ? (
        <AppointDeanDialog
          faculty={unit}
          unitsById={unitsById}
          currentUserId={currentUser?.id}
          controller={assignments}
          onClose={() => setAppointingDean(false)}
        />
      ) : null}
    </div>
  );
}

/** Dean authority must come from the scoped role, never from affiliation or a
 *  broad organization role. A person can belong to several Faculties while
 *  being Dean of only one of them. */
export function isFacultyDean(person: UnitPerson, facultyId: string): boolean {
  return (person.roleCodesByFaculty[facultyId] ?? []).includes("hod");
}

/** Roles useful in this Faculty roster. Teacher/Manager can be organization
 *  roles, while Dean is deliberately admitted only from the exact Faculty
 *  scope above. */
export function facultyRoleCodes(
  person: UnitPerson,
  facultyId: string,
): string[] {
  const scoped = person.roleCodesByFaculty[facultyId] ?? [];
  const staffRoles = person.roles.filter((role) =>
    role === "teacher" || role === "manager",
  );
  return Array.from(new Set([...scoped, ...staffRoles])).filter((role) =>
    role === "hod" || role === "manager" || role === "teacher",
  );
}

function PeopleGroup({
  label,
  people,
  facultyId,
  onRemove,
  disabled,
}: {
  label: string;
  people: UnitPerson[];
  facultyId: string;
  onRemove: (person: UnitPerson) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <ul className="space-y-1">
        {people.map((person) => (
          <PersonRow
            key={person.userId}
            person={person}
            facultyId={facultyId}
            onRemove={() => onRemove(person)}
            disabled={disabled}
          />
        ))}
      </ul>
    </div>
  );
}

function PersonRow({
  person,
  facultyId,
  onRemove,
  disabled,
}: {
  person: UnitPerson;
  facultyId: string;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const prefix = "management_org_units";
  const roles = facultyRoleCodes(person, facultyId);
  const dean = isFacultyDean(person, facultyId);
  return (
    <li
      className={`flex items-center gap-2 rounded-lg border px-2 py-2 ${
        dean
          ? "border-m3-primary/20 bg-m3-primary-fixed/30"
          : "border-transparent hover:bg-m3-surface-container-low"
      }`}
    >
      <Avatar size="sm" className={avatarColor(person.userId)}>
        {person.avatarUrl ? (
          <AvatarImage src={person.avatarUrl} alt={person.displayName} />
        ) : null}
        <AvatarFallback>
          {avatarInitials(person.displayName, { uppercase: true })}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-text-strong">{person.displayName}</p>
        {person.email ? (
          <p className="truncate text-[10px] text-text-muted">{person.email}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-1">
          {roles.map((role) => (
            <Badge
              key={role}
              variant={role === "hod" ? "default" : "secondary"}
              className={role === "hod" ? "bg-m3-primary text-white" : undefined}
            >
              {role === "hod" ? <ShieldCheck /> : null}
              {t(`${prefix}.faculty_roles.${role}`)}
            </Badge>
          ))}
        </div>
      </div>
      {/* Removing affiliation does not revoke a scoped Dean role. Hide this
          misleading mutation for Deans; their authority must be revoked from
          the role-assignment flow first. */}
      {!dean ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 shrink-0 p-0 text-text-muted hover:text-danger"
          title={t("management_org_units.remove_from_unit")}
          disabled={disabled}
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </li>
  );
}
