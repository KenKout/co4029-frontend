import { Loader2 } from "lucide-react";

import MfaBrandHeader from "./_components/login-mfa/MfaBrandHeader";
import MfaChallengeFooter from "./_components/login-mfa/MfaChallengeFooter";
import MfaCodeForm from "./_components/login-mfa/MfaCodeForm";
import MfaModeTabs from "./_components/login-mfa/MfaModeTabs";
import { useMfaChallenge } from "./_components/login-mfa/use-mfa-challenge";

export default function LoginMfaPage() {
  const controller = useMfaChallenge();
  const { status } = controller;

  // Hide the form until AuthProvider has hydrated. The effect inside
  // ``useMfaChallenge`` already short-circuits while ``status === "loading"``
  // so we never run the redirect/challenge logic too early, but the form would
  // otherwise flash on screen with the verify button disabled and
  // give the impression we ate the user's session.
  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-m3-surface-bright px-6 py-10">
        <Loader2 className="h-6 w-6 animate-spin text-m3-secondary" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-m3-surface-bright px-6 py-10">
      <section className="w-full max-w-md space-y-8 rounded-xl bg-white/80 p-8 shadow-[0_24px_80px_rgba(25,28,30,0.08)] ring-1 ring-m3-outline-variant/20 backdrop-blur">
        <MfaBrandHeader />
        <MfaModeTabs controller={controller} />
        <MfaCodeForm controller={controller} />
        <MfaChallengeFooter controller={controller} />
      </section>
    </main>
  );
}
