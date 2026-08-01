/**
 * Two arrow kinds. Solid amber head + dashed line = PREREQUISITE_OF (a hard
 * dependency); open slate head + solid line = RELATED_TO (a soft association).
 */
export function ArrowMarkers() {
  return (
    <defs>
      <marker
        id="kge-arrow-prereq"
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
        id="kge-arrow-related"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path
          d="M0,1 L9,5 L0,9"
          fill="none"
          stroke="#64748b"
          strokeWidth="1.6"
        />
      </marker>
      <marker
        id="kge-arrow-selected"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto-start-reverse"
      >
        <path d="M0,1 L9,5 L0,9 z" fill="#7c3aed" />
      </marker>
    </defs>
  );
}
