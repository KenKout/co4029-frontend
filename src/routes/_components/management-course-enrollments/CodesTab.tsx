import { useTranslation } from "react-i18next";
import { CodesList } from "./CodesList";
import { CreateCodeForm } from "./CreateCodeForm";
import { EditCodeModal } from "./EditCodeModal";
import { useCodesTab } from "./use-codes-tab";

/** Invitation-codes tab: mint self-service join codes and manage existing ones. */
export function CodesTab({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const controller = useCodesTab(courseId, t);
  const { list, editing, setEditing } = controller;

  return (
    <div className="space-y-6">
      <CreateCodeForm controller={controller} />

      <CodesList
        courseId={courseId}
        codes={list.data ?? []}
        isLoading={list.isLoading}
        isError={list.isError}
        onEdit={setEditing}
      />

      {editing && (
        <EditCodeModal
          courseId={courseId}
          item={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
