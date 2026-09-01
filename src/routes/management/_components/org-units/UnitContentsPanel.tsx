import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ShieldPlus, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";
import { useUnitAssignment, type UnitPerson } from "./use-unit-assignment";
import { AddPeopleDialog } from "./AddPeopleDialog";

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
  const assignments = useUnitAssignment(orgId, unit.id);
  const [addingPeople, setAddingPeople] = useState(false);
  const [pendingDean, setPendingDean] = useState<UnitPerson | null>(null);
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
              onAppointDean={() => setPendingDean(person)}
              canAppointDean={
                isMasterDean &&
                !(person.roleCodesByFaculty[unit.id] ?? []).includes("hod")
              }
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

      {pendingDean ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingDean(null);
          }}
          title={t("management_org_units.appoint_dean_title", {
            defaultValue: "Appoint Faculty Dean?",
          })}
          description={t("management_org_units.appoint_dean_description", {
            defaultValue:
              "{{name}} will receive Faculty Dean authority for {{faculty}}. Existing roles and other Faculty affiliations are preserved.",
            name: pendingDean.displayName,
            faculty: unit.name,
          })}
          confirmLabel={t("management_org_units.appoint_dean", {
            defaultValue: "Appoint Dean",
          })}
          cancelLabel={t("common.cancel")}
          isPending={assignments.isAppointingDean}
          onConfirm={() => {
            void assignments
              .appointFacultyDean(pendingDean.userId)
              .then(() => setPendingDean(null));
          }}
        />
      ) : null}
    </div>
  );
}

function PersonRow({
  person,
  onRemove,
  onAppointDean,
  canAppointDean,
  disabled,
}: {
  person: UnitPerson;
  onRemove: () => void;
  onAppointDean: () => void;
  canAppointDean: boolean;
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
      {canAppointDean ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 px-1.5 text-[10px] text-m3-primary"
          title={t("management_org_units.appoint_dean", {
            defaultValue: "Appoint Dean",
          })}
          disabled={disabled}
          onClick={onAppointDean}
        >
          <ShieldPlus className="h-3 w-3" />
          {t("management_org_units.appoint_dean", {
            defaultValue: "Appoint Dean",
          })}
        </Button>
      ) : null}
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
