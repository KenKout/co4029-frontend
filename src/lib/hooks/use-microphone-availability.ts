import { useCallback, useEffect, useState } from "react";

/**
 * Whether a microphone is actually usable, for the interview setup checklist.
 *
 * This exists because the checklist used to report `dictation.supported` — that
 * is, whether the browser ships the Web Speech API. A browser can support Web
 * Speech with no microphone attached, and can have a perfectly good microphone
 * while lacking Web Speech. So the row could read "Connected" for a candidate
 * with no input device, who then joined the LiveKit room mute. That is the
 * fail-unsafe direction for a checklist whose whole job is catching this before
 * the interview starts.
 *
 * Deliberately does NOT call `getUserMedia`: that would fire a permission
 * prompt during setup, and the prompt already belongs to `handleStart`
 * (interview-start-actions.ts), which hard-falls-back to a text session when
 * the candidate denies it. This hook only reads state that is observable
 * without prompting.
 */

export type MicrophoneAvailability =
  /** Still reading device/permission state. */
  | "checking"
  /** Browser exposes no device API at all (very old or non-secure context). */
  | "unsupported"
  /** Permission explicitly denied — the candidate must fix this in the browser. */
  | "denied"
  /** Permission is fine but no audio input device is present. */
  | "no-device"
  /** An audio input exists and nothing is blocking it. */
  | "ready";

interface MicrophoneState {
  status: MicrophoneAvailability;
  /**
   * True only for `"ready"`. Callers rendering a boolean row should use this
   * rather than testing the status string, so a future status added to the
   * union cannot silently become "connected".
   */
  available: boolean;
}

const UNSUPPORTED: MicrophoneState = {
  status: "unsupported",
  available: false,
};

/**
 * Read the Permissions API without prompting.
 *
 * Firefox and Safari do not accept `"microphone"` as a permission name and
 * throw `TypeError`. That is not a denial, so it resolves to `null` ("unknown")
 * and the caller falls back to device enumeration.
 */
async function queryMicPermission(): Promise<PermissionState | null> {
  if (!navigator.permissions?.query) return null;
  try {
    const result = await navigator.permissions.query({ name: "microphone" });
    return result.state;
  } catch {
    return null;
  }
}

/**
 * Resolve device presence.
 *
 * Before permission is granted, browsers deliberately blind this: labels are
 * empty, and some return a single placeholder entry or none at all even when
 * hardware exists. So a zero-length audio-input list is only trustworthy as
 * `"no-device"` once permission is `"granted"`. Treating it as authoritative
 * while permission is still `"prompt"` would tell a candidate with a working
 * headset that they have no microphone.
 */
async function hasAudioInput(): Promise<boolean | null> {
  if (!navigator.mediaDevices?.enumerateDevices) return null;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === "audioinput");
  } catch {
    return null;
  }
}

async function resolveMicrophoneState(): Promise<MicrophoneState> {
  if (!navigator.mediaDevices) return UNSUPPORTED;

  const permission = await queryMicPermission();
  if (permission === "denied") return { status: "denied", available: false };

  const audioInput = await hasAudioInput();

  if (permission === "granted" && audioInput === false) {
    return { status: "no-device", available: false };
  }

  // `audioInput === null` means enumeration is unavailable or threw; `false`
  // while permission is not yet granted means the browser is withholding the
  // list. Neither is evidence of absence, so both stay optimistic and let the
  // getUserMedia call at start be the real gate.
  return { status: "ready", available: true };
}

export function useMicrophoneAvailability(): MicrophoneState {
  const [state, setState] = useState<MicrophoneState>({
    status: "checking",
    available: false,
  });

  const refresh = useCallback((onResolved: (next: MicrophoneState) => void) => {
    void resolveMicrophoneState().then(onResolved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const apply = (next: MicrophoneState) => {
      if (!cancelled) setState(next);
    };

    refresh(apply);

    const mediaDevices = navigator.mediaDevices;
    const onDeviceChange = () => refresh(apply);
    mediaDevices?.addEventListener?.("devicechange", onDeviceChange);

    // Re-read when the candidate resolves the prompt in another surface (the
    // start flow, or the browser's own permission UI) so the checklist row does
    // not stay stale behind a since-granted permission.
    let permissionStatus: PermissionStatus | null = null;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" })
        .then((status) => {
          if (cancelled) return;
          permissionStatus = status;
          status.addEventListener("change", onDeviceChange);
        })
        .catch(() => {
          // Permission name unsupported (Firefox/Safari) — devicechange alone.
        });
    }

    return () => {
      cancelled = true;
      mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
      permissionStatus?.removeEventListener("change", onDeviceChange);
    };
  }, [refresh]);

  return state;
}
