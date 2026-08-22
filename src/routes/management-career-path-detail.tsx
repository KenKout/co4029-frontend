import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissions } from "@/lib/auth/use-permissions";
import { useManagedCareerPath } from "@/lib/api/hooks/career-paths";
import { CoursesTab } from "@/routes/_components/management-career-path-detail/CoursesTab";
import { EditForm } from "@/routes/_components/management-career-path-detail/EditForm";
import { LoadErrorBox } from "@/routes/_components/management-career-path-detail/LoadErrorBox";
import { PathHeaderBar } from "@/routes/_components/management-career-path-detail/PathHeaderBar";
import { PathImpactBanner } from "@/routes/_components/management-career-path-detail/PathImpactBanner";
import { VersionPanel } from "@/routes/_components/management-career-path-detail/VersionPanel";
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
  // management-career-paths.tsx for the rationale. Viewing (course.read) is
  // open to HODs; mutations stay manager-only, so the page gates on read and
  // the edit affordances render only when the caller can manage.
  const canRead = permissions.hasAny("course.read", "system.administer");
  const canManage = permissions.hasAny(
    "course.create",
    "course.update",
    "system.administer",
  );
  const enabled = !permissions.isLoading && canRead;
  const path = useManagedCareerPath(enabled ? id : undefined);

  const [tab, setTab] = useState<TabKey>("courses");

  if (!permissions.isLoading && !canRead) {
    return <PermissionDenied />;
  }

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
      <PathHeaderBar id={id} data={data} canManage={canManage} />

      {canManage && (
        <VersionPanel
          id={id}
          canManage={canManage}
          pathPublished={data.status === "published"}
        />
      )}

      <ImpactSection id={id} status={data.status} canManage={canManage} />

      {canManage && (
        <EditForm
          id={id}
          initialName={data.name}
          initialDescription={data.description ?? ""}
          initialOrganizationId={data.organization_id}
        />
      )}

      <TabBar tab={tab} onSelect={setTab} />

      {tab === "courses" && <CoursesTab id={id} canManage={canManage} />}
      {tab === "students" && (
        <StudentsTab
          id={id}
          canEnroll={false}
          canUnenroll={false}
        />
      )}
      {tab === "progress" && <ProgressTab id={id} />}

    </div>
  );
}

/**
 * Gap 3 §2.1 — warn at the point of edit: only managers editing a PUBLISHED
 * path with students on it see the blast-radius banner. Hoisted out of the
 * page to keep its complexity under the lint cap.
 */
function ImpactSection({
  id,
  status,
  canManage,
}: {
  id: string;
  status: string;
  canManage: boolean;
}) {
  if (!canManage || status !== "published") {
    return null;
  }
  return <PathImpactBanner id={id} />;
}
