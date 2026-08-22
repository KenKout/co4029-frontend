import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Plus, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";
import type { CourseAuthoring } from "@/lib/api/types";
import {
  useAssignCourseToUnit,
  useUnitAssignment,
  type UnitPerson,
} from "./use-unit-assignment";
import { AddPeopleDialog } from "./AddPeopleDialog";
import { AddCoursesDialog } from "./AddCoursesDialog";

/**
 * What lives in the selected unit, and the controls to put things there.
 *
 * This is the answer to "where do I add people and courses to a unit" — on
 * the unit itself, rather than buried in a course's settings tab and a user's
 * detail page, which is where the underlying fields had always lived and
 * where nobody would think to look.
 *
 * Both lists show DIRECT members only. The scope filters elsewhere include
 * the subtree (a faculty covers its departments) but assignment has to be
 * exact: "remove from this unit" is meaningless for someone who is actually
 * in a child unit.
 */
export function UnitContentsPanel({
  orgId,
  unit,
  unitsById,
}: {
  orgId: string | undefined;
  unit: OrgUnitNode;
  /** Unit id → name, so a picker row can say where someone is moving FROM. */
  unitsById: Map<string, string>;
}) {
  const { t } = useTranslation();
  const a = useUnitAssignment(orgId, unit.id);
  const [addingPeople, setAddingPeople] = useState(false);
  const [addingCourses, setAddingCourses] = useState(false);
  const prefix = "management_org_units";

  return (
    <div className="space-y-5">
      {a.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/5 p-2 text-xs break-words text-danger">
          {a.error}
        </p>
      ) : null}

      <section>
        <SectionHeader
          icon={<BookOpen className="h-4 w-4 text-m3-primary" />}
          label={t(`${prefix}.courses_in_unit`, {
            count: a.coursesInUnit.length,
          })}
          onAdd={() => setAddingCourses(true)}
          addLabel={t(`${prefix}.assign_course`)}
        />
        <ul className="mt-2 space-y-1">
          {a.coursesInUnit.map((course) => (
            <AssignedCourseRow
              key={course.id}
              course={course}
              onError={a.setError}
            />
          ))}
          {a.coursesInUnit.length === 0 ? (
            <li className="py-2 text-xs text-text-muted">
              {t(`${prefix}.no_courses_in_unit`)}
            </li>
          ) : null}
        </ul>
      </section>

      <section>
        <SectionHeader
          icon={<User className="h-4 w-4 text-m3-primary" />}
          label={t(`${prefix}.people_in_unit`, {
            count: a.peopleInUnit.length,
          })}
          onAdd={() => setAddingPeople(true)}
          addLabel={t(`${prefix}.assign_person`)}
        />
        <ul className="mt-2 space-y-1">
          {a.peopleInUnit.map((person) => (
            <PersonRow
              key={person.membershipId}
              person={person}
              onRemove={() => a.assignPerson(person.membershipId, null)}
              disabled={a.isAssigningPerson}
            />
          ))}
          {a.peopleInUnit.length === 0 ? (
            <li className="py-2 text-xs text-text-muted">
              {t(`${prefix}.no_people_in_unit`)}
            </li>
          ) : null}
        </ul>
      </section>

      {addingPeople ? (
        <AddPeopleDialog
          unit={unit}
          unitsById={unitsById}
          controller={a}
          onClose={() => setAddingPeople(false)}
        />
      ) : null}
      {addingCourses ? (
        <AddCoursesDialog
          unit={unit}
          unitsById={unitsById}
          controller={a}
          onClose={() => setAddingCourses(false)}
        />
      ) : null}
    </div>
  );
}

function SectionHeader({
  icon,
  label,
  onAdd,
  addLabel,
}: {
  icon: React.ReactNode;
  label: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border pb-1.5">
      {icon}
      <span className="flex-1 text-xs font-semibold text-text-strong">
        {label}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1 px-2 text-xs"
        onClick={onAdd}
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

function AssignCourseButton({
  courseId,
  unitId,
  onError,
}: {
  courseId: string;
  unitId: string;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const { assign, isPending } = useAssignCourseToUnit(courseId, onError);
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 px-2 text-xs"
      disabled={isPending}
      onClick={() => assign(unitId)}
    >
      {t("management_org_units.assign")}
    </Button>
  );
}

function AssignedCourseRow({
  course,
  onError,
}: {
  course: CourseAuthoring;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const { assign, isPending } = useAssignCourseToUnit(course.id, onError);
  return (
    <li className="flex items-center gap-2 rounded px-1 py-1 hover:bg-m3-surface-container-low">
      <span className="min-w-0 flex-1 truncate text-xs text-text-strong">
        {course.title}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 shrink-0 p-0 text-text-muted hover:text-danger"
        title={t("management_org_units.remove_from_unit")}
        disabled={isPending}
        onClick={() => assign(null)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </li>
  );
}

function PersonRow({
  person,
  onRemove,
  disabled,
}: {
  person: UnitPerson;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <li className="flex items-center gap-2 rounded px-1 py-1 hover:bg-m3-surface-container-low">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-text-strong">
          {person.displayName}
        </p>
        {person.email ? (
          <p className="truncate text-[10px] text-text-muted">{person.email}</p>
        ) : null}
      </div>
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
    </li>
  );
}
