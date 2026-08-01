/** One keycap. Shared so both composers render identical keys. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-[10px] font-semibold leading-none text-text-muted">
      {children}
    </kbd>
  );
}
