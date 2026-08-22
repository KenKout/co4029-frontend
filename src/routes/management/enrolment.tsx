import { Navigate } from "@tanstack/react-router";

/**
 * The old enrolment hub (/management/enrolment) was merged into the single
 * course worklist at /dept — the two pages were the same list with
 * different row links, so the table now carries both actions (Enrol ·
 * Teachers). This route stays registered so old links/bookmarks keep
 * working, but just forwards to the merged page.
 */
export default function ManagementEnrolmentPage() {
  return <Navigate to="/dept" replace />;
}
