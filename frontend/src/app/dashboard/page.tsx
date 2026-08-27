"use client";

import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import {
  ReferenceRequest,
  deadlineLabel,
  statusPresentation,
} from "@/lib/requests";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useMemo, useState } from "react";

type ListResponse = { requests: ReferenceRequest[] };

export default function DashboardHomePage() {
  const token = typeof window === "undefined" ? null : getAuthToken();
  const [requests, setRequests] = useState<ReferenceRequest[]>([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [remindingRequestId, setRemindingRequestId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!token) return;

    apiRequest<ListResponse>("/requests", { token })
      .then((data) => setRequests(data.requests))
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "Could not load dashboard.",
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  async function sendReminder(requestId: string) {
    if (!token) {
      setError("Please sign in to send reminders.");
      return;
    }

    setRemindingRequestId(requestId);
    setError("");
    setActionMessage("");

    try {
      await apiRequest(`/requests/${requestId}/reminder`, {
        method: "POST",
        token,
      });
      posthog.capture("reminder_sent");
      setActionMessage("Reminder queued and will be delivered shortly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reminder.");
    } finally {
      setRemindingRequestId(null);
    }
  }

  const summary = useMemo(() => {
    const total = requests.length;
    const waiting = requests.filter(
      (r) =>
        r.status === "sent" || r.status === "opened" || r.status === "accepted",
    ).length;
    const accepted = requests.filter((r) => r.status === "accepted").length;
    const declined = requests.filter((r) => r.status === "declined").length;
    const completed = requests.filter((r) => r.status === "submitted").length;

    const dueSoon = requests
      .filter((r) => r.status !== "submitted" && r.status !== "cancelled")
      .sort(
        (a, b) =>
          new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime(),
      )
      .slice(0, 3);

    const attention =
      requests.find((r) => r.status === "declined") ??
      requests.find((r) => r.status === "sent") ??
      requests.find((r) => r.status === "opened") ??
      requests.find((r) => r.status === "accepted") ??
      null;
    const recent = [...requests].slice(0, 4);

    return {
      total,
      waiting,
      accepted,
      declined,
      completed,
      dueSoon,
      attention,
      recent,
    };
  }, [requests]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-12 sm:px-10">
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm text-muted">Good to see you.</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">
          Your references, organised.
        </h1>
        <p className="mt-2 text-sm text-muted">
          What needs attention, what is due, and what changed.
        </p>
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
        <p className="rounded-lg border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </p>
      ) : null}
      {actionMessage ? (
        <p className="rounded-lg border border-success/20 bg-green-50 px-4 py-3 text-sm text-success">
          {actionMessage}
        </p>
      ) : null}

      {!loading && !error && requests.length === 0 ? (
        <section className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold text-foreground">
            Your references, organised.
          </h2>
          <p className="mt-2 text-sm text-muted">
            Create your first request and we&apos;ll help you track it from
            invitation to submission.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/requests/new">
              Create your first request
            </Link>
          </Button>
        </section>
      ) : null}

      {!loading && !error && requests.length > 0 ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total" value={summary.total} />
            <SummaryCard label="Waiting" value={summary.waiting} />
            <SummaryCard label="Accepted" value={summary.accepted} />
            <SummaryCard label="Completed" value={summary.completed} />
          </section>

          {summary.declined > 0 ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                {summary.declined} request
                {summary.declined === 1 ? " is" : "s are"} declined. Choose
                alternate referees to keep deadlines on track.
              </p>
            </section>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-lg font-semibold text-foreground">
                Needs your attention
              </h2>
              {summary.attention ? (
                <div className="mt-3 rounded-xl border border-border bg-background/70 p-4">
                  <p className="text-base font-semibold text-foreground">
                    {statusPresentation(summary.attention).heading}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {statusPresentation(summary.attention).detail}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {summary.attention.institutionName} ·{" "}
                    {deadlineLabel(summary.attention.deadlineAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild variant="secondary">
                      <Link
                        href={`/dashboard/requests/${summary.attention.id}`}
                      >
                        View request
                      </Link>
                    </Button>
                    {summary.attention.status === "sent" ||
                    summary.attention.status === "opened" ||
                    summary.attention.status === "accepted" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={remindingRequestId === summary.attention.id}
                        onClick={() => sendReminder(summary.attention!.id)}
                      >
                        {remindingRequestId === summary.attention.id
                          ? "Sending..."
                          : "Send reminder"}
                      </Button>
                    ) : null}
                    {summary.attention.status === "declined" ? (
                      <Button asChild>
                        <Link href="/dashboard/requests/new">
                          Choose another referee
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  No urgent action right now.
                </p>
              )}
            </article>
            <article className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-lg font-semibold text-foreground">
                Due soon
              </h2>
              <ul className="mt-3 space-y-3">
                {summary.dueSoon.map((request) => (
                  <li
                    key={request.id}
                    className="rounded-xl border border-border bg-background/70 p-3"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {request.institutionName}
                    </p>
                    <p className="text-sm text-muted">
                      {request.programmeName}
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {deadlineLabel(request.deadlineAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold text-foreground">
              Recent activity
            </h2>
            <ul className="mt-3 space-y-3">
              {summary.recent.map((request) => {
                const status = statusPresentation(request);
                return (
                  <li
                    key={request.id}
                    className="rounded-xl border border-border bg-background/70 p-3"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {request.institutionName}
                    </p>
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
