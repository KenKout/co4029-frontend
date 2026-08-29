/**
 * Section heading for one dashboard row.
 *
 * Takes an `id` so each section can be the target of `aria-labelledby` — the
 * rows are `<section>` landmarks, and a landmark without an accessible name is
 * one more unlabelled region for a screen-reader user to guess at (WCAG 2.2 AA,
 * PRD section 6).
 */
export function RowHeading({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-xs font-bold uppercase tracking-widest text-text-muted"
    >
      {children}
    </h2>
  );
}
