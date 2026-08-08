/**
 * Hand-written types for voice interview endpoints (not in generated openapi-types).
 * Backend: Phase 2 — POST /interview-sessions/{id}/realtime-token
 *                     POST /interview-sessions/{id}/realtime-agent
 *                     POST /interview-sessions/{id}/integrity-events
 *
 * These stay hand-written because `openapi-snapshot.json` lags the live spec by
 * ~18 paths; regenerating to pick these up drags in unrelated endpoint drift.
 * Same precedent as the curated-KG and course-contact types.
 */

/**
 * Response from POST /interview-sessions/{session_id}/realtime-token
 *
 * `server_url` / `participant_token` duplicate `url` / `token` under the field
 * names LiveKit's own `TokenSource` reads (protobuf `livekit.TokenSourceResponse`
 * declares exactly `server_url` + `participant_token`). Both spellings ship so
 * this endpoint can back a `TokenSource.endpoint(...)` client without breaking
 * the existing `url`/`token` consumers.
 */
export interface RealtimeTokenResponse {
  /** LiveKit Cloud WS URL, e.g. wss://<project>.livekit.cloud */
  url: string;
  /** Short-lived participant token (JWT) */
  token: string;
  /** Room name assigned by the backend */
  room_name: string;
  /** Alias of `url`, named for LiveKit `TokenSource` compatibility */
  server_url: string;
  /** Alias of `token`, named for LiveKit `TokenSource` compatibility */
  participant_token: string;
}

/**
 * POST /interview-sessions/{session_id}/realtime-agent
 *
 * Dispatches the interviewer into an already-open (warm) room. Takes no body
 * and returns 204 — declared as a type so the call site is not `unknown`.
 *
 * Errors: 409 onboarding incomplete or no room open, 502 dispatch failed,
 * 503 voice disabled.
 */
export type RealtimeAgentDispatchResponse = void;

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
