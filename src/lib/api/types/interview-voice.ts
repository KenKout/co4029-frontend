/**
 * Hand-written types for voice interview endpoints (not in generated openapi-types).
 * Backend: Phase 2 — POST /interview-sessions/{id}/realtime-token
 *                     POST /interview-sessions/{id}/integrity-events
 */

/** Response from POST /interview-sessions/{session_id}/realtime-token */
export interface RealtimeTokenResponse {
  /** LiveKit Cloud WS URL, e.g. wss://<project>.livekit.cloud */
  url: string;
  /** Short-lived participant token (JWT) */
  token: string;
  /** Room name assigned by the backend */
  room_name: string;
}

export type IntegrityEventType =
  | "focus_lost"
  | "tab_switch"
  | "fullscreen_exit"
  | "warning_issued"
  | "reconnect"
  | "disconnect";

export type IntegrityEventSeverity = "info" | "warning" | "critical";

export interface IntegrityEvent {
  event_type: IntegrityEventType;
  severity?: IntegrityEventSeverity;
  /** Arbitrary JSON metadata (optional) */
  metadata?: Record<string, unknown>;
}

/** Body for POST /interview-sessions/{session_id}/integrity-events */
export interface IntegrityEventsRequest {
  /** Max 50 events per request */
  events: IntegrityEvent[];
}

/** Response from POST /interview-sessions/{session_id}/integrity-events */
export interface IntegrityEventsResponse {
  accepted: number;
}
