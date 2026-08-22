import type { Mail } from "lucide-react";

interface InfoRowProps {
  icon: typeof Mail;
  label: string;
  value: string;
}

export default function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed text-m3-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </p>
        <p className="mt-0.5 break-words text-sm font-medium text-text-strong">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}
