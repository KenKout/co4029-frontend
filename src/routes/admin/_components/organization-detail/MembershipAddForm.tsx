import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { InfoTooltip } from "@/components/ui/tooltip";
import type { MembershipStatus } from "@/lib/api/types/admin-organizations";
import { MEMBERSHIP_STATUS_VALUES } from "./constants";
import type { MembershipsTabController } from "./use-memberships-tab";
import { UserSearchCombobox } from "./UserSearchCombobox";

/**
 * Single-user "add member" form: the server-side user typeahead plus the
 * status / student-code / employee-code trio.
 */
export function MembershipAddForm({
  controller,
}: {
  controller: MembershipsTabController;
}) {
  const {
    t,
    create,
    mode,
    selectedUser,
    setSelectedUser,
    studentCode,
    setStudentCode,
    employeeCode,
    setEmployeeCode,
    memStatus,
    setMemStatus,
    handleAdd,
  } = controller;
  return (
    <form
      onSubmit={handleAdd}
      className="rounded-xl bg-white border border-m3-outline-variant/40 p-4 space-y-3"
    >
      <p className="text-sm text-text-muted">
        {t("admin.organizations.memberships.add_intro")}
      </p>
      <label className="block">
        <span className="text-sm font-semibold text-text-strong">
          {t("admin.organizations.memberships.user_label")}{" "}
          <span className="text-red-500">*</span>
        </span>
        <div className="mt-1">
          <UserSearchCombobox
            value={selectedUser}
            onSelect={setSelectedUser}
            enabled={mode === "add"}
          />
        </div>
        <span className="text-xs text-text-muted mt-1 block">
          {t("admin.organizations.memberships.user_search_hint")}
        </span>
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label>
          <span className="text-sm font-semibold text-text-strong">
            {t("admin.organizations.fields.status")}
            <InfoTooltip
              content={t("admin.organizations.tooltips.membership_status")}
              label={t("admin.organizations.fields.status")}
            />
          </span>
          <Select<MembershipStatus>
            value={memStatus}
            onValueChange={(next) => setMemStatus(next)}
            options={MEMBERSHIP_STATUS_VALUES.map((k) => ({
              value: k,
              label: t(`admin.organizations.membership_status_label.${k}`),
            }))}
            className="mt-1"
          />
        </label>
        <label>
          <span className="text-sm font-semibold text-text-strong">
            {t("admin.organizations.fields.student_code")}
          </span>
          <Input
            type="text"
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
            className="mt-1 font-mono"
          />
        </label>
        <label>
          <span className="text-sm font-semibold text-text-strong">
            {t("admin.organizations.fields.employee_code")}
          </span>
          <Input
            type="text"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            className="mt-1 font-mono"
          />
        </label>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={create.isPending || !selectedUser}>
          {create.isPending
            ? t("admin.organizations.actions.adding")
            : t("admin.organizations.actions.add")}
        </Button>
      </div>
    </form>
  );
}
