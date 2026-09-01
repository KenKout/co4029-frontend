import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  EntityMultiSelectDialog,
  type SelectableEntity,
} from "@/components/ui/entity-multi-select-dialog";
import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";
import type { useUnitAssignment } from "./use-unit-assignment";

/** Master-Dean flow: appoint active organization accounts directly. */
export function AppointDeanDialog({
  faculty,
  unitsById,
  currentUserId,
  controller,
  onClose,
}: {
  faculty: OrgUnitNode;
  unitsById: Map<string, string>;
  currentUserId?: string;
  controller: ReturnType<typeof useUnitAssignment>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const prefix = "management_org_units.dean_picker";

  const items = useMemo<SelectableEntity[]>(() => {
    const needle = query.trim().toLowerCase();
    return controller.deanCandidates
      .filter((person) => person.userId !== currentUserId)
      .filter(
        (person) =>
          !needle ||
          person.displayName.toLowerCase().includes(needle) ||
          person.email.toLowerCase().includes(needle),
      )
      .map((person) => {
        const otherFaculties = person.facultyIds
          .filter((facultyId) => facultyId !== faculty.id)
          .map((facultyId) => unitsById.get(facultyId))
          .filter(Boolean)
          .join(", ");
        return {
          id: person.userId,
          primaryLabel: person.displayName,
          secondaryLabel: otherFaculties
            ? `${person.email} · ${t(`${prefix}.other_faculties`, {
                faculties: otherFaculties,
              })}`
            : person.email,
        };
      });
  }, [controller.deanCandidates, currentUserId, faculty.id, query, t, unitsById]);

  const existingDeanIds = useMemo(
    () =>
      new Set(
        controller.deanCandidates
          .filter((person) =>
            (person.roleCodesByFaculty[faculty.id] ?? []).includes("hod"),
          )
          .map((person) => person.userId),
      ),
    [controller.deanCandidates, faculty.id],
  );

  return (
    <EntityMultiSelectDialog
      title={t(`${prefix}.title`, { faculty: faculty.name })}
      searchPlaceholder={t(`${prefix}.search_placeholder`)}
      items={items}
      alreadySelectedIds={existingDeanIds}
      isLoading={controller.membershipsLoading}
      query={query}
      onQueryChange={setQuery}
      onConfirm={(selected) => {
        void controller
          .appointFacultyDeans(selected.map((person) => person.id))
          .then(onClose);
      }}
      onClose={onClose}
      isSubmitting={controller.isAppointingDean}
      emptyText={t(`${prefix}.empty`)}
      alreadyAddedLabel={t(`${prefix}.already_dean`)}
      confirmLabel={t(`${prefix}.confirm`, {
        count: items.length,
      })}
    />
  );
}
