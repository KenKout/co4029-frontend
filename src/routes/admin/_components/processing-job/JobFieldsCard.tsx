import { Field } from "./Field";
import type {
  ProcessingJobController,
  ProcessingJobData,
} from "./use-admin-processing-job";

export function JobFieldsCard({
  c,
  data,
}: {
  c: ProcessingJobController;
  data: ProcessingJobData;
}) {
  const { t, formatDate } = c;
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-5">
      <h2 className="text-sm font-headline font-bold text-text-strong mb-4">
        {t("admin.processing_job.title")}
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <Field
          label={t("admin.processing_job.fields.entity_type")}
          value={data.entity_type}
        />
        <Field
          label={t("admin.processing_job.fields.entity_id")}
          value={data.entity_id}
          mono
        />
        <Field
          label={t("admin.processing_job.stats.progress")}
          value={`${data.progress_percent}%`}
        />
        <Field
          label={t("admin.processing_job.stats.retries")}
          value={data.retry_count}
        />
        <Field
          label={t("admin.processing_job.fields.started_at")}
          value={formatDate(data.started_at)}
        />
        <Field
          label={t("admin.processing_job.fields.completed_at")}
          value={formatDate(data.finished_at)}
        />
        <Field
          label={t("admin.processing_job.fields.created_at")}
          value={formatDate(data.created_at)}
        />
        <Field
          label={t("admin.course_detail.cols.updated")}
          value={formatDate(data.updated_at)}
        />
      </dl>
    </div>
  );
}
