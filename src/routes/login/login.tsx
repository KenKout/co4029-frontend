import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import {
  getGoogleLogin,
  GOOGLE_OAUTH_STATE_STORAGE_KEY,
  setPostLoginRedirect,
} from "@/lib/auth";

export default function LoginPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { next?: string };

  useEffect(() => {
    if (!isAuthenticated) return;

    void navigate({
      to: "/dashboard",
      replace: true,
    });
  }, [isAuthenticated, navigate, search.next]);

  async function handleGoogleLogin() {
    setIsLoading(true);
    setError(null);

    try {
      setPostLoginRedirect(search.next ?? null);

      const { authorization_url, state } = await getGoogleLogin();

      sessionStorage.setItem(GOOGLE_OAUTH_STATE_STORAGE_KEY, state);
      window.location.assign(authorization_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.google_failed"));
      setIsLoading(false);
    }
  }

  return (
    <main className="flex flex-col md:flex-row min-h-screen overflow-hidden">
      <section className="hidden md:flex md:w-1/2 relative bg-m3-primary items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-full h-full rounded-full bg-m3-secondary-container blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-full h-full rounded-full bg-m3-tertiary blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="font-headline text-5xl md:text-6xl font-black text-white tracking-tighter mb-6 leading-tight">
            {t("login.hero_title")}
          </h1>
          <p className="text-white/80 text-lg leading-relaxed mb-12 font-medium">
            {t("login.hero_body")}
          </p>

          <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-m3-secondary-container to-m3-tertiary">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <span className="text-white text-4xl">🌉</span>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-m3-primary/60 to-transparent" />
          </div>
        </div>

        <div className="absolute top-12 left-12">
          <Link
            to="/"
            className="font-headline text-3xl font-black text-white tracking-tighter"
            search={{}}
          >
            aBridgeAI
          </Link>
        </div>
      </section>

      <section className="flex-grow flex items-center justify-center p-6 md:p-12 lg:p-24 bg-m3-surface-bright">
        <div className="w-full max-w-md space-y-10">
          <div className="md:hidden flex justify-center mb-8">
            <Link
              to="/"
              className="font-headline text-3xl font-black text-m3-primary tracking-tighter"
            >
              aBridgeAI
            </Link>
          </div>

          <header>
            <h2 className="font-headline text-4xl font-extrabold text-m3-on-surface tracking-tight mb-2">
              {t("login.title")}
            </h2>
            <p className="text-m3-on-surface-variant font-medium">
              {t("login.subtitle")}
            </p>
          </header>

          <div className="space-y-5 rounded-xl bg-white/70 p-5 shadow-[0_24px_80px_rgba(25,28,30,0.08)] ring-1 ring-m3-outline-variant/20 backdrop-blur">
            <Button
              className="w-full h-14 rounded-xl bg-m3-surface-container-lowest text-m3-primary hover:bg-m3-surface-container-low border border-m3-outline-variant/20 font-bold shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-3"
              disabled={isLoading}
              onClick={handleGoogleLogin}
              type="button"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span>
                {isLoading
                  ? t("login.opening_google")
                  : t("login.continue_google")}
              </span>
              {!isLoading && <ArrowRight className="h-5 w-5" />}
            </Button>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
                {error}
              </p>
            )}

            <div className="flex items-start gap-3 rounded-xl bg-m3-secondary-fixed/70 px-4 py-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-m3-secondary" />
              <p className="text-sm font-medium leading-relaxed text-m3-on-secondary-fixed">
                {t("login.oauth_only")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-8 right-8 z-50">
        <div className="flex items-center gap-3 px-4 py-2 bg-m3-secondary-fixed rounded-full shadow-lg border border-m3-secondary/10">
          <div className="w-2 h-2 bg-m3-secondary rounded-full animate-pulse" />
          <span className="text-xs font-bold text-m3-on-secondary-fixed uppercase tracking-wider">
            {t("login.ai_security")}
          </span>
        </div>
      </div>
    </main>
  );
}
