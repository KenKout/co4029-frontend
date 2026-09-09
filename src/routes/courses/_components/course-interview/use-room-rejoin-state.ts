import { useEffect, useState } from "react";

import type { Room } from "livekit-client";
import { ConnectionState, DisconnectReason, RoomEvent } from "livekit-client";

/**
 * Room rejoin UX (migration step 4) — extracted from
 * InterviewWorkspaceScreen so the screen stays inside the lint caps.
 *
 * The room is the only transport, so a drop while typing is a hard stop until
 * it recovers. Three distinct surfaces, because the recovery differs:
 *   token mint failed  → manual Rejoin re-mints the token
 *   signal reconnecting → the SDK owns recovery; reassure, do nothing
 *   room dropped        → manual Rejoin re-mints the token (a fresh join)
 * Event-driven rather than derived from `room.state` so the FIRST join can
 * never flash a "connection lost" banner while it is still connecting: the
 * `Disconnected` event only fires after a connection existed (or failed).
 */
export function useRoomRejoinState(room: Room | null) {
  const [roomDropped, setRoomDropped] = useState(false);
  useEffect(() => {
    if (!room) return;
    const onDisconnected = (reason?: DisconnectReason) => {
      if (reason !== DisconnectReason.CLIENT_INITIATED) setRoomDropped(true);
    };
    const onRecovered = () => setRoomDropped(false);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.Connected, onRecovered);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.Connected, onRecovered);
    };
  }, [room]);
  const roomState = room?.state;
  const signalReconnecting =
    roomState === ConnectionState.Reconnecting ||
    roomState === ConnectionState.SignalReconnecting;
  return { roomDropped, signalReconnecting };
}
