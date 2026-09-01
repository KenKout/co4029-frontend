import { Link } from "@tanstack/react-router";
import { FileClock, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useConfirm } from "@/components/ui/use-confirm";
import { useArchiveLearningProgram } from "@/lib/api/hooks/learning-programs";
import { useFormatDate } from "@/lib/format/date";
import type { LearningProgram } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { PROGRAM_STATUS_TOKENS, STATUS_RAIL } from "./program-status";

/**
 * One learning program, as a browse card.
 *
 * A program has no thumbnail and never will — there is no banner upload —
 * so the card cannot borrow the usual product-card shape where an image
 * does the visual work. Trying to fake one (a gradient block, a big icon)
 * fills space without saying anything.
 *
 * Instead the DATA is the visual: a coloured status rail down the left
 * edge anchors the card, the name gets the top line to itself, and the
 * three numbers that actually differentiate one program from another —
 * paths, students, pending requests — sit in a labelled strip with real
 * headings rather than icons a reader has to decode.
 *
 * What changed from the first version, and why:
 *
 *   - The name was the THIRD thing on the card, behind an icon, a status
 *     pill and a draft badge. It is now first; status moved to the rail
 *     and the badge to the footer.
 *   - The draft badge carried `animate-pulse`. A permanent animation on a
 *     static fact reads as an unresolved alert, and every card with a
 *     draft had one.
 *   - The stat grid was a lopsided 2x2 with every `dt` set to `sr-only`,
 *     so a sighted reader saw bare numbers next to icons and had to guess
 *     which was which. Labels are now visible to everyone.
 */
export function ProgramCard({
  program,
  canManage,
  isDean,
}: {
  program: LearningProgram;
  canManage: boolean;
  /** Only the dean reviews path changes, so only the dean sees the count. */
  isDean: boolean;
}) {
  const formatDate = useFormatDate();
  const archive = useArchiveLearningProgram(program.id);
  const { confirm, dialog } = useConfirm({
    title: "Archive this program?",
    confirmLabel: "Archive program",
    cancelLabel: "Cancel",
  });

  const version = program.current_version;
  const pendingRequests = program.path_change_request_count ?? 0;

  async function handleArchive() {
    const ok = await confirm({
      description: `"${program.name}" leaves the management list. Students already enrolled stay on their pinned version — this hides the program, it does not cancel anyone.`,
    });
    if (!ok) return;
    archive.mutate();
  }

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-card ghost-border",
        "transition-shadow hover:shadow-editorial focus-within:shadow-editorial",
      )}
    >
      {/* Status as a rail rather than a pill beside the title. It gives the
          card an anchor an image would otherwise provide, and keeps the
          top line for the name. */}
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1", STATUS_RAIL[program.status])}
      />

      <div className="flex-1 py-5 pr-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          {/* The link wraps only the title but stretches over the whole
              card via ::after, so the card is clickable while staying a
              real anchor — middle-click and "open in new tab" work, which
              a div[role=button] silently broke. */}
          <h2 className="min-w-0 font-headline text-lg font-bold text-m3-on-surface">
            <Link
              to="/management/learning-programs/$id"
              params={{ id: program.id }}
              className="block truncate after:absolute after:inset-0 after:content-[''] hover:underline"
            >
              {program.name}
            </Link>
          </h2>

          {canManage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleArchive()}
              disabled={archive.isPending}
              // Above the stretched link, or the click would navigate.
              //
              // Muted rather than hidden-until-hover. A reveal-on-hover
              // control is invisible to touch and to anyone tabbing
              // through, and `group-hover:opacity-100` did not in fact win
              // the cascade against the `opacity-0` sitting on the same
              // element — verified in the browser, the button stayed
              // invisible with the card hovered.
              className="relative z-10 h-auto w-auto shrink-0 rounded-full p-1.5 text-text-muted opacity-50 transition-opacity hover:bg-red-50 hover:text-red-600 hover:opacity-100 focus-visible:opacity-100"
              title="Archive program"
              aria-label={`Archive ${program.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="truncate font-mono text-[11px] text-m3-on-surface-variant">
          {program.slug}
        </p>

        {program.description ? (
          <p className="mt-2 line-clamp-2 text-sm text-m3-on-surface-variant">
            {program.description}
          </p>
        ) : null}

        {/* The three numbers that separate one program from another. Given
            with headings, because "3" beside a Users glyph is a puzzle and
            these are the whole point of the card. */}
        <dl
          className={cn(
            "mt-4 grid gap-2 border-t border-m3-outline-variant/30 pt-3",
            isDean ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          <Stat label="Paths" value={program.paths.length} />
          <Stat label="Students" value={program.student_count ?? 0} />
          {isDean ? (
            <Stat
              label="Requests"
              value={pendingRequests}
              alert={pendingRequests > 0}
            />
          ) : null}
        </dl>
      </div>

      {/* Version state lives in the footer: it is provenance, not identity,
          and a teacher scanning the grid is matching on name first. */}
      <footer className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-m3-outline-variant/30 bg-m3-surface-container-low/40 py-2.5 pr-5 pl-6 text-xs text-m3-on-surface-variant">
        <StatusBadge
          status={program.status}
          tokens={PROGRAM_STATUS_TOKENS}
          label={program.status}
          size="sm"
          shape="pill"
        />
        <span className="font-semibold text-m3-on-surface">
          v{version.version_no}
        </span>
        {version.published_at ? (
          <span className="truncate">{formatDate(version.published_at)}</span>
        ) : null}
        {program.has_draft_version ? (
          // No pulse. A draft revision is a state, not an alert — the
          // animation made every such card look like it needed attention
          // right now, and it never stopped.
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700 ring-1 ring-violet-300">
            <FileClock aria-hidden="true" className="h-3 w-3" />
            Draft v{version.version_no + 1}
          </span>
        ) : null}
      </footer>

      {dialog}
    </article>
  );
}

function Stat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-bold tracking-widest text-m3-on-surface-variant uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "text-xl font-bold tabular-nums",
          alert ? "text-rose-600" : "text-m3-on-surface",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
