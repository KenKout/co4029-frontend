import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import {
  useCreateMembership,
  useOrganizationMemberships,
  type AdminUserSearchRow,
} from "@/lib/api/hooks/admin-organizations";
import type { MembershipStatus } from "@/lib/api/types/admin-organizations";
import type { User } from "@/lib/api/types";
import { errorMessage, parseBulkUserIds } from "./helpers";
import type { BulkAddResults, MembershipsMode } from "./types";

/**
 * Stateful half of the memberships tab: the roster query, the org's user
 * catalog (drives avatars / names in the table), the create mutation, the
 * pane mode, the single-add form fields, the bulk-add buffer/outcome, and
 * the two submit handlers.
 *
 * Hook order is identical to the original inline `MembershipsTab` —
 * translation, roster query, create mutation, mode, selected user, student
 * code, employee code, status, bulk text, bulk results, bulk pending, then
 * the `[bulkText]` memo. The UUID guard moved to module scope in constants.ts;
 * it was never a hook.
 */
export function useMembershipsTab(orgId: string) {
  const { t, i18n } = useTranslation();
  const { data: members, isLoading } = useOrganizationMemberships(orgId);
  const create = useCreateMembership(orgId);
  const [mode, setMode] = useState<MembershipsMode>("list");
  const [selectedUser, setSelectedUser] = useState<AdminUserSearchRow | null>(
    null,
  );
  const [studentCode, setStudentCode] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [memStatus, setMemStatus] = useState<MembershipStatus>("active");

  // Bulk add state
  const [bulkText, setBulkText] = useState("");
  const [bulkResults, setBulkResults] = useState<BulkAddResults | null>(null);
  const [bulkPending, setBulkPending] = useState(false);

  const parsedBulk = useMemo(() => parseBulkUserIds(bulkText), [bulkText]);

  // The org's user catalog — one round-trip maps every membership user_id to
  // a display name + presigned avatar URL (admin user search). Memberships
  // carry only user_id, so without this the roster would be a list of UUIDs.
  const usersQuery = useQuery({
    queryKey: [...queryKeys.admin.organizationMemberships(orgId), "users"] as const,
    queryFn: () =>
      apiFetch<{ items: User[] }>(
        `/users/search?organization=${orgId}&page_size=200`,
      ).then((page) => page.items),
    enabled: Boolean(orgId),
  });
  const userById = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of usersQuery.data ?? []) map.set(u.id, u);
    return map;
  }, [usersQuery.data]);

  // Client-side search: filters the roster by the user's display name or
  // email (resolved through the catalog) so the toolbar works like the other
  // admin tables without a dedicated backend query.
  const [search, setSearch] = useState("");
  const filteredMembers = useMemo(() => {
    const rows = members ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((m) => {
      const u = userById.get(m.user_id);
      const haystack =
        `${u?.profile?.display_name ?? ""} ${u?.primary_email ?? ""} ${m.user_id}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [members, search, userById]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await create.mutateAsync({
        user_id: selectedUser.user_id,
        org_unit_id: null,
        status: memStatus as "active" | "inactive" | "suspended",
        student_code: studentCode || null,
        employee_code: employeeCode || null,
      });
      setSelectedUser(null);
      setStudentCode("");
      setEmployeeCode("");
      setMemStatus("active");
      setMode("list");
      toast.success(t("admin.organizations.toasts.member_added"));
    } catch (err) {
      toast.error(
        errorMessage(err, t("admin.organizations.toasts.create_failed")),
      );
    }
  }

  async function handleBulkAdd(e: React.FormEvent) {
    e.preventDefault();
    const lines = parsedBulk.userIds;
    if (lines.length === 0) return;
    setBulkPending(true);
    const ok: string[] = [];
    const failed: string[] = [];
    for (const userId of lines) {
      try {
        await create.mutateAsync({
          user_id: userId,
          org_unit_id: null,
          status: "active",
          student_code: null,
          employee_code: null,
        });
        ok.push(userId);
      } catch {
        failed.push(userId);
      }
    }
    setBulkPending(false);
    setBulkResults({ ok, failed });
    setBulkText("");
    if (ok.length > 0) {
      toast.success(
        t("admin.organizations.toasts.bulk_added", {
          count: ok.length,
          defaultValue: `Added ${ok.length} member(s)`,
        }),
      );
    }
  }

  return {
    t,
    i18n,
    orgId,
    members,
    filteredMembers,
    isLoading,
    create,
    mode,
    setMode,
    selectedUser,
    setSelectedUser,
    studentCode,
    setStudentCode,
    employeeCode,
    setEmployeeCode,
    memStatus,
    setMemStatus,
    bulkText,
    setBulkText,
    bulkResults,
    setBulkResults,
    bulkPending,
    parsedBulk,
    handleAdd,
    handleBulkAdd,
    userById,
    search,
    setSearch,
  };
}

export type MembershipsTabController = ReturnType<typeof useMembershipsTab>;
