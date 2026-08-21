"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase";
import { getAuthToken } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAuthToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleGoogleSignUp() {
    setLoading(true);
    setError("");
    try {
      posthog.capture("google_auth_started");
      const supabase = getSupabaseClient();
      const redirectTo = `${window.location.origin.replace(/\/$/, "")}/auth/callback`;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (authError) {
        throw authError;
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Google sign up failed.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-10">
      <article className="space-y-6 rounded-2xl border border-border bg-surface/95 p-7 shadow-lg shadow-primary/10 backdrop-blur">
        <div className="space-y-4 text-center">
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
          <h1 className="text-2xl font-semibold text-foreground">Create account with Google</h1>
          <p className="text-sm text-muted">
            Get started quickly and manage all your referee requests in one place.
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">References, without the chasing.</p>
        </div>
        <Button
          disabled={loading}
          className="h-11 w-full text-sm"
          onClick={handleGoogleSignUp}
        >
          {loading ? "Redirecting to Google..." : "Continue with Google"}
        </Button>
        {error ? <p className="text-center text-sm text-error">{error}</p> : null}
      </article>
      <div className="text-center">
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-primary underline">
            Sign in
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
