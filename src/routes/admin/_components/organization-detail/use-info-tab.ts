import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useOrganization,
  usePatchOrganization,
} from "@/lib/api/hooks/admin-organizations";
import type { OrganizationStatus } from "@/lib/api/types/admin-organizations";

/**
 * Stateful half of the info tab: the org query, the patch mutation and the two
 * draft fields.
 *
 * Hook order matches the original inline `InfoTab` exactly — useTranslation,
 * query, mutation, draft name, draft status — and `t`/`i18n` are returned from
 * here rather than resolved again in the component so the tab still makes a
 * single `useTranslation` call in the same position. The `!org` early return
 * stays in the component, after every hook has run.
 */
export function useInfoTab(orgId: string) {
  const { t, i18n } = useTranslation();
  const { data: org } = useOrganization(orgId);
  const patch = usePatchOrganization(orgId);
  const [draftName, setDraftName] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<OrganizationStatus | null>(
    null,
  );

  return {
    t,
    i18n,
    org,
    patch,
    draftName,
    setDraftName,
    draftStatus,
    setDraftStatus,
  };
}

export type InfoTabController = ReturnType<typeof useInfoTab>;
