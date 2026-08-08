import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMicrophoneAvailability } from "../use-microphone-availability";

type PermissionChangeListener = () => void;

function installNavigator({
  mediaDevices,
  permissionState,
  permissionThrows = false,
}: {
  mediaDevices?: {
    enumerateDevices?: () => Promise<MediaDeviceInfo[]>;
  } | null;
  permissionState?: PermissionState;
  permissionThrows?: boolean;
}) {
  const listeners: PermissionChangeListener[] = [];

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value:
      mediaDevices === null
        ? undefined
        : {
            enumerateDevices:
              mediaDevices?.enumerateDevices ?? (() => Promise.resolve([])),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          },
  });

  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: {
      query: vi.fn(() => {
        if (permissionThrows) {
          return Promise.reject(new TypeError("unsupported permission name"));
        }
        return Promise.resolve({
          state: permissionState ?? "prompt",
          addEventListener: (_: string, fn: PermissionChangeListener) =>
            listeners.push(fn),
          removeEventListener: vi.fn(),
        });
      }),
    },
  });

  return listeners;
}

function audioInput(): MediaDeviceInfo {
  return {
    deviceId: "mic-1",
    groupId: "g",
    kind: "audioinput",
    label: "Mic",
    toJSON: () => ({}),
  };
}

function videoInput(): MediaDeviceInfo {
  return {
    deviceId: "cam-1",
    groupId: "g",
    kind: "videoinput",
    label: "Cam",
    toJSON: () => ({}),
  };
}

describe("useMicrophoneAvailability", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports ready when permission is granted and an audio input exists", async () => {
    installNavigator({
      permissionState: "granted",
      mediaDevices: { enumerateDevices: () => Promise.resolve([audioInput()]) },
    });

    const { result } = renderHook(() => useMicrophoneAvailability());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.available).toBe(true);
  });

  it("reports denied when the permission is explicitly denied", async () => {
    installNavigator({
      permissionState: "denied",
      mediaDevices: { enumerateDevices: () => Promise.resolve([audioInput()]) },
    });

    const { result } = renderHook(() => useMicrophoneAvailability());

    await waitFor(() => expect(result.current.status).toBe("denied"));
    expect(result.current.available).toBe(false);
  });

  it("reports no-device only once permission is granted", async () => {
    installNavigator({
      permissionState: "granted",
      mediaDevices: { enumerateDevices: () => Promise.resolve([videoInput()]) },
    });

    const { result } = renderHook(() => useMicrophoneAvailability());

    await waitFor(() => expect(result.current.status).toBe("no-device"));
    expect(result.current.available).toBe(false);
  });

  it("stays optimistic when permission is still prompt and the device list is blinded", async () => {
    // Browsers withhold the device list before permission is granted, so an
    // empty list here is not evidence of absence. Claiming "no-device" would
    // tell a candidate with a working headset that they have no microphone.
    installNavigator({
      permissionState: "prompt",
      mediaDevices: { enumerateDevices: () => Promise.resolve([]) },
    });

    const { result } = renderHook(() => useMicrophoneAvailability());

    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("falls back to device enumeration when the permission name is unsupported", async () => {
    // Firefox and Safari throw TypeError for name: "microphone". That is not a
    // denial, so it must not surface as one.
    installNavigator({
      permissionThrows: true,
      mediaDevices: { enumerateDevices: () => Promise.resolve([audioInput()]) },
    });

    const { result } = renderHook(() => useMicrophoneAvailability());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.available).toBe(true);
  });

  it("reports unsupported when the device API is absent", async () => {
    installNavigator({ mediaDevices: null });

    const { result } = renderHook(() => useMicrophoneAvailability());

    await waitFor(() => expect(result.current.status).toBe("unsupported"));
    expect(result.current.available).toBe(false);
  });

  it("recovers to ready when enumeration throws", async () => {
    installNavigator({
      permissionState: "prompt",
      mediaDevices: {
        enumerateDevices: () => Promise.reject(new Error("boom")),
      },
    });

    const { result } = renderHook(() => useMicrophoneAvailability());

    await waitFor(() => expect(result.current.status).toBe("ready"));
  });
});
