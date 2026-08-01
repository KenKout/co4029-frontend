import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { useManagedCareerPath } from "@/lib/api/hooks/career-paths";
import { CoursesTab } from "@/routes/_components/management-career-path-detail/CoursesTab";
import { EditForm } from "@/routes/_components/management-career-path-detail/EditForm";
import { LoadErrorBox } from "@/routes/_components/management-career-path-detail/LoadErrorBox";
import { PathHeaderBar } from "@/routes/_components/management-career-path-detail/PathHeaderBar";
import { ProgressTab } from "@/routes/_components/management-career-path-detail/ProgressTab";
import { StudentsTab } from "@/routes/_components/management-career-path-detail/StudentsTab";
import { TabBar } from "@/routes/_components/management-career-path-detail/TabBar";
import type { TabKey } from "@/routes/_components/management-career-path-detail/types";

export default function ManagementCareerPathDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams({ strict: false }) as { id: string };
  const permissions = usePermissions();
  // Backend gates career-path authoring on course lifecycle codes (manager
  // holds them); there is no `career_path.manage` code. See the sibling
  // management-career-paths.tsx for the rationale.
  const canManage = permissions.hasAny(
    "course.create",
    "course.update",
    "system.administer",
  );

  useRequirePermission(canManage, {
    messageKey: "common.no_permission",
  });

  const enabled = !permissions.isLoading && canManage;
  const path = useManagedCareerPath(enabled ? id : undefined);

  const [tab, setTab] = useState<TabKey>("courses");

  if (!enabled || path.isLoading) {
    return <PageSkeleton rows={3} rounded="rounded-lg" className="pb-12" />;
  }

  if (path.isError || !path.data) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <LoadErrorBox
          message={t("management_career_path_detail.errors.load_failed")}
        />
      </div>
    );
  }

  const data = path.data;

  return (
    <div className="max-w-[1200px] mx-auto pb-16 space-y-6 px-4 sm:px-6 lg:px-8">
      <PathHeaderBar id={id} data={data} />

      <EditForm
        id={id}
        initialName={data.name}
        initialDescription={data.description ?? ""}
        initialOrgUnitId={data.org_unit_id ?? ""}
      />

      <TabBar tab={tab} onSelect={setTab} />

      {tab === "courses" && <CoursesTab id={id} />}
      {tab === "students" && <StudentsTab id={id} />}
      {tab === "progress" && <ProgressTab id={id} />}
    </div>
  );
}
