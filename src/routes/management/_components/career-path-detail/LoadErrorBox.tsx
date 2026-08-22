/**
 * Error card shared by the page-level load failure and the progress tab's
 * roster failure. The page wraps it in its own centring container, exactly as
 * the two markup blocks did before the split.
 */
export function LoadErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-m3-error-container border border-m3-error/20 p-6 text-center">
      <p className="text-m3-on-error-container text-sm font-semibold">
        {message}
      </p>
    </div>
  );
}
