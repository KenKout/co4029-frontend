import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  EntityMultiSelectDialog,
  type SelectableEntity,
} from "@/components/ui/entity-multi-select-dialog";
import type { OrgUnitNode } from "@/lib/api/hooks/admin-organizations";
import type { useUnitAssignment } from "./use-unit-assignment";

/**
 * Bulk "add people to this unit" picker.
 *
 * Replaces an inline list in the detail sidebar that could only add one
 * person per click, in a third-width column, with the candidate list
 * re-sorting under the cursor after every add. Assigning a cohort of thirty
 * students meant thirty clicks into a moving target.
 *
 * `EntityMultiSelectDialog` is the component this should have used from the
 * start — the same one the career-path student picker and the learning-program
 * screens use, so checkbox multi-select, search, disabled already-added rows
 * and the submitting state all come for free and behave identically.
 *
 * The one thing added on top is the **current unit** on each row. A
 * membership carries a single `org_unit_id`, so adding someone here MOVES
 * them out of wherever they are now — that has to be visible before you
 * confirm, not discovered later when a scope filter comes up short.
 */
export function AddPeopleDialog({
  unit,
  unitsById,
  controller,
  onClose,
}: {
  unit: OrgUnitNode;
  /** Unit id → name, for the "currently in X" hint. */
  unitsById: Map<string, string>;
  controller: ReturnType<typeof useUnitAssignment>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const prefix = "management_org_units.people_picker";

  const items = useMemo<SelectableEntity[]>(() => {
    const needle = query.trim().toLowerCase();
    return controller.allPeople
      .filter(
        (p) =>
          !needle ||
          p.displayName.toLowerCase().includes(needle) ||
          p.email.toLowerCase().includes(needle),
      )
      .map((p) => {
        const currentUnit =
          p.currentUnitId && p.currentUnitId !== unit.id
            ? unitsById.get(p.currentUnitId)
            : null;
        return {
          id: p.membershipId,
          primaryLabel: p.displayName,
          // Email plus, when they already belong somewhere else, where from —
          // the move is the consequence a manager needs to see up front.
          secondaryLabel: currentUnit
            ? `${p.email} · ${t(`${prefix}.currently_in`, { unit: currentUnit })}`
            : p.email,
        };
      });
  }, [controller.allPeople, query, unit.id, unitsById, t]);

  // Already-in-this-unit rows render checked + disabled rather than being
  // filtered out, so the list does not reshuffle as you add and you can see
  // who is already here without closing the dialog.
  const alreadySelectedIds = useMemo(
    () => new Set(controller.peopleInUnit.map((p) => p.membershipId)),
    [controller.peopleInUnit],
  );

  return (
    <EntityMultiSelectDialog
      title={t(`${prefix}.title`, { unit: unit.name })}
      searchPlaceholder={t(`${prefix}.search_placeholder`)}
      items={items}
      alreadySelectedIds={alreadySelectedIds}
      isLoading={controller.membershipsLoading}
      query={query}
      onQueryChange={setQuery}
      onConfirm={(selected) => {
        void controller
          .assignPeople(
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
