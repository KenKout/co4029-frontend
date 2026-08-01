/** Section heading with an explicit time window, so no number is ambiguous. */
export function RowHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted">
      {children}
    </h2>
  );
}
