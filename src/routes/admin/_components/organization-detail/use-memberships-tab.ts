import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useCreateMembership,
  useOrganizationMemberships,
  type AdminUserSearchRow,
} from "@/lib/api/hooks/admin-organizations";
import type { MembershipStatus } from "@/lib/api/types/admin-organizations";
import { errorMessage, parseBulkUserIds } from "./helpers";
import type { BulkAddResults, MembershipsMode } from "./types";

/**
 * Stateful half of the memberships tab: the roster query, the create mutation,
 * the pane mode, the single-add form fields, the bulk-add buffer/outcome, and
 * the two submit handlers.
 *
 * Hook order is identical to the original inline `MembershipsTab` —
 * translation, roster query, create mutation, mode, selected user, student
 * code, employee code, status, bulk text, bulk results, bulk pending, then the
 * `[bulkText]` memo. The UUID guard moved to module scope in constants.ts; it
 * was never a hook.
 */
export function useMembershipsTab(orgId: string) {
  const { t } = useTranslation();
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await create.mutateAsync({
        user_id: selectedUser.user_id,
        org_unit_id: null,
        status: memStatus,
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
    members,
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
  };
}

export type MembershipsTabController = ReturnType<typeof useMembershipsTab>;
