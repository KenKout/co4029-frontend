import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Globe,
  Plus,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PermissionDenied } from "@/components/ui/permission-denied";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UserEmailIdentity } from "@/components/ui/user-identity";
import { useUsersByIds } from "@/lib/api/hooks/admin";
import {
  useAdminPolicies,
  useCreatePolicy,
  type PolicyCategory,
  type PolicyDetail,
} from "@/lib/api/hooks/policies";
import type { User } from "@/lib/api/types";
import { usePermissions } from "@/lib/auth/use-permissions";
import { useFormatDateTimeMedium } from "@/lib/format/date";
import { getUserAvatarUrl, getUserDisplayName } from "@/lib/user-identity";
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
        onSubmit={(event) => void handleSubmit(event)}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <h2 className="font-headline text-xl font-bold text-text-strong">
            {t("admin.policies.create_dialog_title")}
          </h2>
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            className="p-1"
          >
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
              mono
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              required
              className="mt-1"
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
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={create.isPending || !slug}>
            {create.isPending
              ? t("admin.policies.actions.creating")
              : t("common.create")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function PolicyRow({
  policy,
  publishers,
  publishersLoading,
}: {
  policy: PolicyDetail;
  publishers: User[] | undefined;
  publishersLoading: boolean;
}) {
  const { t } = useTranslation();
  const formatDateTime = useFormatDateTimeMedium();
  const { published, draft, shown } = displayVersion(policy);
  const publisher = published?.published_by
    ? publishers?.find((user) => user.id === published.published_by)
    : undefined;

  return (
    <Link
      to="/admin/policies/$policyId"
      params={{ policyId: policy.id }}
      className="flex items-start gap-4 rounded-xl border border-m3-outline-variant/20 bg-white p-4 transition-colors hover:border-m3-primary/40 hover:bg-m3-primary/5"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-m3-primary-fixed">
        <FileText className="h-4 w-4 text-m3-primary" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              <PolicyStatusBadge
                status="published"
                version={published.version_no}
              />
            ) : (
              <span className="font-semibold text-amber-700">
                {t("admin.policies.no_published_version")}
              </span>
            )}
            {/* An open draft is the actionable state, so it is called out even
                when a published version already exists. */}
            {draft ? (
              <PolicyStatusBadge status="draft" version={draft.version_no} />
            ) : null}

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

        {published ? (
          <aside className="shrink-0 border-t border-m3-outline-variant/15 pt-3 sm:min-w-56 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted sm:text-right">
              {t("admin.policies.published_by_label")}
            </p>
            {published.published_by && publishersLoading ? (
              <div className="flex items-center gap-3 sm:justify-end">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ) : publisher ? (
              <UserEmailIdentity
                id={publisher.id}
                displayName={getUserDisplayName(publisher)}
                avatarUrl={getUserAvatarUrl(publisher)}
                email={publisher.primary_email}
                className="sm:justify-end"
              />
            ) : (
              <p className="text-sm font-semibold text-text-strong sm:text-right">
                {published.published_by ?? t("admin.audit.system")}
              </p>
            )}
            {published.published_at ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-muted sm:justify-end">
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                {t("admin.policies.published_at", {
                  value: formatDateTime(published.published_at),
                })}
              </p>
            ) : null}
          </aside>
        ) : null}
      </div>
    </Link>
  );
}

function PolicyInventoryPanel({ policies }: { policies: PolicyDetail[] }) {
  const { t } = useTranslation();
  const stats = policies.reduce(
    (acc, policy) => {
      const { published, draft } = displayVersion(policy);
      acc.total += 1;
      if (published) acc.published += 1;
      if (draft) acc.drafts += 1;
      if (policy.audience.length === 0) acc.public += 1;
      else acc.restricted += 1;
      return acc;
    },
    { total: 0, published: 0, drafts: 0, public: 0, restricted: 0 },
  );

  const tiles = [
    {
      label: t("admin.policies.inventory.total", {
        defaultValue: "Total policies",
      }),
      value: stats.total,
      icon: FileText,
    },
    {
      label: t("admin.policies.inventory.published", {
        defaultValue: "Published",
      }),
      value: stats.published,
      icon: CheckCircle2,
    },
    {
      label: t("admin.policies.inventory.drafts", {
        defaultValue: "Open drafts",
      }),
      value: stats.drafts,
      icon: Clock3,
    },
    {
      label: t("admin.policies.inventory.audience", {
        defaultValue: "Public / restricted",
      }),
      value: `${stats.public} / ${stats.restricted}`,
      icon: ShieldCheck,
    },
  ];

  return (
    <aside className="space-y-4 rounded-xl border border-m3-outline-variant/20 bg-white p-4 shadow-sm lg:sticky lg:top-20">
      <div>
        <h2 className="font-headline text-base font-bold text-text-strong">
          {t("admin.policies.inventory.title", {
            defaultValue: "Policy inventory",
          })}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          {t("admin.policies.inventory.subtitle", {
            defaultValue:
              "At-a-glance coverage. Open a policy for its version history and editor.",
          })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg bg-m3-surface-container-low p-3"
          >
            <Icon className="h-4 w-4 text-m3-primary" aria-hidden="true" />
            <p className="mt-2 text-lg font-bold tabular-nums text-text-strong">
              {value}
            </p>
            <p className="text-[11px] leading-snug text-text-muted">{label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-m3-outline-variant/20 pt-3 text-xs text-text-muted">
        <p className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 shrink-0" />
          {t("admin.policies.inventory.public_hint", {
            defaultValue: "Public policies apply to every eligible reader.",
          })}
        </p>
        <p className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {t("admin.policies.inventory.restricted_hint", {
            defaultValue: "Restricted policies are limited by audience roles.",
          })}
        </p>
      </div>
    </aside>
  );
}

export default function AdminPoliciesPage() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const [showCreate, setShowCreate] = useState(false);
  const { data, isPending, isError } = useAdminPolicies();
  const publisherIds =
    data?.flatMap((policy) =>
      policy.versions.flatMap((version) =>
        version.published_by ? [version.published_by] : [],
      ),
    ) ?? [];
  const { data: publishers, isPending: publishersLoading } =
    useUsersByIds(publisherIds);

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
        <Button
          type="button"
          onClick={() => setShowCreate(true)}
          className="gap-2"
        >
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
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <div className="space-y-3">
            {data.map((p) => (
              <PolicyRow
                key={p.id}
                policy={p}
                publishers={publishers}
                publishersLoading={publishersLoading}
              />
            ))}
          </div>
          <PolicyInventoryPanel policies={data} />
        </div>
      )}

      {showCreate && (
        <CreatePolicyDialog onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
