/**
 * Arrow-head markers for the two edge kinds — amber for PREREQUISITE_OF, slate
 * for RELATED_TO. Ids are prefixed `kgd-` so they never collide with the
 * editor's own markers. Extracted verbatim from the former 863-line
 * knowledge-graph-detail.tsx.
 */
export function KgArrowDefs() {
  return (
    <defs>
      <marker
        id="kgd-arrow-prereq"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto-start-reverse"
      >
        <path d="M0,1 L9,5 L0,9 z" fill="#d97706" />
      </marker>
      <marker
        id="kgd-arrow-related"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="4.5"
        markerHeight="4.5"
        orient="auto-start-reverse"
      >
        <path d="M0,1 L9,5 L0,9 z" fill="#94a3b8" />
      </marker>
    </defs>
  );
}
