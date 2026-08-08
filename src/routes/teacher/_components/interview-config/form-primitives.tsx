/**
 * Shared form primitives for the interview-config page.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 2 of that file's
 * decomposition). All four are leaves — props in, markup out, no data fetching —
 * and all four are used from more than one place in the page, which is why they
 * moved together.
 *
 * `Field` carries the published-freeze wiring, so it is the load-bearing one
 * here: `routes/teacher/__tests__/interview-config-published-freeze.test.tsx`
 * asserts against its cloning behaviour.
 */

import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-headline font-extrabold text-base text-m3-on-surface">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-m3-on-surface-variant">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  frozen = false,
  frozenReason,
  children,
}: {
  label: ReactNode;
  hint?: string;
  /** Dim + disable this field (frozen while the config is published). */
  frozen?: boolean;
  /** Tooltip explaining why, shown on the dimmed field. */
  frozenReason?: string;
  children: ReactNode;
}) {
  const generatedId = useId();
  const { controlId, wired } = wireControl(children, { frozen, generatedId });

  return (
    <div
      className={cn("space-y-1.5", frozen && "opacity-60")}
      title={frozen ? frozenReason : undefined}
    >
      <label
        htmlFor={controlId}
        className="block text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant"
      >
        {label}
        {frozen && (
          <Lock
            className="ml-1.5 inline-block h-3 w-3 align-text-top"
            aria-hidden="true"
          />
        )}
      </label>
      {wired}
      {hint && <p className="text-[11px] text-m3-on-surface-variant">{hint}</p>}
    </div>
  );
}

function wireControl(
  children: ReactNode,
  { frozen, generatedId }: { frozen: boolean; generatedId: string },
): { controlId: string | undefined; wired: ReactNode } {
  // Associate the label with its control, and disable it when frozen.
  //
  // Done by cloning rather than by wrapping the control in the <label>:
  // implicit association would swallow any other interactive child, and the
  // persona field puts a "View guide" button next to its Select, which would
  // then toggle the Select when clicked.
  //
  // The FIRST element child is treated as the control. Earlier this only fired
  // for a lone child, which quietly did nothing on exactly the fields that have
  // a sibling: AI persona and AI voice both render `Select` + a "View guide"
  // link, so they stayed fully operable while dimmed — the freeze looked applied
  // but the dropdown still changed the value. Later children (a guide link, a
  // preview paragraph) are deliberately left alone: reading the persona guide is
  // harmless on a published config, and disabling it would remove information
  // for no gain.
  const childArray = Children.toArray(children);
  const controlIndex = childArray.findIndex((child) => isValidElement(child));
  const control =
    controlIndex >= 0 ? (childArray[controlIndex] as ReactElement) : null;
  const childProps = (control?.props ?? {}) as {
    id?: string;
    disabled?: boolean;
  };
  const controlId = childProps.id ?? (control ? generatedId : undefined);
  // A frozen field is disabled at the control, not merely dimmed: greying an
  // input the teacher can still type into (only to have the save 409) is worse
  // than not dimming it at all. `disabled` is only forced ON — a control the
  // caller already disabled for its own reason stays disabled.
  const extraProps: { id?: string; disabled?: boolean } = {};
  if (control && !childProps.id) extraProps.id = generatedId;
  if (control && frozen) extraProps.disabled = true;
  const wired =
    control && Object.keys(extraProps).length > 0
      ? childArray.map((child, index) =>
          index === controlIndex
            ? cloneElement(
                control as ReactElement<{ id?: string; disabled?: boolean }>,
                extraProps,
              )
            : child,
        )
      : children;
  return { controlId, wired };
}

export function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-m3-on-surface">{label}</p>
        <p className="text-xs text-m3-on-surface-variant mt-0.5">
          {description}
        </p>
      </div>
      <Button variant="ghost"
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/50 shrink-0 cursor-pointer",
          value ? "bg-m3-primary" : "bg-m3-surface-container-high",
        )}
      >
        {/* Knob moves by transform, not by `left`. Animating `left` under
            `transition-all` recomputed layout on every frame of every toggle;
            a translate runs on the compositor and matches the opacity/transform
            rule the rest of this file follows. */}
        <span
          className={cn(
            "absolute top-1 left-1 w-4 h-4 rounded-full shadow-sm transition-[transform,background-color] duration-200 ease-out",
            value
              ? "translate-x-5 bg-surface-elev"
              : "translate-x-0 bg-slate-400",
          )}
        />
      </Button>
    </div>
  );
}

export function SettingsCard({
  title,
  description,
  children,
  stagger = 0,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  /** Position in the card column, used to stagger the reveal (0 = first). */
  stagger?: number;
}) {
  return (
    <section
      // Enter animation runs unconditionally rather than via the `.reveal`
      // IntersectionObserver: `.reveal` sets a hard `opacity: 0` and useReveal()
      // unobserves after the first intersection, so a card that mounts while its
      // tab panel is `hidden` would never receive `.visible` and would stay
      // permanently invisible. A plain keyframe cannot get stuck.
      // opacity+transform only → compositor-only, no reflow.
      className="motion-safe:animate-[fade-in-up_0.4s_cubic-bezier(0.16,1,0.3,1)_both] rounded-xl border border-m3-outline-variant/40 bg-m3-surface-container-low/40 p-5 lg:p-6 space-y-4 transition-colors duration-200 hover:border-m3-outline-variant/70"
      style={{ animationDelay: `${revealDelayMs(stagger)}ms` } as CSSProperties}
    >
      <div className="space-y-1">
        <h3 className="font-headline font-extrabold text-base text-m3-on-surface">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-m3-on-surface-variant">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Stagger step, capped so the whole column is revealed within ~360ms. */
function revealDelayMs(index: number): number {
  const STEP_MS = 60;
  const MAX_STEPS = 6;
  return Math.min(Math.max(index, 0), MAX_STEPS) * STEP_MS;
}
