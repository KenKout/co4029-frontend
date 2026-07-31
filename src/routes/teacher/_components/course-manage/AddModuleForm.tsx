import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateModule } from "@/lib/api/hooks/teacher-courses";

/** Inline form for appending a new module to the course curriculum. */
export function AddModuleForm({
  courseId,
  nextPosition,
  onDone,
}: {
  courseId: string;
  nextPosition: number;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const createModule = useCreateModule(courseId);
  const [title, setTitle] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createModule.mutateAsync({ title, position: nextPosition });
      toast.success(t("teacher_common.module_created"));
      onDone();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_common.create_module_failed"),
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 p-4 bg-m3-surface-container rounded-xl"
    >
      <Input
        autoFocus
        required
        placeholder={t("teacher_common.module_title_placeholder")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-9 flex-1"
      />
      <Button type="submit" size="sm" disabled={createModule.isPending}>
        {createModule.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          t("common.create")
        )}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDone}>
        {t("common.cancel")}
      </Button>
    </form>
  );
}
