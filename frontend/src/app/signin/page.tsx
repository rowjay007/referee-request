"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { saveAuthToken } from "@/lib/auth";

type LoginResponse = {
  user: { id: string; email: string; fullName: string };
  token: string;
};

export default function SigninPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const data = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      saveAuthToken(data.token);
      setMessage("Signed in successfully.");
      router.push("/dashboard/requests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-border bg-surface p-6"
      >
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
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>
        <Button disabled={loading} className="w-full">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </main>
  );
}
