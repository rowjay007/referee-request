"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { ReferenceRequest, statusMessage } from "@/lib/requests";

type ListResponse = {
  requests: ReferenceRequest[];
};

export default function RequestsDashboardPage() {
  const token = typeof window === "undefined" ? null : getAuthToken();
  const [requests, setRequests] = useState<ReferenceRequest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      return;
    }

    apiRequest<ListResponse>("/requests", {
      token,
    })
      .then((data) => setRequests(data.requests))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load requests."),
      )
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Reference requests
          </h1>
          <p className="text-sm text-muted">
            Track every reference request without chasing manually.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/requests/new">Create request</Link>
        </Button>
      </div>

      {!token ? (
        <p className="text-sm text-error">Please sign in to view requests.</p>
      ) : null}
      {loading ? <p className="text-sm text-muted">Loading requests...</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}

      {!loading && !error && requests.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="text-sm text-muted">
            No requests yet. Create your first request to get started.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4">
        {requests.map((request) => (
          <article
            key={request.id}
            className="rounded-lg border border-border bg-surface p-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {request.institutionName} · {request.programmeName}
                </h2>
                <p className="text-sm text-muted">
                  Referee: {request.refereeName} ({request.refereeEmail})
                </p>
              </div>
              <p className="text-sm font-medium text-foreground">
                Deadline: {new Date(request.deadlineAt).toLocaleDateString()}
              </p>
            </div>
            <p className="mt-3 text-sm text-foreground">{statusMessage(request)}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
