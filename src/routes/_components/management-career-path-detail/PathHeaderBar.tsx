import { useTranslation } from "react-i18next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import type { CareerPathAuthoring } from "@/lib/api/types";
import { COURSE_STATUS_TOKENS, statusToken } from "@/lib/status-tokens";
import { PathActions } from "./PathActions";

/**
 * Breadcrumbs plus the title row (back link, name, status chip, slug and the
 * lifecycle actions). Returns a fragment so both blocks stay direct children
 * of the page's `space-y-6` column exactly as before.
 */
export function PathHeaderBar({
  id,
  data,
  canManage,
}: {
  id: string;
  data: CareerPathAuthoring;
  canManage: boolean;
}) {
  const { t } = useTranslation();
  const statusCls = statusToken(COURSE_STATUS_TOKENS, data.status);
  const statusLabel = t(`management_career_path_detail.status.${data.status}`, {
    defaultValue: data.status,
  });

  return (
    <>
      <div className="pt-4">
        <Breadcrumbs
          items={[
            {
              label: t(
                "management_career_path_detail.breadcrumbs.career_paths",
              ),
              to: "/management/career-paths",
            },
            { label: data.name },
          ]}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-headline font-bold text-m3-on-surface truncate">
              {data.name}
            </h1>
            <span
              className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${statusCls}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-xs text-m3-on-surface-variant mt-0.5 font-mono truncate">
            {data.slug}
          </p>
        </div>
        <PathActions
          id={id}
          status={data.status}
          organizationId={data.organization_id}
          canManage={canManage}
        />
      </div>
    </>
  );
}
