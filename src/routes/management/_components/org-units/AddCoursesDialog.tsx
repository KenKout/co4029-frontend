import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  EntityMultiSelectDialog,
  type SelectableEntity,
} from "@/components/ui/entity-multi-select-dialog";
import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";
import type { useUnitAssignment } from "./use-unit-assignment";

/**
 * Bulk "add courses to this unit" picker — the course-side twin of
 * {@link AddPeopleDialog}, using the same shared multi-select dialog so both
 * halves of unit assignment behave identically.
 *
 * A course carries one `org_unit_id`, so adding it here moves it out of any
 * unit it currently sits in; the row shows that, same as the people picker.
 */
export function AddCoursesDialog({
  unit,
  unitsById,
  controller,
  onClose,
}: {
  unit: OrgUnitNode;
  unitsById: Map<string, string>;
  controller: ReturnType<typeof useUnitAssignment>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const prefix = "management_org_units.courses_picker";

  const items = useMemo<SelectableEntity[]>(() => {
    const needle = query.trim().toLowerCase();
    return controller.assignableCourses
      .concat(controller.coursesInUnit)
      .filter(
        (c) =>
          !needle ||
          c.title.toLowerCase().includes(needle) ||
          c.slug.toLowerCase().includes(needle),
      )
      .map((c) => {
        const currentUnit =
          c.org_unit_id && c.org_unit_id !== unit.id
            ? unitsById.get(c.org_unit_id)
            : null;
        return {
          id: c.id,
          primaryLabel: c.title,
          secondaryLabel: currentUnit
            ? `${c.slug} · ${t(`${prefix}.currently_in`, { unit: currentUnit })}`
            : c.slug,
          status: c.status,
        };
      });
  }, [controller.assignableCourses, controller.coursesInUnit, query, unit.id, unitsById, t]);

  const alreadySelectedIds = useMemo(
    () => new Set(controller.coursesInUnit.map((c) => c.id)),
    [controller.coursesInUnit],
  );

  return (
    <EntityMultiSelectDialog
      title={t(`${prefix}.title`, { unit: unit.name })}
      searchPlaceholder={t(`${prefix}.search_placeholder`)}
      items={items}
      alreadySelectedIds={alreadySelectedIds}
      isLoading={controller.isLoading}
      query={query}
      onQueryChange={setQuery}
      onConfirm={(selected) => {
        void controller
          .assignCourses(
            selected.map((s) => s.id),
            unit.id,
          )
          .then(onClose);
      }}
      onClose={onClose}
      isSubmitting={controller.isBulkAssigning}
      emptyText={t(`${prefix}.empty`)}
      alreadyAddedLabel={t(`${prefix}.added`)}
    />
  );
}
