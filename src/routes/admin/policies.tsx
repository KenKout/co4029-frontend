import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, Globe, Plus, Users, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { usePermissions } from "@/lib/auth/use-permissions";
import {
  useAdminPolicies,
  useCreatePolicy,
  type PolicyCategory,
  type PolicyDetail,
} from "@/lib/api/hooks/policies";
import { displayVersion } from "./_components/policies/policy-display";
import { PolicyStatusBadge } from "./_components/policies/PolicyStatusBadge";

/**
 * Constrain slug input rather than sanitising later.
 *
 * The shape has to match the server's `^[a-z0-9]+(?:-[a-z0-9]+)*$` exactly, so
 * runs of hyphens are collapsed too — "Terms - Draft" otherwise yields
 * `terms---draft`, which the API rejects after the admin has typed a whole form.
 */
function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CreatePolicyDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<PolicyCategory>("legal");
  // Once the admin edits the slug themselves, stop deriving it from the title
  // — otherwise a deliberate slug is silently clobbered mid-typing.
  const [slugTouched, setSlugTouched] = useState(false);
  const create = useCreatePolicy();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({ slug, category, title });
      toast.success(t("admin.policies.toasts.create_success"));
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin.policies.toasts.create_failed"),
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <h2 className="font-headline text-xl font-bold text-text-strong">
            {t("admin.policies.create_dialog_title")}
          </h2>
          <Button variant="ghost" type="button" onClick={onClose} className="p-1">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-text-strong">
              {t("admin.policies.fields.title")}
            </span>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              required
              className="mt-1"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-text-strong">
              {t("admin.policies.fields.slug")}
            </span>
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              required
              className="mt-1 font-mono"
            />
            <span className="mt-1 block text-xs text-text-muted">
              {t("admin.policies.slug_hint")}
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-text-strong">
              {t("admin.policies.fields.category")}
            </span>
            <Select<PolicyCategory>
              value={category}
              onValueChange={setCategory}
              options={(["legal", "academic"] as const).map((k) => ({
                value: k,
                label: t(`admin.policies.category_label.${k}`),
              }))}
              className="mt-1"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={create.isPending}
          >
            {t("admin.policies.actions.cancel")}
          </Button>
          <Button type="submit" disabled={create.isPending || !slug}>
            {create.isPending
              ? t("admin.policies.actions.creating")
              : t("admin.policies.actions.create")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function PolicyRow({ policy }: { policy: PolicyDetail }) {
  const { t } = useTranslation();
  const { published, draft, shown } = displayVersion(policy);

  return (
    <Link
      to="/admin/policies/$policyId"
      params={{ policyId: policy.id }}
      className="flex items-start gap-4 rounded-xl border border-m3-outline-variant/20 bg-white p-4 transition-colors hover:border-m3-primary/40 hover:bg-m3-primary/5"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-m3-primary-fixed">
        <FileText className="h-4 w-4 text-m3-primary" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-text-strong">
            {shown?.title ?? policy.slug}
          </p>
          <span className="rounded-full bg-m3-surface-container-high px-2 py-0.5 text-[11px] font-semibold text-m3-on-surface-variant">
            {t(`admin.policies.category_label.${policy.category}`)}
          </span>
        </div>
        <p className="truncate font-mono text-xs text-text-muted">
          /policy/{policy.slug}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          {published ? (
            <PolicyStatusBadge status="published" version={published.version_no} />
          ) : (
            <span className="font-semibold text-amber-700">
              {t("admin.policies.no_published_version")}
            </span>
          )}
          {/* An open draft is the actionable state, so it is called out even
              when a published version already exists. */}
          {draft ? <PolicyStatusBadge status="draft" version={draft.version_no} /> : null}

          <span className="inline-flex items-center gap-1">
            {policy.audience.length === 0 ? (
              <>
                <Globe className="h-3 w-3" />
                {t("admin.policies.public_audience")}
              </>
            ) : (
              <>
                <Users className="h-3 w-3" />
                {policy.audience.map((r) => r.name).join(", ")}
              </>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AdminPoliciesPage() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const [showCreate, setShowCreate] = useState(false);
  const { data, isPending, isError } = useAdminPolicies();

  if (!permissions.hasAny("system.administer")) return <PermissionDenied />;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl font-bold text-text-strong">
            {t("admin.policies.list_title")}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {t("admin.policies.list_subtitle")}
          </p>
        </div>
        <Button type="button" onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("admin.policies.create_button")}
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {t("admin.policies.load_failed")}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-m3-outline-variant/40 p-10 text-center text-sm text-text-muted">
          {t("admin.policies.empty_title")}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <PolicyRow key={p.id} policy={p} />
          ))}
        </div>
      )}

      {showCreate && <CreatePolicyDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}
