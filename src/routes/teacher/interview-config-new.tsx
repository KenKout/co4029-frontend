import { useState } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateInterviewConfig } from "@/lib/api/hooks/interviews";
import { useTeacherCourseContent } from "@/lib/api/hooks/teacher-courses";
import type { InterviewConfigCreate } from "@/lib/api/types";

type SupportedMode = NonNullable<InterviewConfigCreate["supported_modes"]>;
type Persona = NonNullable<InterviewConfigCreate["persona"]>;

export default function InterviewConfigNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const { moduleId: preselectedModuleId } = useSearch({ strict: false }) as {
    moduleId?: string;
  };

  const { data: content, isLoading: contentLoading } =
    useTeacherCourseContent(courseId);
  const createConfig = useCreateInterviewConfig(courseId);

  const modules = content?.modules ?? [];

  const [form, setForm] = useState({
    title: "",
    module_id: preselectedModuleId ?? "",
    persona: "neutral" as Persona,
    supported_modes: "hybrid" as SupportedMode,
    time_limit_minutes: "",
    max_attempts: "",
    lock_quiz_ef_until_pass: false,
    supplementary_instructions: "",
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error(t("teacher_interview_config_new.errors.title_required"));
      return;
    }
    if (!form.module_id) {
      toast.error(t("teacher_interview_config_new.errors.module_required"));
      return;
    }

    try {
      const config = await createConfig.mutateAsync({
        course_id: courseId,
        module_id: form.module_id,
        title: form.title.trim(),
        persona: form.persona,
        supported_modes: form.supported_modes,
        time_limit_minutes: form.time_limit_minutes
          ? Number(form.time_limit_minutes)
          : null,
        max_attempts: form.max_attempts ? Number(form.max_attempts) : null,
        lock_quiz_ef_until_pass: form.lock_quiz_ef_until_pass,
        supplementary_instructions:
          form.supplementary_instructions.trim() || null,
      });
      toast.success(t("teacher_interview_config_new.success.created"));
      void navigate({
        to: "/teacher/courses/$courseId/interview-configs/$configId",
        params: { courseId, configId: config.id },
      });
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_interview_config_new.errors.create_failed"),
      );
    }
  }

  return (
    <div className="max-w-2xl space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link to="/teacher/courses/$courseId" params={{ courseId }}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-headline font-bold text-m3-on-surface">
            {t("teacher_interview_config_new.title")}
          </h1>
          <p className="text-xs text-m3-on-surface-variant mt-0.5">
            {t("teacher_interview_config_new.subtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-m3-on-surface">
            {t("teacher_interview_config_new.fields.title")} *
          </label>
          <Input
            required
            placeholder={t("teacher_interview_config_new.fields.title_placeholder")}
            value={form.title}
            onChange={(e) =>
              setForm((f) => ({ ...f, title: e.target.value }))
            }
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-m3-on-surface">
            {t("teacher_interview_config_new.fields.module")} *
          </label>
          <select
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            value={form.module_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, module_id: e.target.value }))
            }
            disabled={contentLoading || modules.length === 0}
          >
            <option value="">{t("teacher_interview_config_new.fields.module_placeholder")}</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
          {modules.length === 0 && !contentLoading && (
            <p className="text-[11px] text-amber-700">
              {t("teacher_interview_config_new.fields.no_modules")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-m3-on-surface">
              {t("teacher_interview_config_new.fields.persona")}
            </label>
            <select
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.persona}
              onChange={(e) =>
                setForm((f) => ({ ...f, persona: e.target.value as Persona }))
              }
            >
              <option value="neutral">{t("teacher_interview_config_new.fields.persona_neutral")}</option>
              <option value="strict">{t("teacher_interview_config_new.fields.persona_strict")}</option>
              <option value="supportive">{t("teacher_interview_config_new.fields.persona_supportive")}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-m3-on-surface">
              {t("teacher_interview_config_new.fields.modes")}
            </label>
            <select
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.supported_modes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  supported_modes: e.target.value as SupportedMode,
                }))
              }
            >
              <option value="hybrid">{t("teacher_interview_config_new.fields.mode_hybrid")}</option>
              <option value="text">{t("teacher_interview_config_new.fields.mode_text")}</option>
              <option value="voice">{t("teacher_interview_config_new.fields.mode_voice")}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-m3-on-surface">
              {t("teacher_interview_config_new.fields.duration")}
            </label>
            <Input
              type="number"
              min="1"
              placeholder={t("teacher_interview_config_new.fields.duration_placeholder")}
              value={form.time_limit_minutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  time_limit_minutes: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-m3-on-surface">
              {t("teacher_interview_config_new.fields.max_attempts")}
            </label>
            <Input
              type="number"
              min="1"
              placeholder={t("teacher_interview_config_new.fields.max_attempts_placeholder")}
              value={form.max_attempts}
              onChange={(e) =>
                setForm((f) => ({ ...f, max_attempts: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-m3-on-surface">
            {t("teacher_interview_config_new.fields.supplementary")}
          </label>
          <textarea
            className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={t("teacher_interview_config_new.fields.supplementary_placeholder")}
            value={form.supplementary_instructions}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                supplementary_instructions: e.target.value,
              }))
            }
          />
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={form.lock_quiz_ef_until_pass}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                lock_quiz_ef_until_pass: e.target.checked,
              }))
            }
          />
          <span className="text-sm">
            <span className="block font-medium text-m3-on-surface">
              {t("teacher_interview_config_new.fields.lock_quiz_ef")}
            </span>
            <span className="block text-xs text-m3-on-surface-variant mt-0.5">
              {t("teacher_interview_config_new.fields.lock_quiz_ef_help")}
            </span>
          </span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={
              createConfig.isPending || !form.title.trim() || !form.module_id
            }
          >
            {createConfig.isPending
              ? t("teacher_interview_config_new.submitting")
              : t("teacher_interview_config_new.submit")}
          </Button>
          <Link to="/teacher/courses/$courseId" params={{ courseId }}>
            <Button type="button" variant="outline">
              {t("common.cancel")}
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
