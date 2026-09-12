import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { QuizIntroPanel } from "@/routes/courses/_components/QuizIntroPanel";
import { QuizStartDialog } from "./QuizStartDialog";
import type { QuizStageProps } from "./types";

/**
 * Access-password prompt — shown when the quiz requires a password
 * (server returns 403 quiz_password_required on start).
 */
function QuizPasswordPrompt({
  session,
}: {
  session: QuizStageProps["session"];
}) {
  const { t } = useTranslation();
  const {
    passwordDialogOpen,
    setPasswordDialogOpen,
    passwordInput,
    setPasswordInput,
    passwordError,
    setPasswordError,
    submitPassword,
    startAttempt,
  } = session;

  return (
    <PromptDialog
      open={passwordDialogOpen}
      onOpenChange={(open) => {
        setPasswordDialogOpen(open);
        if (!open) {
          setPasswordInput("");
          setPasswordError(null);
        }
      }}
      title={t("course_quiz.password.title")}
      description={t("course_quiz.password.description")}
      confirmLabel={
        startAttempt.isPending
          ? t("course_quiz.password.submitting")
          : t("course_quiz.password.submit")
      }
      cancelLabel={t("common.cancel", "Cancel")}
      onConfirm={submitPassword}
      isPending={startAttempt.isPending}
    >
      <div className="space-y-1.5">
        <Input
          type="password"
          autoFocus
          value={passwordInput}
          onChange={(e) => {
            setPasswordInput(e.target.value);
            if (passwordError) setPasswordError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitPassword();
            }
          }}
          placeholder={t("course_quiz.password.placeholder")}
          aria-label={t("course_quiz.password.title")}
          aria-invalid={passwordError ? true : undefined}
        />
        {passwordError && (
          <p className="text-xs font-medium text-m3-error">{passwordError}</p>
        )}
      </div>
    </PromptDialog>
  );
}

/**
 * The pre-take stage: the intro panel plus the password gate dialog. Rendered
 * while no take is live.
 */
export function QuizIntroStage({
  session,
  quiz,
  slug,
  courseTitle,
}: QuizStageProps & { courseTitle?: string | null }) {
  const {
    attempts,
    inProgressAttempt,
    handleStartAttempt,
    requestResume,
    startAttempt,
    resumeRequested,
  } = session;

  // Which confirmation is open, if any. Start and resume share one dialog
  // because they differ only in copy — and both must run their action from
  // the CONFIRM click, since that click is the user activation the mandatory
  // fullscreen gate needs.
  const [confirming, setConfirming] = useState<"start" | "resume" | null>(null);

  return (
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
      <QuizIntroPanel
        quiz={quiz}
        attempts={attempts}
        inProgressAttempt={inProgressAttempt}
        onStart={() => setConfirming("start")}
        onResume={() => setConfirming("resume")}
        starting={startAttempt.isPending}
        resuming={resumeRequested}
        slug={slug}
        courseTitle={courseTitle}
      />

      <QuizStartDialog
        open={confirming !== null}
        onOpenChange={(next) => {
          if (!next) setConfirming(null);
        }}
        isResume={confirming === "resume"}
        isPending={startAttempt.isPending || resumeRequested}
        onConfirm={() => {
          // Close first so the dialog does not sit over the take screen, then
          // act — still inside this click's activation, so the fullscreen
          // request the action makes is honoured.
          const action = confirming;
          setConfirming(null);
          if (action === "resume") requestResume();
          else if (action === "start") void handleStartAttempt();
        }}
      />

      <QuizPasswordPrompt session={session} />
    </div>
  );
}
