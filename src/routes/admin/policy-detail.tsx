import { useCallback, useRef, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, FilePlus2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { RichContent } from "@/components/ui/rich-content";
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
import { PolicyVersionPanel } from "./_components/policies/PolicyVersionPanel";

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

export default function AdminPolicyDetailPage() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const { policyId } = useParams({ strict: false }) as { policyId?: string };

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const { data: policy, isPending, isError } = useAdminPolicy(policyId);
  const { published, draft, shown } = policy
    ? displayVersion(policy)
    : { published: null, draft: null, shown: null };
  // Only a draft is editable, so only a draft's body is ever fetched. A
  // selected PUBLISHED version gets its own read-only fetch instead.
  const draftBody = useAdminPolicyVersion(policyId, draft?.id);
  const inspectBody = useAdminPolicyVersion(
    policyId,
    selectedVersionId ?? undefined,
  );
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

      <PolicyWorkspace
        policy={policy}
        draft={draft}
        draftBody={draftBody}
        inspectBody={inspectBody}
        selectedVersionId={selectedVersionId}
        onSelectVersion={setSelectedVersionId}
        openDraftPending={openDraft.isPending}
        onOpenDraft={() => void handleOpenDraft()}
        onDraftRetry={() => setSelectedVersionId(null)}
      />
    </div>
  );
}

/** Main column + version rail, the career-path-detail workspace grid. */
function PolicyWorkspace({
  policy,
  draft,
  draftBody,
  inspectBody,
  selectedVersionId,
  onSelectVersion,
  openDraftPending,
  onOpenDraft,
}: {
  policy: NonNullable<ReturnType<typeof useAdminPolicy>["data"]>;
  draft: ReturnType<typeof displayVersion>["draft"];
  draftBody: ReturnType<typeof useAdminPolicyVersion>;
  inspectBody: ReturnType<typeof useAdminPolicyVersion>;
  selectedVersionId: string | null;
  onSelectVersion: (id: string | null) => void;
  openDraftPending: boolean;
  onOpenDraft: () => void;
  onDraftRetry?: () => void;
}) {
  const { t } = useTranslation();
  // The audience picker registers its save; the shared sticky bar triggers it
  // alongside the draft-text save.
  const audienceSaveRef = useRef<(() => Promise<void>) | null>(null);
  const registerAudienceSave = useCallback(
    (save: (() => Promise<void>) | null) => {
      audienceSaveRef.current = save;
    },
    [],
  );
  const [audienceDirty, setAudienceDirty] = useState(false);
  const handleAudienceDirty = useCallback((dirty: boolean) => {
    setAudienceDirty(dirty);
  }, []);
  const [editorDirty, setEditorDirty] = useState(false);
  const handleEditorDirty = useCallback((dirty: boolean) => {
    setEditorDirty(dirty);
  }, []);

  // Latest editor actions (save/publish/pending flags) from the mounted
  // editor. Held in STATE, not a ref: registration happens in the editor's
  // mount effect, and writing a ref would not re-render this component —
  // leaving canPublish false (ref still null) until some unrelated state
  // changed. State makes the registration itself trigger the re-render that
  // enables Publish on arrival.
  const [editorActions, setEditorActions] = useState<{
    save: () => Promise<boolean>;
    publish: () => Promise<void>;
    savePending: () => boolean;
    publishPending: () => boolean;
    canPublish: () => boolean;
  } | null>(null);

  const combinedDirty = editorDirty || audienceDirty;

  // One Save = draft text (if any) + audience selection (if changed).
  async function handleCombinedSave() {
    const saved = (await editorActions?.save()) ?? true;
    if (saved) await audienceSaveRef.current?.();
  }

  // Publish = save draft text + publish that version (the editor's flow),
  // then persist the audience selection too so the whole page is consistent.
  async function handleCombinedPublish() {
    await editorActions?.publish();
    await audienceSaveRef.current?.();
  }

  const savePending = editorActions?.savePending() ?? false;
  const publishPending = editorActions?.publishPending() ?? false;
  const canPublish =
    !selectedVersionId && Boolean(draft) && (editorActions?.canPublish() ?? false);

  return (
      <div className="grid items-start gap-6 lg:grid-cols-10">
        <main className="space-y-5 lg:col-span-7 pt-4">
          <PolicyAudiencePicker
            policy={policy}
            onDirtyChange={handleAudienceDirty}
            registerSave={registerAudienceSave}
          />

          {selectedVersionId ? (
            <InspectingVersionCard inspectBody={inspectBody} />
          ) : draft ? (
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
                onDirtyChange={handleEditorDirty}
                registerActions={setEditorActions}
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
                disabled={openDraftPending}
                onClick={onOpenDraft}
              >
                <FilePlus2 className="h-4 w-4" />
                {t("admin.policies.actions.new_draft")}
              </Button>
            </section>
          )}
        </main>

        <div className="lg:col-span-3 lg:sticky lg:top-16 z-10">
          {/* One sticky section: actions + version history. */}
          <PolicyVersionPanel
            versions={policy.versions}
            currentId={null}
            selectedVersionId={selectedVersionId}
            onSelect={onSelectVersion}
            canManage
            actionsDirty={combinedDirty}
            onSave={() => void handleCombinedSave()}
            onPublish={() => void handleCombinedPublish()}
            savePending={savePending}
            publishPending={publishPending}
            canPublish={canPublish}
          />
        </div>
      </div>
  );
}

/** A published version under inspection: immutable reader rendering. */
function InspectingVersionCard({
  inspectBody,
}: {
  inspectBody: ReturnType<typeof useAdminPolicyVersion>;
}) {
  const { t } = useTranslation();
  if (inspectBody.isPending) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }
  if (!inspectBody.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {t("admin.policies.load_failed")}
      </div>
    );
  }
  return (
    <section className="space-y-3">
      <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {t("admin.policies.readonly_banner")}
      </div>
      <div className="overflow-hidden rounded-xl border border-m3-outline-variant/20 bg-white p-6">
        <RichContent
          value={inspectBody.data.body}
          format={inspectBody.data.format}
          className={PREVIEW_PROSE}
        />
      </div>
    </section>
  );
}

