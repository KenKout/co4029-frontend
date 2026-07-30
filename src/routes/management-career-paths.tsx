import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import {
  useCreateCareerPath,
  useListManagedCareerPaths,
} from "@/lib/api/hooks/career-paths";
import type { CareerPathAuthoring } from "@/lib/api/types";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls = STATUS_COLOR[status] ?? "bg-slate-100 text-slate-700";
  const label = t(`management_career_paths.status.${status}`, {
    defaultValue: status,
  });
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${cls}`}
    >
      {label}
    </span>
  );
}

function PathRow({ path }: { path: CareerPathAuthoring }) {
  return (
    <Link
      to="/management/career-paths/$id"
      params={{ id: path.id }}
      className="block group"
    >
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card ghost-border hover:shadow-editorial transition-all duration-200 cursor-pointer">
        <div className="w-10 h-10 rounded-lg bg-m3-primary-fixed flex items-center justify-center shrink-0">
          <GraduationCap className="h-5 w-5 text-m3-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-m3-on-surface truncate">
            {path.name}
          </p>
          <p className="text-[11px] text-m3-on-surface-variant truncate font-mono mt-0.5">
            {path.slug}
          </p>
        </div>
        <StatusBadge status={path.status} />
        <ArrowRight className="h-4 w-4 text-m3-on-surface-variant shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateCareerPath();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  function slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error(
        t("management_career_paths.create_dialog.errors.need_name_slug"),
      );
      return;
    }
    create.mutate(
      {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: (path) => {
          toast.success(
            t("management_career_paths.create_dialog.success.created"),
          );
          void navigate({
            to: "/management/career-paths/$id",
            params: { id: path.id },
          });
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_career_paths.create_dialog.errors.create_failed"),
          ),
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-popover rounded-xl shadow-lg p-6 space-y-5"
      >
        <div>
          <h2 className="text-lg font-headline font-bold text-m3-on-surface">
            {t("management_career_paths.create_dialog.title")}
          </h2>
          <p className="text-xs text-m3-on-surface-variant mt-1">
            <Trans
              i18nKey="management_career_paths.create_dialog.intro_pre"
              t={t}
            />{" "}
            <strong>
              {t("management_career_paths.create_dialog.intro_status")}
            </strong>
            {t("management_career_paths.create_dialog.intro_post")}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_career_paths.create_dialog.name")}{" "}
            <span className="text-red-600">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={t(
              "management_career_paths.create_dialog.name_placeholder",
            )}
            required
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_career_paths.create_dialog.slug")}{" "}
            <span className="text-red-600">*</span>
          </label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={t(
              "management_career_paths.create_dialog.slug_placeholder",
            )}
            className="font-mono"
            required
          />
          <p className="text-[11px] text-m3-on-surface-variant">
            {t("management_career_paths.create_dialog.slug_help")}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_career_paths.create_dialog.description")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={t(
              "management_career_paths.create_dialog.description_placeholder",
            )}
            className="w-full px-3 py-2 text-sm bg-m3-surface-container-low border border-m3-outline-variant/30 rounded-xl text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/30 placeholder:text-m3-on-surface-variant/40"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={create.isPending}
          >
            {t("management_career_paths.create_dialog.cancel")}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={create.isPending}
            className="gap-2"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("management_career_paths.create_dialog.submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ManagementCareerPathsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const permissions = useMyPermissions();

  const perms = permissions.data?.permissions ?? [];
  // Career-path authoring is gated on course lifecycle codes on the backend
  // (see career_paths/routers/authoring.py _PATH_MANAGE_CODES), which the
  // manager role holds. There is no `career_path.manage` code in the catalog —
  // checking it here locked everyone but admins out of a surface the backend
  // already allows managers to use.
  const canManage =
    perms.includes("course.create") ||
    perms.includes("course.update") ||
    perms.includes("system.administer");

  useEffect(() => {
    if (permissions.isLoading) return;
    if (!canManage) {
      toast.error(t("management_career_paths.no_permission"));
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [permissions.isLoading, canManage, navigate, t]);

  const [includeArchived, setIncludeArchived] = useState(false);
  const [creating, setCreating] = useState(false);

  const enabled = !permissions.isLoading && canManage;
  const list = useListManagedCareerPaths({
    includeArchived,
    enabled,
  });

  if (permissions.isLoading || !enabled) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-m3-surface-container animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  const paths = list.data ?? [];

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      <PageHeader
        title={t("management_career_paths.title")}
        subtitle={t("management_career_paths.subtitle")}
        backTo="/dashboard"
        action={
          <Button
            size="sm"
            onClick={() => setCreating(true)}
            className="gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t("management_career_paths.create_button")}
          </Button>
        }
      />

      <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
          className="h-4 w-4 rounded border-m3-outline-variant accent-m3-primary cursor-pointer"
        />
        <span className="text-m3-on-surface font-medium">
          {t("management_career_paths.include_archived")}
        </span>
      </label>

      {list.isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-m3-surface-container animate-pulse rounded-xl"
            />
          ))}
        </div>
      )}

      {list.isError && (
        <div className="rounded-xl bg-m3-error-container border border-m3-error/20 p-6 text-center">
          <p className="text-m3-on-error-container text-sm font-semibold">
            {t("management_career_paths.list_load_failed")}
          </p>
        </div>
      )}

      {!list.isLoading && !list.isError && paths.length === 0 && (
        <div className="rounded-xl bg-m3-surface-container-lowest ghost-border p-10 text-center">
          <GraduationCap className="h-8 w-8 mx-auto mb-3 text-m3-outline" />
          <p className="text-sm font-medium text-m3-on-surface">
            {t("management_career_paths.empty_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant mt-1">
            <Trans
              i18nKey="management_career_paths.empty_body"
              t={t}
              components={{ strong: <strong /> }}
            />
          </p>
        </div>
      )}

      {!list.isLoading && !list.isError && paths.length > 0 && (
        <div className="space-y-2">
          {paths.map((p) => (
            <PathRow key={p.id} path={p} />
          ))}
        </div>
      )}

      {creating && <CreateDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
