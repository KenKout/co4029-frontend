/**
 * Labelled percentage bar used by the upload form, extracted verbatim from the
 * former 1422-line material-hub.tsx.
 */
export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-m3-on-surface-variant">
        <span>{label}</span>
        <span className="tabular-nums font-semibold text-m3-on-surface">
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-m3-outline-variant/30 overflow-hidden">
        <div
          className="h-full bg-m3-secondary transition-all duration-200"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
