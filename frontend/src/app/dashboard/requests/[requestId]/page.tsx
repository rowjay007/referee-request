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
import { useParams } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useMemo, useState } from "react";

type RequestResponse = { request: ReferenceRequest };

type RequestReadinessResponse = {
  requestId: string;
  readiness: {
    ready: boolean;
    missingFields: string[];
    checklist: {
      refereeInformation: boolean;
      applicationPurpose: boolean;
      deadline: boolean;
      candidateContext: boolean;
      supportingInformation: boolean;
    };
  };
};

type DocumentItem = {
  id: string;
  safeFilename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

type DocumentsResponse = { documents: DocumentItem[] };
type RequestEvent = {
  id: string;
  referenceRequest: string;
  eventType: string;
  actorUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type EventsResponse = { events: RequestEvent[] };

export default function RequestDetailPage() {
  const params = useParams<{ requestId: string }>();
  const requestId = params?.requestId ?? "";
  const token = typeof window === "undefined" ? null : getAuthToken();

  const [request, setRequest] = useState<ReferenceRequest | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [readiness, setReadiness] = useState<
    RequestReadinessResponse["readiness"] | null
  >(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [reminding, setReminding] = useState(false);
  const [thanking, setThanking] = useState(false);

  async function refreshEvents() {
    if (!token || !requestId) {
      return;
    }

    const eventData = await apiRequest<EventsResponse>(
      `/requests/${requestId}/events`,
      { token },
    );
    setEvents(eventData.events);
  }

  useEffect(() => {
    if (!token || !requestId) {
      return;
    }

    Promise.all([
      apiRequest<RequestResponse>(`/requests/${requestId}`, { token }),
      apiRequest<DocumentsResponse>(`/requests/${requestId}/documents`, {
        token,
      }),
      apiRequest<EventsResponse>(`/requests/${requestId}/events`, { token }),
      apiRequest<RequestReadinessResponse>(`/requests/${requestId}/readiness`, {
        token,
      }),
    ])
      .then(([requestData, documentData, eventData, readinessData]) => {
        setRequest(requestData.request);
        setDocuments(documentData.documents);
        setEvents(eventData.events);
        setReadiness(readinessData.readiness);
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : "Could not load request details.",
        ),
      )
      .finally(() => setLoading(false));
  }, [token, requestId]);

  const missingFieldsLabel = useMemo(() => {
    if (!readiness || readiness.missingFields.length === 0) {
      return "none";
    }
    const labels: Record<string, string> = {
      refereeInformation: "referee information",
      applicationPurpose: "application purpose",
      deadline: "deadline",
      candidateContext: "candidate context",
      supportingInformation: "supporting information",
    };
    return readiness.missingFields
      .map((field) => labels[field] ?? field)
      .join(", ");
  }, [readiness]);

  async function sendReminder() {
    if (!token || !requestId) {
      setError("Please sign in to send reminders.");
      return;
    }

    setReminding(true);
    setError("");
    setActionMessage("");

    try {
      await apiRequest(`/requests/${requestId}/reminder`, {
        method: "POST",
        token,
      });
      await refreshEvents();
      posthog.capture("reminder_sent");
      setActionMessage("Reminder queued and will be delivered shortly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reminder.");
    } finally {
      setReminding(false);
    }
  }

  async function sendThankYou() {
    if (!token || !requestId) {
      setError("Please sign in to send thank-you notes.");
      return;
    }

    setThanking(true);
    setError("");
    setActionMessage("");

    try {
      await apiRequest(`/requests/${requestId}/thank-you`, {
        method: "POST",
        token,
      });
      await refreshEvents();
      posthog.capture("thank_you_sent");
      setActionMessage("Thank-you note queued and will be delivered shortly.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send thank-you note.",
      );
    } finally {
      setThanking(false);
    }
  }

  if (!token) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 px-6 pb-12 sm:px-10">
        <p className="rounded-lg border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
          Please sign in to view this request.
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 px-6 pb-12 sm:px-10">
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          Loading request details...
        </p>
      </main>
    );
  }

  if (error && !request) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 px-6 pb-12 sm:px-10">
        <p className="rounded-lg border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </p>
      </main>
    );
  }

  if (!request) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 px-6 pb-12 sm:px-10">
        <p className="rounded-lg border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
          Request not found.
        </p>
      </main>
    );
  }

  const status = statusPresentation(request);
  const canSendReminder =
    request.status === "sent" ||
    request.status === "opened" ||
    request.status === "accepted";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 pb-12 sm:px-10">
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Reference request</p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              {request.institutionName}
            </h1>
            <p className="mt-1 text-sm text-muted">{request.programmeName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/dashboard/requests">Back to requests</Link>
            </Button>
            {canSendReminder ? (
              <Button type="button" disabled={reminding} onClick={sendReminder}>
                {reminding ? "Sending..." : "Send reminder"}
              </Button>
            ) : null}
            {request.status === "declined" ? (
              <Button asChild>
                <Link href="/dashboard/requests/new">
                  Choose another referee
                </Link>
              </Button>
            ) : null}
            {request.status === "submitted" ? (
              <Button type="button" disabled={thanking} onClick={sendThankYou}>
                {thanking ? "Sending..." : "Thank referee"}
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {actionMessage ? (
        <p className="rounded-lg border border-success/20 bg-green-50 px-4 py-3 text-sm text-success">
          {actionMessage}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">Status</h2>
        <p className="mt-2 text-sm font-medium text-foreground">
          {status.heading}
        </p>
        <p className="mt-1 text-sm text-muted">{status.detail}</p>
        <p className="mt-2 text-sm text-foreground">
          {deadlineLabel(request.deadlineAt)}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">
          Request readiness
        </h2>
        {readiness ? (
          <>
            <ul className="mt-3 space-y-1 text-sm text-foreground">
              <li>
                {readiness.checklist.refereeInformation ? "✓" : "○"} Referee
                information
              </li>
              <li>
                {readiness.checklist.applicationPurpose ? "✓" : "○"} Application
                purpose
              </li>
              <li>{readiness.checklist.deadline ? "✓" : "○"} Deadline</li>
              <li>
                {readiness.checklist.candidateContext ? "✓" : "○"} Candidate
                context
              </li>
              <li>
                {readiness.checklist.supportingInformation ? "✓" : "○"}{" "}
                Supporting information
              </li>
            </ul>
            {!readiness.ready ? (
              <p className="mt-2 text-sm text-muted">
                Missing: {missingFieldsLabel}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Readiness unavailable.</p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">
          Referee and context
        </h2>
        <p className="mt-2 text-sm text-foreground">
          Referee: {request.refereeName} ({request.refereeEmail})
        </p>
        <p className="mt-1 text-sm text-muted">
          Relationship: {request.refereeRelationship}
        </p>
        <p className="mt-3 text-sm font-medium text-foreground">Instructions</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
          {request.instructions || "No additional instructions provided."}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">
          Supporting documents
        </h2>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No supporting documents uploaded.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {documents.map((document) => (
              <li
                key={document.id}
                className="rounded-xl border border-border bg-background/70 p-3"
              >
                <p className="text-sm font-medium text-foreground">
                  {document.safeFilename}
                </p>
                <p className="text-xs text-muted">
                  {document.contentType} ·{" "}
                  {Math.ceil(document.sizeBytes / 1024)} KB
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">
          Request timeline
        </h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No timeline events yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-border bg-background/70 p-3"
              >
                <p className="text-sm font-medium text-foreground">
                  {eventLabel(event.eventType)}
                </p>
                <p className="text-xs text-muted">
                  {new Date(event.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function eventLabel(eventType: string) {
  const labels: Record<string, string> = {
    request_sent: "Request sent",
    request_opened: "Referee opened request",
    request_accepted: "Referee accepted request",
    request_declined: "Referee declined request",
    reference_submitted: "Reference submitted",
    manual_reminder_queued: "Reminder queued",
    thank_you_queued: "Thank-you note queued",
  };

  return labels[eventType] ?? eventType;
}
