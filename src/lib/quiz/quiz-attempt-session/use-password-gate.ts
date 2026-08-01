import { useState } from "react";

/**
 * Access-password gate (Phase 12). When the quiz has a password configured,
 * the start-attempt POST returns 403 {reason: quiz_password_required}; we
 * open this dialog, collect the password, and retry the start with it.
 * quiz_password_incorrect re-opens it with an inline error.
 */
export function usePasswordGate() {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  return {
    passwordDialogOpen,
    setPasswordDialogOpen,
    passwordInput,
    setPasswordInput,
    passwordError,
    setPasswordError,
  };
}

export type PasswordGate = ReturnType<typeof usePasswordGate>;
