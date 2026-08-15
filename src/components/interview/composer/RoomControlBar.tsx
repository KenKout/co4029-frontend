/**
 * LiveKit room control bar for the interview workspace: a mic toggle with a
 * live audio-level visualizer on the left, the end-interview action on the
 * right. Must be rendered inside a RoomContext.Provider with the room
 * already connected.
 */
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  BarVisualizer,
  useLocalParticipant,
  useRoomContext,
  useTrackToggle,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { Loader2, Mic, MicOff, PhoneOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RoomControlBar({
  disabled = false,
  endDisabled = false,
  onEndInterview,
  onMicEnabledChange,
}: {
  /** Greys out the mic toggle and blocks toggling, but keeps it focusable. */
  disabled?: boolean;
  endDisabled?: boolean;
  onEndInterview: () => void;
  /**
   * Mirrors the real mic track state to the caller. The controller's `micOn`
   * feeds the room provider's `audio` prop, whose reconnect-sync effect is what
   * restores the mic after a drop — without this it would mute a candidate who
   * toggled the mic on.
   */
  onMicEnabledChange?: (enabled: boolean) => void;
}) {
  const { t } = useTranslation();
  const room = useRoomContext();
  const {
    toggle,
    enabled: micEnabled,
    pending: micPending,
  } = useTrackToggle({ source: Track.Source.Microphone });
  const { localParticipant, microphoneTrack } = useLocalParticipant();

  // Mirror the REAL track state, read live from the participant at effect
  // time — never the toggle hook's `enabled`, which stays `false` (its
  // initial default) until the observable's first emission lands one render
  // AFTER mount. And report TRANSITIONS only, never the initial observation:
  // the bar mounts in the same commit as the setup→questioning flip, when the
  // auto-on's `setMicOn(true)` has not yet reached the provider (the mic is
  // published only on the NEXT render, once `audio` turns true) — reporting
  // that not-yet-published `false` overwrote the auto-on in the same batch
  // and, the auto-on being latched, the mic stayed off for the whole session.
  // A transition-only mirror still catches the one thing it exists for: the
  // candidate toggling the mic, which is a real track change.
  const prevMicEnabledRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (room.state !== ConnectionState.Connected) {
      // Forget the last observation on a drop: after the reconnect the first
      // reading must not be mistaken for "no change" (the mic is re-published
      // by the provider's own reconnect sync, not by this mirror).
      prevMicEnabledRef.current = null;
      return;
    }
    const current = localParticipant.isMicrophoneEnabled;
    const previous = prevMicEnabledRef.current;
    prevMicEnabledRef.current = current;
    if (previous === null || previous === current) return;
    onMicEnabledChange?.(current);
  }, [
    room,
    room.state,
    localParticipant,
    microphoneTrack,
    onMicEnabledChange,
  ]);

  // Placeholder-safe reference to the local mic publication: the visualizer
  // reads levels off it and falls back to idle-height bars while the mic
  // track is unpublished.
  const micTrackRef = useMemo<TrackReferenceOrPlaceholder>(
    () => ({
      participant: localParticipant,
      source: Track.Source.Microphone,
      publication: microphoneTrack,
    }),
    [localParticipant, microphoneTrack],
  );

  const micBlocked = disabled || micPending;

  const handleMicToggle = () => {
    if (micBlocked) return;
    // The toggle promise rejects on device failure; this bar surfaces no
    // error state, so keep the rejection handled.
    void toggle().catch(() => undefined);
  };

  return (
    <section className="mx-auto w-full max-w-[960px] rounded-2xl border border-border bg-white p-3 shadow-editorial sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleMicToggle}
          aria-pressed={micEnabled}
          aria-disabled={micBlocked || undefined}
          aria-label={t(
            micEnabled
              ? "course_interview.workspace.mic_toggle_off"
              : "course_interview.workspace.mic_toggle_on",
          )}
          className={cn(
            "min-h-11 gap-2 px-3",
            !micEnabled && "bg-surface-muted text-text-muted",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {micPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : micEnabled ? (
            <>
              <Mic className="h-4 w-4" />
              <BarVisualizer
                barCount={3}
                track={micTrackRef}
                options={{ minHeight: 25 }}
                aria-hidden="true"
                className="flex h-4 w-8 items-center justify-center gap-0.5"
              >
                <span className="h-full w-0.5 rounded-full bg-primary" />
              </BarVisualizer>
            </>
          ) : (
            <MicOff className="h-4 w-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="destructive"
          onClick={onEndInterview}
          disabled={endDisabled}
          aria-label={t("course_interview.workspace.end_call")}
          className="min-h-11 px-3 font-semibold"
        >
          <PhoneOff className="h-4 w-4" />
          <span className="hidden sm:inline">
            {t("course_interview.workspace.end_call")}
          </span>
        </Button>
      </div>
    </section>
  );
}
