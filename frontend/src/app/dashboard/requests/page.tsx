"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import {
  ReferenceRequest,
  deadlineLabel,
  statusPresentation,
} from "@/lib/requests";

type ListResponse = {
  requests: ReferenceRequest[];
};

export default function RequestsDashboardPage() {
  const token = typeof window === "undefined" ? null : getAuthToken();
  const [requests, setRequests] = useState<ReferenceRequest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;

    apiRequest<ListResponse>("/requests", { token })
      .then((data) => setRequests(data.requests))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load requests."),
      )
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-12 sm:px-10">
      <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Requests</h1>
            <p className="text-sm text-muted">
              Track each reference from send to submission.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/requests/new">Create request</Link>
          </Button>
        </div>
      </div>

      {!token ? (
        <p className="rounded-lg border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
          Please sign in to view requests.
        </p>
      ) : null}
      {loading ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          Loading requests...
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </p>
      ) : null}

      {!loading && !error && requests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-foreground">Your references, organised.</h2>
          <p className="mt-2 text-sm text-muted">
            Create your first request and we&apos;ll help you keep track of it from invitation to submission.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/requests/new">Create your first request</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4">
        {requests.map((request) => {
          const status = statusPresentation(request);
          const statusToneClass =
            status.tone === "success"
              ? "bg-green-50 text-green-700 border-green-200"
              : status.tone === "warning"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-slate-50 text-slate-700 border-slate-200";

          return (
            <article
              key={request.id}
              className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {request.institutionName}
                  </h2>
                  <p className="text-sm text-muted">{request.programmeName}</p>
                  <p className="mt-1 text-sm text-muted">
                    Referee: {request.refereeName} ({request.refereeEmail})
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm font-medium text-foreground">
                    {new Date(request.deadlineAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted">{deadlineLabel(request.deadlineAt)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${statusToneClass}`}
                  aria-label={status.heading}
                >
                  {status.heading}
                </span>
                <p className="text-sm text-foreground">{status.detail}</p>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
