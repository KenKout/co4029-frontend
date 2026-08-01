/**
 * The red load-failure card shared verbatim by the roster tab and the
 * invitation-code list; only the copy differs, so it comes in as a prop.
 */
export function LoadErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}
