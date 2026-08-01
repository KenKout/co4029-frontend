export function ContextRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-bold tracking-widest text-m3-on-surface-variant/70">
        {label}
      </p>
      <p className="text-sm font-semibold text-m3-on-surface truncate">
        {value}
      </p>
    </div>
  );
}
