export function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-text-muted uppercase tracking-wide">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "text-sm text-text-strong mt-1 font-mono break-all"
            : "text-sm text-text-strong mt-1"
        }
      >
        {value}
      </dd>
    </div>
  );
}
