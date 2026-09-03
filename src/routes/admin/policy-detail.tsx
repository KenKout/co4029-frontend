import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, FilePlus2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissions } from "@/lib/auth/use-permissions";
import {
  useAdminPolicy,
  useAdminPolicyVersion,
  useOpenPolicyDraft,
} from "@/lib/api/hooks/policies";
import { displayVersion } from "./_components/policies/policy-display";
import { PolicyAudiencePicker } from "./_components/policies/PolicyAudiencePicker";
import { PolicyStatusBadge } from "./_components/policies/PolicyStatusBadge";
import { PolicyVersionEditor } from "./_components/policies/PolicyVersionEditor";

/**
 * Authoring surface for one policy: audience, version history, and the draft.
 *
 * The page is built around the fact that published text is immutable. There is
 * no "edit the live policy" affordance because there is no such operation —
 * revising means opening a new draft, working on it while readers keep seeing
 * the current version, and publishing when it is ready. Making that the only
 * available path is what keeps a version number meaningful.
 */
const PREVIEW_PROSE =
  "[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold " +
  "[&_h2]:font-headline [&_h2]:tracking-tight [&_h2]:leading-snug " +
  "[&_h2:first-child]:mt-0 " +
  "[&_p]:my-4 [&_p]:leading-relaxed " +
  "[&_li]:my-1.5 " +
  "[&_strong]:font-semibold " +
  "[&_a]:font-medium [&_a]:text-m3-primary [&_a]:underline-offset-2";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminPolicyDetailPage() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const { policyId } = useParams({ strict: false }) as { policyId?: string };

  const { data: policy, isPending, isError } = useAdminPolicy(policyId);
  const { published, draft, shown } = policy
    ? displayVersion(policy)
    : { published: null, draft: null, shown: null };
  // Only a draft is editable, so only a draft's body is ever fetched.
  const draftBody = useAdminPolicyVersion(policyId, draft?.id);
  const openDraft = useOpenPolicyDraft(policyId ?? "");

  async function handleOpenDraft() {
    try {
      await openDraft.mutateAsync({});
      toast.success(t("admin.policies.toasts.draft_opened"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("admin.policies.toasts.draft_failed"),
      );
    }
  }

  if (!permissions.hasAny("system.administer")) return <PermissionDenied />;

  if (isPending) {
    return (
      <div className="space-y-4 pb-12">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !policy) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {t("admin.policies.load_failed")}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <Link
        to="/admin/policies"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-m3-on-surface-variant hover:text-m3-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("admin.policies.actions.back")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-headline text-2xl font-bold text-text-strong">
            {shown?.title ?? policy.slug}
          </h1>
          <p className="mt-1 font-mono text-xs text-text-muted">/policy/{policy.slug}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {published ? (
              <PolicyStatusBadge status="published" version={published.version_no} />
            ) : (
              <span className="text-xs font-semibold text-amber-700">
                {t("admin.policies.no_published_version")}
              </span>
            )}
            {draft ? <PolicyStatusBadge status="draft" version={draft.version_no} /> : null}
          </div>
        </div>

        {/* Only offered once something is live — the public URL 404s until
            there is a published version, and linking to a 404 is worse than
            not linking at all. */}
        {published ? (
          <Link
            to="/policy/$slug"
            params={{ slug: policy.slug }}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-m3-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("admin.policies.actions.view")}
          </Link>
        ) : null}
      </div>

      <PolicyAudiencePicker policy={policy} />

      {draft ? (
        draftBody.isPending ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : draftBody.data ? (
          <PolicyVersionEditor
            // Remount on a different draft so the editor's local state starts
            // from that draft's text rather than the previous one's.
            key={draftBody.data.id}
            policyId={policy.id}
            draft={draftBody.data}
            bodyProse={PREVIEW_PROSE}
          />
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {t("admin.policies.load_failed")}
          </div>
        )
      ) : (
        <section className="rounded-xl border border-dashed border-m3-outline-variant/40 p-8 text-center">
          <h2 className="font-headline text-base font-bold text-text-strong">
            {t("admin.policies.no_draft_title")}
          </h2>
          <p className="mx-auto mt-1 max-w-prose text-sm text-text-muted">
            {t("admin.policies.no_draft_hint")}
          </p>
          <Button
            type="button"
            className="mt-4 gap-2"
            disabled={openDraft.isPending}
            onClick={() => void handleOpenDraft()}
          >
            <FilePlus2 className="h-4 w-4" />
            {t("admin.policies.actions.new_draft")}
          </Button>
        </section>
      )}

      <section className="rounded-xl border border-m3-outline-variant/20 bg-white p-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("admin.policies.versions_title")}
        </h2>
        <ul className="mt-3 divide-y divide-m3-outline-variant/15">
          {policy.versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <PolicyStatusBadge status={v.status} version={v.version_no} />
              <span className="text-sm text-text-strong">{v.title}</span>
              <span className="rounded bg-m3-surface-container-high px-1.5 py-0.5 font-mono text-[11px] uppercase text-m3-on-surface-variant">
                {v.language}
              </span>
              {v.changelog ? (
                <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
                  {v.changelog}
                </span>
              ) : (
                <span className="flex-1" />
              )}
              <span className="text-xs text-text-muted">
                {v.status === "draft" ? formatDate(v.updated_at) : formatDate(v.published_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
