"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import {
  ReferenceRequest,
  deadlineLabel,
  statusPresentation,
} from "@/lib/requests";

type ListResponse = { requests: ReferenceRequest[] };

export default function DashboardHomePage() {
  const token = typeof window === "undefined" ? null : getAuthToken();
  const [requests, setRequests] = useState<ReferenceRequest[]>([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    apiRequest<ListResponse>("/requests", { token })
      .then((data) => setRequests(data.requests))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load dashboard."),
      )
      .finally(() => setLoading(false));
  }, [token]);

  const summary = useMemo(() => {
    const total = requests.length;
    const waiting = requests.filter((r) => r.status === "sent" || r.status === "opened").length;
    const opened = requests.filter((r) => r.status === "opened").length;
    const completed = requests.filter((r) => r.status === "submitted").length;

    const dueSoon = requests
      .filter((r) => r.status !== "submitted" && r.status !== "cancelled")
      .sort((a, b) => new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime())
      .slice(0, 3);

    const attention = requests.find((r) => r.status === "sent") ?? requests.find((r) => r.status === "opened") ?? null;
    const recent = [...requests].slice(0, 4);

    return { total, waiting, opened, completed, dueSoon, attention, recent };
  }, [requests]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-12 sm:px-10">
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm text-muted">Good to see you.</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Your references, organised.</h1>
        <p className="mt-2 text-sm text-muted">What needs attention, what is due, and what changed.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard/requests/new">Create a free request</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard/requests">View all requests</Link>
          </Button>
        </div>
      </section>

      {!token ? (
        <p className="rounded-lg border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
          Please sign in to access your dashboard.
        </p>
      ) : null}
      {loading ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          Loading your dashboard...
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">{error}</p>
      ) : null}

      {!loading && !error && requests.length === 0 ? (
        <section className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold text-foreground">Your references, organised.</h2>
          <p className="mt-2 text-sm text-muted">
            Create your first request and we&apos;ll help you track it from invitation to submission.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/requests/new">Create your first request</Link>
          </Button>
        </section>
      ) : null}

      {!loading && !error && requests.length > 0 ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total" value={summary.total} />
            <SummaryCard label="Waiting" value={summary.waiting} />
            <SummaryCard label="Opened" value={summary.opened} />
            <SummaryCard label="Completed" value={summary.completed} />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-lg font-semibold text-foreground">Needs your attention</h2>
              {summary.attention ? (
                <div className="mt-3 rounded-xl border border-border bg-background/70 p-4">
                  <p className="text-base font-semibold text-foreground">
                    {statusPresentation(summary.attention).heading}
                  </p>
                  <p className="mt-1 text-sm text-muted">{statusPresentation(summary.attention).detail}</p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {summary.attention.institutionName} · {deadlineLabel(summary.attention.deadlineAt)}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">No urgent action right now.</p>
              )}
            </article>
            <article className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-lg font-semibold text-foreground">Due soon</h2>
              <ul className="mt-3 space-y-3">
                {summary.dueSoon.map((request) => (
                  <li key={request.id} className="rounded-xl border border-border bg-background/70 p-3">
                    <p className="text-sm font-medium text-foreground">{request.institutionName}</p>
                    <p className="text-sm text-muted">{request.programmeName}</p>
                    <p className="mt-1 text-sm text-foreground">{deadlineLabel(request.deadlineAt)}</p>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
            <ul className="mt-3 space-y-3">
              {summary.recent.map((request) => {
                const status = statusPresentation(request);
                return (
                  <li key={request.id} className="rounded-xl border border-border bg-background/70 p-3">
                    <p className="text-sm font-semibold text-foreground">{request.institutionName}</p>
                    <p className="text-sm text-muted">{status.detail}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
    </article>
  );
}
