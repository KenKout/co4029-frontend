import { useMemo, useState } from "react";
import { useMe } from "@/lib/api/hooks/auth";
import {
  useCreateOrgUnit,
  useDeleteOrgUnit,
  useOrgUnitTree,
  usePatchOrgUnit,
  type OrgUnitNode,
} from "@/lib/api/hooks/admin-organizations";
import { findNode, subtreeIds } from "@/components/ui/org-unit-tree";
import type {
  OrgUnitCreate,
  OrgUnitPatch,
} from "@/lib/api/types/admin-organizations";

export type UnitType =
  | "faculty"
  | "department"
  | "office"
  | "program"
  | "campus"
  | "other";

export const UNIT_TYPES: UnitType[] = [
  "faculty",
  "department",
  "office",
  "program",
  "campus",
  "other",
];

export interface UnitFormState {
  name: string;
  code: string;
  unitType: UnitType;
  parentUnitId: string | null;
}

const EMPTY_FORM: UnitFormState = {
  name: "",
  code: "",
  unitType: "department",
  parentUnitId: null,
};

/**
 * State + mutations for the manager's org-unit tree screen.
 *
 * The org id comes from `/users/me` rather than a route param: a manager has
 * exactly one organization and never picks it, unlike the admin screen which
 * reaches units through an organization detail page.
 *
 * All four operations reuse the existing `/admin/...` org-unit endpoints.
 * That is not a layering slip — those endpoints are gated on
 * `org_unit.manage`, which managers hold, and they scope every request to
 * the caller's own org server-side. Only the SPA route guard was
 * admin-only, which is why this screen exists at all.
 */
export function useOrgUnitsPage() {
  const me = useMe();
  const orgId = me.data?.organization_id ?? undefined;

  const tree = useOrgUnitTree(orgId);
  const create = useCreateOrgUnit(orgId ?? "");
  const patch = usePatchOrgUnit(orgId ?? "");
  const remove = useDeleteOrgUnit(orgId ?? "");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<UnitFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OrgUnitNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nodes = useMemo(() => tree.data ?? [], [tree.data]);
  const selected = useMemo(
    () => (selectedId ? findNode(nodes, selectedId) : null),
    [nodes, selectedId],
  );

  /**
   * Units a given unit may be re-parented under.
   *
   * Excludes the unit's own subtree: the backend rejects that as a cycle,
   * and offering a choice that always fails is worse than omitting it. When
   * creating (no `editingId`) every unit is a candidate.
   */
  const parentCandidates = useMemo(() => {
    if (!editingId) return nodes;
    const blocked = subtreeIds(nodes, editingId);
    const prune = (list: OrgUnitNode[]): OrgUnitNode[] =>
      list
        .filter((n) => !blocked.has(n.id))
        .map((n) => ({ ...n, children: prune(n.children) }));
    return prune(nodes);
  }, [nodes, editingId]);

  function openCreate(parentUnitId: string | null) {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, parentUnitId });
    setError(null);
    setDialog("create");
  }

  function openEdit(node: OrgUnitNode) {
    setEditingId(node.id);
    setForm({
      name: node.name,
      code: node.code ?? "",
      unitType: node.unit_type as UnitType,
      parentUnitId: node.parent_unit_id,
    });
    setError(null);
    setDialog("edit");
  }

  function closeDialog() {
    setDialog(null);
    setEditingId(null);
    setError(null);
  }

  function submit() {
    setError(null);
    const name = form.name.trim();
    if (!name) return;
    // Empty string is not "no code" — the column is nullable and a blank
    // string would make the code chip render as an empty badge.
    const code = form.code.trim() || null;

    if (editingId) {
      const body: OrgUnitPatch = {
        name,
        code,
        unit_type: form.unitType,
        parent_unit_id: form.parentUnitId,
      };
      patch.mutate(
        { unitId: editingId, body },
        { onSuccess: closeDialog, onError: (e) => setError(messageOf(e)) },
      );
      return;
    }
    const body: OrgUnitCreate = {
      name,
      code,
      unit_type: form.unitType,
      parent_unit_id: form.parentUnitId,
    };
    create.mutate(body, {
      onSuccess: closeDialog,
      onError: (e) => setError(messageOf(e)),
    });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    remove.mutate(id, {
      onSuccess: () => {
        setPendingDelete(null);
        // The selection may have just been deleted along with its subtree.
        if (selectedId && subtreeIds(nodes, id).has(selectedId)) {
          setSelectedId(null);
        }
      },
      onError: (e) => setError(messageOf(e)),
    });
  }

  return {
    orgId,
    isLoading: me.isLoading || tree.isLoading,
    isError: tree.isError,
    nodes,
    selected,
    selectedId,
    setSelectedId,
    dialog,
    form,
    setForm,
    editingId,
    parentCandidates,
    openCreate,
    openEdit,
    closeDialog,
    submit,
    isSubmitting: create.isPending || patch.isPending,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    isDeleting: remove.isPending,
    error,
  };
}

/**
 * Backend messages first, generic fallback second.
 *
 * The org-unit endpoints answer `{detail: {error, message}}` and the message
 * is the actionable half — "parent_unit_id would create a cycle…" tells the
 * manager what to pick instead, where "Request failed" does not.
 */
function messageOf(error: unknown): string {
  const body = (error as { parsedBody?: unknown })?.parsedBody;
  const detail = (body as { detail?: unknown } | undefined)?.detail;
  if (detail && typeof detail === "object") {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  if (typeof detail === "string") return detail;
  return (error as Error)?.message ?? "Request failed";
}
