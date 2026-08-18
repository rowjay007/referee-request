"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { saveAuthToken } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabase";

type SignupResponse = {
  user: { id: string; email: string; fullName: string };
  token: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      posthog.capture("signup_started");
      const data = await apiRequest<SignupResponse>("/auth/signup", {
        method: "POST",
        body: { email, fullName, password },
      });
      saveAuthToken(data.token);
      posthog.capture("signup_completed");
      setMessage("Account created successfully.");
      router.push("/dashboard/requests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    setError("");
    try {
      posthog.capture("google_auth_started");
      const supabase = getSupabaseClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
      if (authError) {
        throw authError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign up failed.");
      setGoogleLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Create account</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-surface p-6">
        <label className="block space-y-1">
          <span className="text-sm text-foreground">Full name</span>
          <input
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-foreground">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-foreground">Password</span>
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>
        <Button disabled={loading} className="w-full">
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <Button
        type="button"
        variant="secondary"
        disabled={googleLoading}
        onClick={handleGoogleSignUp}
        className="w-full"
      >
        {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
      </Button>
      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </main>
  );
}
