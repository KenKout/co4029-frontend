import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/use-confirm";
import { useTeacherCourseRoster } from "@/lib/api/hooks/teacher-courses";
import { useCreateOverride, useDeleteOverride, useQuizOverrides, type QuizOverrideIn } from "@/lib/api/hooks/quizzes";
import { Field } from "./form-primitives";
import type { SettingsDraft } from "./types";

/** Separate, immediately persisted exceptions. Base values are SAVED settings. */
function useOverrideEditor({ quizId, courseId, base, locked = false, onDirtyChange }: {
  quizId: string; courseId: string; base: SettingsDraft; locked?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const k = "teacher_quiz_manage.settings.assist";
  const roster = useTeacherCourseRoster(courseId);
  const query = useQuizOverrides(quizId);
  const create = useCreateOverride(quizId);
  const del = useDeleteOverride(quizId);
  const { confirm, dialog } = useConfirm();
  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");
  const [retakes, setRetakes] = useState("inherit");
  const busy = create.isPending || del.isPending;
  const dirty = Boolean(userId || maxAttempts || timeLimitMinutes || retakes !== "inherit");
  useEffect(() => { onDirtyChange?.(dirty || busy); }, [dirty, busy, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const students = roster.data?.students ?? [];
  const overrides = query.data ?? [];
  const selected = students.find((s) => s.student_id === userId);
  const name = (id?: string | null) => {
    const student = students.find((s) => s.student_id === id);
    return student ? `${student.display_name} · ${student.primary_email}` : t(`${k}.student_unavailable`);
  };
  const options = students.filter((s) =>
    ["active", "completed"].includes(s.enrollment_status) && !overrides.some((o) => o.user_id === s.student_id),
  ).filter((s) => s.student_id === userId || `${s.display_name} ${s.primary_email}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .map((s) => ({ value: s.student_id, label: `${s.display_name} · ${s.primary_email}` }));
  const attempts = (allow: boolean, limit: string) => !allow ? "1" : limit || t(`${k}.unlimited`);
  const minutes = (value: string) => value ? t(`${k}.minutes`, { count: Number(value) }) : t(`${k}.unlimited`);
  const effectiveRetakes = retakes === "inherit" ? base.allow_retakes : retakes === "allow";
  const effectiveSummary = t(`${k}.override_effective`, {
    baseAttempts: attempts(base.allow_retakes, base.max_attempts),
    attempts: attempts(effectiveRetakes, maxAttempts || base.max_attempts),
    baseTime: minutes(base.time_limit_minutes), time: minutes(timeLimitMinutes || base.time_limit_minutes),
  });
  function reset() { setUserId(""); setMaxAttempts(""); setTimeLimitMinutes(""); setRetakes("inherit"); setSearch(""); }
  async function handleAdd() {
    if (locked || busy || !selected || !options.some((o) => o.value === userId)) return;
    const validInteger = (value: string) => !value || (Number.isInteger(Number(value)) && Number(value) >= 1);
    if (!validInteger(maxAttempts) || !validInteger(timeLimitMinutes) || (!maxAttempts && !timeLimitMinutes && retakes === "inherit")) return;
    const body: QuizOverrideIn = { scope: "user", user_id: userId,
      max_attempts: maxAttempts ? Number(maxAttempts) : null,
      time_limit_seconds: timeLimitMinutes ? Number(timeLimitMinutes) * 60 : null,
      allow_retakes: retakes === "inherit" ? null : retakes === "allow",
    };
    if (!(await confirm({ title: t("teacher_quiz_manage.overrides.add_action"), description: `${name(userId)}. ${effectiveSummary}`, confirmLabel: t("teacher_quiz_manage.overrides.add_action"), cancelLabel: t("common.cancel"), confirmVariant: "default" }))) return;
    try {
      await create.mutateAsync(body); reset();
      toast.success(t("teacher_quiz_manage.overrides.added"));
    } catch { toast.error(t("teacher_quiz_manage.overrides.add_failed")); }
  }
  async function handleDelete(id: string, user?: string | null) {
    if (locked || busy) return;
    if (!(await confirm({ title: t("teacher_quiz_manage.overrides.delete_action"), description: t(`${k}.delete_override_confirm`, { student: name(user) }), confirmLabel: t("common.delete"), cancelLabel: t("common.cancel") }))) return;
    try { await del.mutateAsync(id); toast.success(t("teacher_quiz_manage.overrides.deleted")); }
    catch { toast.error(t("teacher_quiz_manage.overrides.delete_failed")); }
  }
  return {
    t, k, query, roster, locked, busy, dirty, dialog, confirm, reset, handleAdd, handleDelete,
    userId, setUserId, search, setSearch, maxAttempts, setMaxAttempts,
    timeLimitMinutes, setTimeLimitMinutes, retakes, setRetakes, selected, options,
    effectiveSummary, effectiveRetakes, overrides, base, name, attempts, minutes,
  };
}

type OverrideEditor = ReturnType<typeof useOverrideEditor>;

export function OverridesPanel(props: Parameters<typeof useOverrideEditor>[0]) {
  const model = useOverrideEditor(props);
  const { t, k, query, roster, dialog } = model;
  if (query.isLoading || roster.isLoading) return <Skeleton className="h-32 w-full" />;
  if (query.isError || roster.isError) return <div role="alert" className="space-y-2"><p>{t(`${k}.load_failed`)}</p><Button type="button" variant="outline" onClick={() => { void query.refetch(); void roster.refetch(); }}>{t(`${k}.retry`)}</Button></div>;

  return <div className="space-y-4">
    <OverrideForm model={model} />
    <OverrideList model={model} />
    {dialog}
  </div>;
}

function OverrideForm({ model }: { model: OverrideEditor }) {
  const { t, k, handleAdd, locked, busy, search, setSearch, userId, setUserId, options,
    maxAttempts, setMaxAttempts, timeLimitMinutes, setTimeLimitMinutes,
    retakes, setRetakes, effectiveSummary, effectiveRetakes, selected, dirty, confirm, reset } = model;
  return (<form onSubmit={(event) => { event.preventDefault(); void handleAdd(); }}>
      <fieldset disabled={locked || busy} className="border-0 p-0 min-w-0 space-y-4">
        <Field label={t(`${k}.student`)} hint={t(`${k}.course_students_only`)}>
          <Input aria-label={t(`${k}.search_students`)} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t(`${k}.search_students`)} />
          <Select aria-label={t(`${k}.student`)} value={userId} onValueChange={setUserId} options={options} placeholder={t(`${k}.choose_student`)} disabled={locked || busy} />
          {options.length === 0 && <p className="text-xs text-m3-on-surface-variant">{t(`${k}.no_students`)}</p>}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("teacher_quiz_manage.overrides.max_attempts_label")}>
            <Input type="number" min={1} step={1} aria-label={t("teacher_quiz_manage.overrides.max_attempts_label")} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder={t(`${k}.inherit`)} />
          </Field>
          <Field label={t("teacher_quiz_manage.overrides.time_limit_label")}>
            <Input type="number" min={1} step={1} aria-label={t("teacher_quiz_manage.overrides.time_limit_label")} value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(e.target.value)} placeholder={t(`${k}.inherit`)} endAdornment={t(`${k}.minute_unit`)} />
          </Field>
        </div>
        <Field label={t("teacher_quiz_manage.settings.attempts.allow_label")}>
          <Select aria-label={t("teacher_quiz_manage.settings.attempts.allow_label")} value={retakes} onValueChange={setRetakes} disabled={locked || busy}
            options={[{ value: "inherit", label: t(`${k}.inherit`) }, { value: "allow", label: t(`${k}.allow_retakes`) }, { value: "block", label: t(`${k}.block_retakes`) }]} />
        </Field>
        <p className="text-xs text-m3-on-surface-variant">{t(`${k}.override_inherit`)}</p>
        <p role="status" className="text-sm">{effectiveSummary}</p>
        {maxAttempts && Number(maxAttempts) > 1 && !effectiveRetakes && <p role="status" className="text-sm text-m3-error">{t(`${k}.retakes_disabled`)}</p>}
        <div className="flex gap-2">
          <Button type="submit" variant="outline" disabled={!selected || !options.some((o) => o.value === userId) || (!maxAttempts && !timeLimitMinutes && retakes === "inherit")}>
            {t("teacher_quiz_manage.overrides.add_action")}
          </Button>
          {dirty && <Button type="button" variant="ghost" onClick={() => {
            void confirm({ title: t("common.unsaved.title"), description: t("common.unsaved.description"), confirmLabel: t("teacher_quiz_manage.settings.reset_button"), cancelLabel: t("common.cancel") }).then((ok) => { if (ok) reset(); });
          }}>{t("teacher_quiz_manage.settings.reset_button")}</Button>}
        </div>
      </fieldset>
    </form>);
}

function OverrideList({ model }: { model: OverrideEditor }) {
  const { t, k, overrides, base, name, attempts, minutes, locked, busy, handleDelete } = model;
  return (<>{overrides.length === 0 ? <p className="text-sm text-m3-on-surface-variant">{t("teacher_quiz_manage.overrides.empty")}</p> : <ul className="space-y-2">
      {overrides.map((o) => <li key={o.id} className="flex items-center gap-3 rounded-xl border border-m3-outline-variant/30 p-3 text-sm">
        <div className="min-w-0 flex-1 space-y-1"><p className="break-words font-semibold">{o.scope === "user" ? name(o.user_id) : t(`${k}.group_override`)}</p>
          <p className="text-xs text-m3-on-surface-variant">{t(`${k}.override_effective`, {
            baseAttempts: attempts(base.allow_retakes, base.max_attempts), attempts: attempts(o.allow_retakes ?? base.allow_retakes, o.max_attempts == null ? base.max_attempts : String(o.max_attempts)),
            baseTime: minutes(base.time_limit_minutes), time: minutes(o.time_limit_seconds == null ? base.time_limit_minutes : String(o.time_limit_seconds / 60)),
          })}</p>
        </div>
        <Button type="button" variant="ghost" disabled={locked || busy} onClick={() => void handleDelete(o.id, o.user_id)} aria-label={t("teacher_quiz_manage.overrides.delete_action")}><Trash2 className="h-4 w-4 text-m3-error" /></Button>
      </li>)}
    </ul>}</>);
}
