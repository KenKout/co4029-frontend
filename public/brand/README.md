# aBridgeAI brand assets

Colours are taken from the live theme (`src/app.css`), not invented:

| token | hex | use |
|---|---|---|
| primary | `#1e40af` | mark, wordmark "aBridge" |
| primary-hover | `#1d4ed8` | gradient end |
| secondary | `#3b82f6` | wordmark "AI" (light bg) |
| accent | `#f59e0b` | the node / span — the one non-blue element |

The mark is a **pier arch**: arch + deck + two piers + suspenders. The piers and
deck are what make it read as a bridge rather than a dome — don't drop them from
the full-size mark. The amber node at the apex is the "AI" in the metaphor:
something crossing the span.

## Which file to use

| file | use when |
|---|---|
| `logo-mark.svg` | primary mark, **≥48px** |
| `logo-mark-solid.svg` | mark at **24–48px** (suspenders dropped, strokes thickened — a straight downscale of the full mark turns to hairlines) |
| `logo-mark-dark.svg` | mark on dark surfaces |
| `logo-lockup.svg` | full lockup with tagline, **≥260px wide** |
| `logo-lockup-compact.svg` | lockup **140–260px** (tagline dropped; it aliases badly below ~260px) |
| `logo-lockup-dark.svg` | lockup on dark surfaces |
| `logo-tile.svg` | app icon / PWA, **≥32px**. Matches the existing collapsed-sidebar "aB" |
| `logo-favicon-16.svg` | 16px favicon only — "aB" merges into a blob at that size, so it uses a single "a" |
| `logo-concepts.svg` | the review board (3 concepts, scale + mono + clearspace tests). Not a shipping asset |

## Rules

- **Clearspace**: ½ mark height on all sides.
- **Minimums**: mark 24px; lockup 140px wide.
- **Never** scale the full mark below 48px — use the solid variant. The
  suspenders are 5px strokes and vanish first.
- **Never** recolour the amber node. It is the only accent and it carries the
  "AI" meaning.
- The amber span under "aB" is **convex up** (an arch). If it ever renders as a
  sag, the path or a transform has been flipped — verify by measuring: for
  `M27 88 Q56 70 85 88` the curve midpoint is y=79 vs endpoints y=88, i.e. 9
  units *higher* on screen (SVG y grows downward).

## Contrast (measured against `#0f172a`)

| element | hex | ratio |
|---|---|---|
| "aBridge" | `#f1f5f9` | 16.30:1 |
| "AI" | `#93b4fc` | 8.65:1 |
| tagline | `#cbd5e1` | 12.02:1 |
| mark arch | `#60a5fa` | 7.02:1 |
| amber node | `#f59e0b` | 8.31:1 |

All pass WCAG AA (4.5:1). The brand blue `#1e40af` measures **1.9:1** on navy —
this is why `logo-mark-dark.svg` exists; do not use the light-background mark on
a dark surface.

## Not done

- No PNG/ICO exports yet (`logo-favicon-16.svg` is SVG only). Browsers accept
  SVG favicons, but Safari and older Edge want an `.ico` fallback.
- The favicon uses a letterform, not the bridge glyph, so there's no visual link
  between tab icon and primary mark. Deliberate (legibility at 16px) but worth a
  decision.
- Not yet wired into the app — `SideNavBar.tsx` still renders the wordmark as
  text and `index.html` has no favicon link.
