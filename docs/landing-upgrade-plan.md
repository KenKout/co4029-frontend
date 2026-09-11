# Landing page upgrade

## Objective

Help a first-time visitor understand the input, instructor review, and learning output before asking them to sign in.

## Implementation

1. Replace abstract hero copy and decorative progress bars with a concrete course-material example.
2. Add a three-step interactive sample workflow, available without an account. Label illustrative content explicitly.
3. Follow the workflow with role-specific benefits and the instructor-governance explanation.
4. Add accessible mobile navigation and a getting-started FAQ. Use existing catalog and help routes, not an unavailable demo-booking service. The router requires sign-in for the catalog, so state this explicitly; only the sample and help are public.
5. Align title, description and social metadata with the product promise.

## Scope

English landing, consistent with existing content. No authentication, enrollment, backend or deployment changes. No invented testimonials, metrics or data-handling promises.

## Verification

Landing interaction/content tests, TypeScript/Vite build, focused lint and formatting. Inspect desktop/mobile, anchors, sample controls and FAQ when browser access is available. Record validation limitations in delivery summary.

### Completed — 2026-09-11

- TypeScript and Vite production build passed; Vite reports application chunks over 500 kB. No performance score is claimed.
- All three landing tests passed: honest destinations/content, sample step switching, and mobile menu dismissal/focus behavior.
- Focused ESLint and formatting passed; git diff whitespace check passed.
- Inspected desktop and 390px/320px mobile views in the browser. At 320px, document scroll width equals client width.
- Verified sample anchor navigation and changing the displayed evidence, mobile menu closing after a selection, and FAQ expansion with Tab/Enter.
- Verified the course CTA reaches /login?next=%2Fcourses. Authentication itself was not exercised.
- No production deployment performed.

## Follow-up

Add approved product captures and a real pilot story when available. Add demo booking only with a real intake workflow. Vietnamese localization and measured performance optimization are separate changes.
