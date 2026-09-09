import { useTranslation } from "react-i18next";

import {
  ConnectionLostBanner,
  ErrorBanner,
} from "@/components/interview/error-banner";

/**
 * The four room-status surfaces (offline, token error, dropped room,
 * signal reconnecting), extracted from InterviewWorkspaceScreen so the
 * screen stays inside the lint caps. Semantics unchanged — which banner
 * renders, and what its retry does, is decided here and nowhere else.
 */
export function WorkspaceRoomBanners(args: {
  connected: boolean;
  roomWanted: boolean;
  tokenError: string | null | boolean;
  roomDropped: boolean;
  signalReconnecting: boolean;
  onOfflineRetry: () => void;
  onRejoin: () => void;
}) {
  const { t } = useTranslation();
  const {
    connected,
    roomWanted,
    tokenError,
    roomDropped,
    signalReconnecting,
    onOfflineRetry,
    onRejoin,
  } = args;
  return (
    <>
      {!connected && (
        <div className="mx-auto w-full max-w-[840px] px-4 pt-3">
          <ConnectionLostBanner onRetry={onOfflineRetry} />
        </div>
      )}

      {roomWanted && tokenError && (
        <div className="mx-auto w-full max-w-[840px] px-4 pt-3">
          <ErrorBanner
            severity="error"
            title={t("course_interview.recovery.room_error_title")}
            description={t("course_interview.recovery.room_error_body")}
            reassurance={t("course_interview.recovery.progress_safe")}
            actions={[
              {
                label: t("course_interview.recovery.rejoin"),
                onClick: onRejoin,
                primary: true,
              },
            ]}
          />
        </div>
      )}

      {!tokenError && roomDropped && (
        <div className="mx-auto w-full max-w-[840px] px-4 pt-3">
          <ConnectionLostBanner onRetry={onRejoin} />
        </div>
      )}

      {!tokenError && !roomDropped && signalReconnecting && (
        <div className="mx-auto w-full max-w-[840px] px-4 pt-3">
          <ConnectionLostBanner reconnecting />
        </div>
      )}
    </>
  );
}
