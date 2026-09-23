import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  EntityMultiSelectDialog,
  type SelectableEntity,
} from "@/components/ui/entity-multi-select-dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/use-confirm";
import {
  useCreateLearningProgram,
  useLearningProgramOptions,
} from "@/lib/api/hooks/learning-programs";
import { parseCareerPathLimit } from "./_components/career-path-limit";
import {
  resolveProgramDraftFields,
  readInputValue,
  slugify,
} from "./_components/learning-program-new-helpers";
import { getApiErrorMessage } from "@/lib/api/error-codes";

// The creation workflow intentionally keeps its interdependent draft fields,
// validation, confirmation, and picker state together.
// eslint-disable-next-line max-lines-per-function
export default function ManagementLearningProgramNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const options = useLearningProgramOptions();
  const create = useCreateLearningProgram();
  const { confirm, dialog } = useConfirm();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const slugInputRef = useRef<HTMLInputElement>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [maxPathSwitches, setMaxPathSwitches] = useState("3");
  const [maxCareerPaths, setMaxCareerPaths] = useState("");
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>([]);
  const [defaultPathId, setDefaultPathId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!facultyId && options.data?.default_faculty_id)
      setFacultyId(options.data.default_faculty_id);
  }, [facultyId, options.data?.default_faculty_id]);

  const candidates: SelectableEntity[] = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (options.data?.career_paths ?? [])
      .filter(
        (path) =>
          !needle ||
          path.name.toLowerCase().includes(needle) ||
          path.slug?.toLowerCase().includes(needle),
      )
      .map((path) => ({
        id: path.id,
        primaryLabel: path.name,
        secondaryLabel: path.slug,
        selectable: path.selectable,
        notSelectableReason: path.not_selectable_reason,
      }));
  }, [options.data?.career_paths, query]);
  const selectedPaths = (options.data?.career_paths ?? []).filter((path) =>
    selectedPathIds.includes(path.id),
  );
  const maxCareerPathsCeiling =
    options.data?.max_career_paths_per_program ?? 10;

  if (options.isLoading) return <PageSkeleton rows={4} />;

  async function submit() {
    const fields = resolveProgramDraftFields({
      name: readInputValue(nameInputRef.current, name),
      slug: readInputValue(slugInputRef.current, slug),
      facultyId,
      defaultFacultyId: options.data?.default_faculty_id,
      faculties: options.data?.faculties,
    });
    if (!fields.name || !fields.slug || !fields.facultyId) {
      toast.error(t("management_learning_program_new.errors.required_fields"));
      return;
    }
    // Validate here rather than relying on the 422: the backend bound is
    // 0..100, and an empty or non-numeric box must not silently become 0
    // (a program nobody can ever switch out of).
    const switches = Number.parseInt(maxPathSwitches, 10);
    if (!Number.isInteger(switches) || switches < 0 || switches > 100) {
      toast.error(t("management_learning_program_new.errors.switches_invalid"));
      return;
    }
    const careerPathLimit = parseCareerPathLimit(
      maxCareerPaths,
      maxCareerPathsCeiling,
    );
    if (!careerPathLimit.ok) {
      toast.error(
        t("management_learning_program_new.errors.path_limit_invalid", {
          ceiling: maxCareerPathsCeiling,
        }),
      );
      return;
    }
    const accepted = await confirm({
      title: t("management_learning_program_new.confirm.title"),
      description: t(
        switches === 0
          ? "management_learning_program_new.confirm.no_switches"
          : switches === 1
            ? "management_learning_program_new.confirm.one_switch"
            : "management_learning_program_new.confirm.many_switches",
        { count: switches },
      ),
      confirmLabel: t("management_learning_program_new.actions.create_draft"),
      cancelLabel: t("management_learning_program_new.actions.cancel"),
      confirmVariant: "default",
    });
    if (!accepted) return;
    try {
      const program = await create.mutateAsync({
        faculty_id: fields.facultyId,
        name: fields.name,
        slug: fields.slug,
        description: description.trim() || null,
        max_path_switches: switches,
        max_career_paths_per_enrollment: careerPathLimit.value,
        career_path_ids: selectedPathIds,
        default_career_path_id: defaultPathId,
      });
      toast.success(t("management_learning_program_new.toast.created"));
      void navigate({
        to: "/management/learning-programs/$id",
        params: { id: program.id },
        replace: true,
      });
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("management_learning_program_new.errors.create_failed"),
        ),
      );
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {dialog}
      <PageHeader
        title={t("management_learning_program_new.title")}
        subtitle={t("management_learning_program_new.subtitle")}
        action={
          <Button onClick={() => void submit()} disabled={create.isPending}>
            {t("management_learning_program_new.actions.create_draft")}
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-10">
        <main className="space-y-5 rounded-xl border border-m3-outline-variant/40 bg-card p-5 lg:col-span-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("management_learning_program_new.fields.name")}{" "}
              <span className="text-red-600">*</span>
              <Input
                ref={nameInputRef}
                id="learning-program-name"
                autoComplete="off"
                autoFocus
                value={name}
                onChange={(event) => {
                  const value = event.target.value;
                  setName(value);
                  if (!slugTouched) setSlug(slugify(value));
                }}
              />
            </label>
            <label className="space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("management_learning_program_new.fields.slug")}{" "}
              <span className="text-red-600">*</span>
              <Input
                ref={slugInputRef}
                id="learning-program-slug"
                autoComplete="off"
                mono
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(slugify(event.target.value));
                }}
              />
            </label>
          </div>
          <label className="block space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_learning_program_new.fields.faculty")}{" "}
            <span className="text-red-600">*</span>
            <Select
              value={facultyId}
              onValueChange={setFacultyId}
              placeholder={t(
                "management_learning_program_new.fields.select_faculty",
              )}
              options={(options.data?.faculties ?? []).map((faculty) => ({
                value: faculty.id,
                label: faculty.name,
              }))}
            />
          </label>
          <label className="block space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_learning_program_new.fields.switches")}
            <Input
              type="number"
              min={0}
              max={100}
              value={maxPathSwitches}
              onChange={(event) => setMaxPathSwitches(event.target.value)}
            />
            <span className="block text-[11px] font-normal normal-case tracking-normal text-m3-on-surface-variant">
              {t("management_learning_program_new.fields.switches_hint")}
            </span>
          </label>
          <label className="block space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_learning_program_new.fields.path_limit")}
            <Input
              type="number"
              min={1}
              max={maxCareerPathsCeiling}
              value={maxCareerPaths}
              onChange={(event) => setMaxCareerPaths(event.target.value)}
            />
            <span className="block text-[11px] font-normal normal-case tracking-normal text-m3-on-surface-variant">
              {t("management_learning_program_new.fields.path_limit_hint", {
                ceiling: maxCareerPathsCeiling,
              })}
            </span>
          </label>
          <label className="block space-y-1.5 text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("management_learning_program_new.fields.description")}
            <Textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <section className="space-y-3 border-t border-m3-outline-variant/30 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-headline font-bold">
                  {t("management_learning_program_new.paths.title")}
                </h2>
                <p className="text-xs text-m3-on-surface-variant">
                  {t("management_learning_program_new.paths.description")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => setPickerOpen(true)}
              >
                <Plus className="h-4 w-4" />{" "}
                {t("management_learning_program_new.paths.add")}
              </Button>
            </div>
            <div className="space-y-2">
              {selectedPaths.map((path) => {
                const isDefault = path.id === defaultPathId;
                return (
                  <div
                    key={path.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-m3-surface-container p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {path.name}
                        </p>
                        {isDefault && (
                          <Badge>
                            <Star className="h-3 w-3" />{" "}
                            {t("management_learning_program_new.paths.default")}
                          </Badge>
                        )}
                      </div>
                      <p className="font-mono text-xs text-m3-on-surface-variant">
                        {path.slug}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!isDefault && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultPathId(path.id)}
                        >
                          {t(
                            "management_learning_program_new.paths.set_default",
                          )}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t(
                          "management_learning_program_new.paths.remove_aria",
                          { name: path.name },
                        )}
                        onClick={() => {
                          const remaining = selectedPathIds.filter(
                            (id) => id !== path.id,
                          );
                          setSelectedPathIds(remaining);
                          if (isDefault) setDefaultPathId(remaining[0] ?? null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
        <aside className="rounded-xl border border-dashed border-m3-outline-variant p-5 text-sm text-m3-on-surface-variant lg:col-span-3">
          {t("management_learning_program_new.version_history_hint")}
        </aside>
      </div>
      {pickerOpen && (
        <EntityMultiSelectDialog
          title={t("management_learning_program_new.picker.title")}
          searchPlaceholder={t("management_learning_program_new.picker.search")}
          items={candidates}
          alreadySelectedIds={new Set(selectedPathIds)}
          isLoading={false}
          query={query}
          onQueryChange={setQuery}
          onConfirm={(rows) => {
            const addedIds = rows.map((row) => row.id);
            setSelectedPathIds((ids) => [...new Set([...ids, ...addedIds])]);
            setDefaultPathId((current) => current ?? addedIds[0] ?? null);
            setPickerOpen(false);
            setQuery("");
          }}
          onClose={() => {
            setPickerOpen(false);
            setQuery("");
          }}
          emptyText={t("management_learning_program_new.picker.empty")}
          alreadyAddedLabel={t("management_learning_program_new.picker.added")}
        />
      )}
    </div>
  );
}
