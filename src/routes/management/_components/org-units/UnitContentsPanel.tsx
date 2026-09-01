import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ShieldPlus, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";
import { useUnitAssignment, type UnitPerson } from "./use-unit-assignment";
import { AddPeopleDialog } from "./AddPeopleDialog";
import { AppointDeanDialog } from "./AppointDeanDialog";

/** Staff affiliations for a flat Faculty. Courses are owned at creation time. */
export function UnitContentsPanel({
  orgId,
  unit,
  unitsById,
  isMasterDean,
}: {
  orgId: string | undefined;
  unit: OrgUnitNode;
  unitsById: Map<string, string>;
  isMasterDean: boolean;
}) {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const assignments = useUnitAssignment(orgId, unit.id);
  const [addingPeople, setAddingPeople] = useState(false);
  const [appointingDean, setAppointingDean] = useState(false);
  const prefix = "management_org_units";

  return (
    <div className="space-y-5">
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
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setAddingPeople(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t(`${prefix}.assign_person`)}
          </Button>
        </div>
        <ul className="mt-2 space-y-1">
          {assignments.peopleInUnit.map((person) => (
            <PersonRow
              key={person.userId}
              person={person}
              onRemove={() => assignments.removePerson(person.userId)}
              disabled={
                assignments.isAssigningPerson || assignments.isAppointingDean
              }
            />
          ))}
          {assignments.peopleInUnit.length === 0 ? (
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
        <p className="truncate text-xs text-text-strong">{person.displayName}</p>
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
