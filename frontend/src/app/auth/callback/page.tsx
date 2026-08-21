"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { apiRequest } from "@/lib/api";
import { saveAuthToken } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabase";

type AuthResponse = {
  user: { id: string; email: string; fullName: string };
  token: string;
};

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing Google sign in...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      try {
        const supabase = getSupabaseClient();
        const code = new URL(window.location.href).searchParams.get("code");
        if (!code) {
          throw new Error("No auth code found in callback URL.");
        }

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          throw exchangeError;
        }
        window.history.replaceState({}, "", "/auth/callback");

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        const accessToken = data.session?.access_token;
        if (!accessToken) {
          throw new Error("No Supabase access token returned.");
        }

        const authData = await apiRequest<AuthResponse>("/auth/google", {
          method: "POST",
          body: { accessToken },
        });
        saveAuthToken(authData.token);
        posthog.capture("google_auth_completed");

        if (!cancelled) {
          setStatus("Redirecting to your dashboard...");
          router.replace("/dashboard");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Google sign in failed.");
        }
      }
    }

    completeAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-10">
      <article className="space-y-5 rounded-2xl border border-border bg-surface/95 p-7 text-center shadow-lg shadow-primary/10 backdrop-blur">
        <Link href="/" className="mx-auto block w-fit" aria-label="Go to RefereeRequest home">
          <Image
            src="/referee-request-logo.svg"
            alt="RefereeRequest"
            width={56}
            height={56}
            className="mx-auto"
            priority
          />
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">Google sign in</h1>
        {!error ? <p className="text-sm text-muted">{status}</p> : null}
        {error ? (
          <p className="text-sm text-error">
            {error}{" "}
            <Link href="/signin" className="font-medium underline">
              Try again
            </Link>
            .
          </p>
        ) : null}
      </article>
    </main>
  );
}
