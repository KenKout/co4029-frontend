/**
 * Arrowhead markers for the compact KG preview: prerequisite vs related, each
 * in a muted and a hover-contrast shade. Extracted verbatim from the former
 * 1422-line material-hub.tsx.
 */
export function KgPreviewArrowDefs() {
  return (
    <defs>
      <marker
        id="kg-arrow-prereq"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="4.5"
        markerHeight="4.5"
        orient="auto-start-reverse"
      >
        <path d="M0,1 L9,5 L0,9 z" fill="#d97706" />
      </marker>
      <marker
        id="kg-arrow-prereq-active"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="5"
        markerHeight="5"
        orient="auto-start-reverse"
      >
        <path d="M0,1 L9,5 L0,9 z" fill="#b45309" />
      </marker>
      <marker
        id="kg-arrow-related"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="4"
        markerHeight="4"
        orient="auto-start-reverse"
      >
        <path d="M0,1 L9,5 L0,9 z" fill="#94a3b8" />
      </marker>
      <marker
        id="kg-arrow-related-active"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="4.5"
        markerHeight="4.5"
        orient="auto-start-reverse"
      >
        <path d="M0,1 L9,5 L0,9 z" fill="#475569" />
      </marker>
    </defs>
  );
}
