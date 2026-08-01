import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAssignTeacher } from "@/lib/api/hooks/dept";
import { ApiError } from "@/lib/api/client";

const UUID_RX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AssignTeacherForm({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const [userId, setUserId] = useState("");
  const assign = useAssignTeacher(courseId);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = userId.trim();
    if (!UUID_RX.test(trimmed)) {
      toast.error(t("dept_course_detail.errors.invalid_uuid"));
      return;
    }
    assign.mutate(
      { user_id: trimmed },
      {
        onSuccess: () => {
          toast.success(t("dept_course_detail.success.assigned"));
          setUserId("");
        },
        onError: (err) => {
          const detail =
            err instanceof ApiError ? err.body || err.message : String(err);
          toast.error(t("dept_course_detail.errors.assign_failed", { detail }));
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-elev border border-border rounded-lg p-4 mb-4"
    >
      <label className="block text-xs font-semibold text-text-muted mb-2">
        {t("dept_course_detail.assign_label")}
      </label>
      <div className="flex gap-2">
        <Input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          disabled={assign.isPending}
          className="font-mono text-xs"
        />
        <Button type="submit" disabled={assign.isPending || !userId.trim()}>
          <UserPlus className="h-3.5 w-3.5" />
          {t("dept_course_detail.assign_button")}
        </Button>
      </div>
      <p className="text-[11px] text-text-muted mt-2">
        {t("dept_course_detail.assign_help")}
      </p>
    </form>
  );
}
