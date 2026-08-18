"use client";

import Link from "next/link";
import { useState } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export default function SignupPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignUp() {
    setLoading(true);
    setError("");
    try {
      posthog.capture("google_auth_started");
      const supabase = getSupabaseClient();
      const redirectTo = `${(APP_URL ?? window.location.origin).replace(/\/$/, "")}/auth/callback`;
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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Create account with Google</h1>
      <div className="space-y-4 rounded-lg border border-border bg-surface p-6">
        <Button disabled={loading} className="w-full" onClick={handleGoogleSignUp}>
          {loading ? "Redirecting to Google..." : "Continue with Google"}
        </Button>
      </div>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/signin" className="text-primary underline">
          Sign in
        </Link>
        .
      </p>
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </main>
  );
}
