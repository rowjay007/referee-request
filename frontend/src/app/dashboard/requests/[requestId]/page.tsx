"use client";

import { Button } from "@/components/ui/button";
import { apiDownload, apiRequest } from "@/lib/api";
import { useAuthToken } from "@/lib/auth";
import {
  ReferenceRequest,
  RefereeInvitation,
  deadlineLabel,
  statusPresentation,
} from "@/lib/requests";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
type InvitationsResponse = { invitations: RefereeInvitation[] };
type RequestActionResponse = { request: ReferenceRequest };

type DraftFields = Pick<
  ReferenceRequest,
  | "refereeName"
  | "refereeEmail"
  | "refereeRelationship"
  | "organization"
  | "role"
  | "countryCode"
  | "applicationType"
  | "submissionMethod"
  | "timezone"
  | "candidateContext"
  | "whyApplying"
  | "relationshipContext"
  | "traits"
  | "achievements"
  | "confidentialityMode"
> & { deadlineAt: string; preferredCompletionAt: string };

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams<{ requestId: string }>();
  const requestId = params?.requestId ?? "";
  const token = useAuthToken();

  const [request, setRequest] = useState<ReferenceRequest | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [invitations, setInvitations] = useState<RefereeInvitation[]>([]);
  const [draft, setDraft] = useState<DraftFields | null>(null);
  const [readiness, setReadiness] = useState<
    RequestReadinessResponse["readiness"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [reminding, setReminding] = useState(false);
  const [thanking, setThanking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [replacementName, setReplacementName] = useState("");
  const [replacementEmail, setReplacementEmail] = useState("");
  const [replacementRelationship, setReplacementRelationship] = useState("");
  const [outcome, setOutcome] = useState("");
  const [outcomeNote, setOutcomeNote] = useState("");
  const [recordingOutcome, setRecordingOutcome] = useState(false);
  const [repeating, setRepeating] = useState(false);
  const [downloading, setDownloading] = useState(false);

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
      apiRequest<InvitationsResponse>(`/requests/${requestId}/invitations`, {
        token,
      }),
    ])
      .then(
        ([
          requestData,
          documentData,
          eventData,
          readinessData,
          invitationData,
        ]) => {
          setRequest(requestData.request);
          if (requestData.request.status === "submitted") {
            posthog.capture("request_completed", {
              request_id: requestData.request.id,
              opportunity_type: requestData.request.opportunityType,
              completed_before_deadline:
                requestData.request.submittedAt !== null &&
                new Date(requestData.request.submittedAt).getTime() <=
                  new Date(requestData.request.deadlineAt).getTime(),
            });
          }
          setDraft(toDraftFields(requestData.request));
          setDocuments(documentData.documents);
          setEvents(eventData.events);
          setReadiness(readinessData.readiness);
          setInvitations(invitationData.invitations);
          setOutcome(requestData.request.outcome ?? "");
          setOutcomeNote(requestData.request.outcomeNote ?? "");
        },
      )
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

  async function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !request || !draft) return;
    setSaving(true);
    setError("");
    setActionMessage("");
    try {
      const data = await apiRequest<RequestActionResponse>(
        `/requests/${requestId}`,
        {
          method: "PATCH",
          token,
          body: {
            ...draft,
            updatedAt: request.updatedAt,
            institutionName: draft.organization,
            programmeName: draft.role,
            opportunityType: draft.applicationType,
            instructions: draft.candidateContext,
            deadlineAt: new Date(draft.deadlineAt).toISOString(),
            preferredCompletionAt: new Date(
              draft.preferredCompletionAt,
            ).toISOString(),
            countryCode: draft.countryCode.toUpperCase(),
          },
        },
      );
      setRequest(data.request);
      setDraft(toDraftFields(data.request));
      setActionMessage("Draft changes saved.");
      posthog.capture("request_draft_updated");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update the draft.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function sendDraft() {
    if (!token || !requestId) return;
    setSending(true);
    setError("");
    try {
      const data = await apiRequest<{ request: ReferenceRequest }>(
        `/requests/${requestId}/send`,
        { method: "POST", token },
      );
      setRequest(data.request);
      setActionMessage("Request sent successfully.");
      posthog.capture("request_sent");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send the request.",
      );
    } finally {
      setSending(false);
    }
  }

  async function replaceReferee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setReplacing(true);
    setError("");
    try {
      const data = await apiRequest<RequestActionResponse>(
        `/requests/${requestId}/replace-referee`,
        {
          method: "POST",
          token,
          body: {
            name: replacementName,
            email: replacementEmail,
            relationship: replacementRelationship,
          },
        },
      );
      const history = await apiRequest<InvitationsResponse>(
        `/requests/${requestId}/invitations`,
        { token },
      );
      setRequest(data.request);
      setInvitations(history.invitations);
      setReplacementName("");
      setReplacementEmail("");
      setReplacementRelationship("");
      setActionMessage("Replacement referee invited on this request.");
      posthog.capture("referee_replaced");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not replace the referee.",
      );
    } finally {
      setReplacing(false);
    }
  }

  async function recordOutcome(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !outcome) return;
    setRecordingOutcome(true);
    setError("");
    try {
      const data = await apiRequest<RequestActionResponse>(
        `/requests/${requestId}/outcome`,
        {
          method: "PUT",
          token,
          body: { outcome, note: outcomeNote },
        },
      );
      setRequest(data.request);
      setActionMessage("Application outcome recorded.");
      posthog.capture("request_outcome_recorded", { outcome });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not record the outcome.",
      );
    } finally {
      setRecordingOutcome(false);
    }
  }

  async function repeatRequest() {
    if (!token) return;
    setRepeating(true);
    setError("");
    try {
      const data = await apiRequest<RequestActionResponse>(
        `/requests/${requestId}/repeat`,
        { method: "POST", token, body: {} },
      );
      posthog.capture("request_repeated");
      router.push(`/dashboard/requests/${data.request.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not repeat the request.",
      );
      setRepeating(false);
    }
  }

  async function downloadSubmittedReference() {
    if (!token) return;
    setDownloading(true);
    setError("");
    try {
      const file = await apiDownload(
        `/requests/${requestId}/submitted-reference`,
        token,
      );
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      posthog.capture("submitted_reference_downloaded");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not download the reference.",
      );
    } finally {
      setDownloading(false);
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
    request.status === "delivered" ||
    request.status === "opened" ||
    request.status === "accepted" ||
    request.status === "in_progress";
  const canReplaceReferee = ![
    "draft",
    "submitted",
    "cancelled",
    "expired",
  ].includes(request.status);

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
            {request.status === "submitted" ? (
              <Button type="button" disabled={thanking} onClick={sendThankYou}>
                {thanking ? "Sending..." : "Thank referee"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              disabled={repeating}
              onClick={repeatRequest}
            >
              {repeating ? "Creating..." : "Repeat request"}
            </Button>
          </div>
        </div>
      </section>

      {actionMessage ? (
        <p
          aria-live="polite"
          className="rounded-lg border border-success/20 bg-green-50 px-4 py-3 text-sm text-success"
        >
          {actionMessage}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-error/20 bg-red-50 px-4 py-3 text-sm text-error"
        >
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

      {request.status === "draft" && draft ? (
        <form
          onSubmit={saveDraft}
          className="space-y-5 rounded-2xl border border-border bg-surface p-5"
        >
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Edit draft
            </h2>
            <p className="mt-1 text-sm text-muted">
              Update the packet, save it, then send when it is ready.
            </p>
          </div>
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground">
              Application
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <DraftInput
                label="Organization"
                value={draft.organization}
                onChange={(organization) =>
                  setDraft({ ...draft, organization })
                }
              />
              <DraftInput
                label="Role or programme"
                value={draft.role}
                onChange={(role) => setDraft({ ...draft, role })}
              />
              <DraftInput
                label="ISO country code"
                value={draft.countryCode}
                maxLength={2}
                onChange={(countryCode) =>
                  setDraft({ ...draft, countryCode: countryCode.toUpperCase() })
                }
              />
              <DraftInput
                label="Application type"
                value={draft.applicationType}
                onChange={(applicationType) =>
                  setDraft({ ...draft, applicationType })
                }
              />
              <DraftInput
                label="Submission method"
                value={draft.submissionMethod}
                onChange={(submissionMethod) =>
                  setDraft({ ...draft, submissionMethod })
                }
              />
              <DraftInput
                label="IANA timezone"
                value={draft.timezone}
                onChange={(timezone) => setDraft({ ...draft, timezone })}
              />
              <DraftInput
                label="Deadline"
                type="datetime-local"
                value={draft.deadlineAt}
                onChange={(deadlineAt) => setDraft({ ...draft, deadlineAt })}
              />
              <DraftInput
                label="Preferred completion"
                type="datetime-local"
                value={draft.preferredCompletionAt}
                onChange={(preferredCompletionAt) =>
                  setDraft({ ...draft, preferredCompletionAt })
                }
              />
            </div>
          </fieldset>
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground">
              Referee
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <DraftInput
                label="Referee name"
                value={draft.refereeName}
                onChange={(refereeName) => setDraft({ ...draft, refereeName })}
              />
              <DraftInput
                label="Referee email"
                type="email"
                value={draft.refereeEmail}
                onChange={(refereeEmail) =>
                  setDraft({ ...draft, refereeEmail })
                }
              />
            </div>
            <DraftInput
              label="Relationship"
              value={draft.refereeRelationship}
              onChange={(refereeRelationship) =>
                setDraft({ ...draft, refereeRelationship })
              }
            />
            <DraftTextarea
              label="Relationship context"
              value={draft.relationshipContext}
              onChange={(relationshipContext) =>
                setDraft({ ...draft, relationshipContext })
              }
            />
          </fieldset>
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground">
              Reference context
            </legend>
            <DraftTextarea
              label="Candidate context"
              value={draft.candidateContext}
              onChange={(candidateContext) =>
                setDraft({ ...draft, candidateContext })
              }
            />
            <DraftTextarea
              label="Why you are applying"
              value={draft.whyApplying}
              onChange={(whyApplying) => setDraft({ ...draft, whyApplying })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <DraftTextarea
                label="Traits to highlight"
                value={draft.traits}
                onChange={(traits) => setDraft({ ...draft, traits })}
              />
              <DraftTextarea
                label="Achievements to highlight"
                value={draft.achievements}
                onChange={(achievements) =>
                  setDraft({ ...draft, achievements })
                }
              />
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">
              Confidentiality
            </legend>
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="draft-confidentiality"
                checked={draft.confidentialityMode === "confidential"}
                onChange={() =>
                  setDraft({ ...draft, confidentialityMode: "confidential" })
                }
              />{" "}
              Confidential; the submitted reference stays hidden from you.
            </label>
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="draft-confidentiality"
                checked={draft.confidentialityMode === "non_confidential"}
                onChange={() =>
                  setDraft({
                    ...draft,
                    confidentialityMode: "non_confidential",
                  })
                }
              />{" "}
              Non-confidential; you may download the submitted reference.
            </label>
          </fieldset>
          <div className="flex flex-wrap gap-3">
            <Button disabled={saving}>
              {saving ? "Saving..." : "Save draft"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={sending || saving}
              onClick={sendDraft}
            >
              {sending ? "Sending..." : "Send request"}
            </Button>
          </div>
        </form>
      ) : null}

      {canReplaceReferee ? (
        <form
          onSubmit={replaceReferee}
          className="space-y-4 rounded-2xl border border-border bg-surface p-5"
        >
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Replace referee
            </h2>
            <p className="mt-1 text-sm text-muted">
              The current invitation will be superseded and the request history
              will remain intact.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DraftInput
              label="New referee name"
              value={replacementName}
              onChange={setReplacementName}
            />
            <DraftInput
              label="New referee email"
              type="email"
              value={replacementEmail}
              onChange={setReplacementEmail}
            />
          </div>
          <DraftInput
            label="Relationship"
            value={replacementRelationship}
            onChange={setReplacementRelationship}
          />
          <Button disabled={replacing}>
            {replacing ? "Sending invitation..." : "Replace and invite"}
          </Button>
        </form>
      ) : null}

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
          {request.candidateContext ||
            request.instructions ||
            "No additional context provided."}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <DetailItem
            label="Application type"
            value={request.applicationType}
          />
          <DetailItem
            label="Submission method"
            value={request.submissionMethod}
          />
          <DetailItem label="Country" value={request.countryCode} />
          <DetailItem label="Timezone" value={request.timezone} />
          <DetailItem label="Why applying" value={request.whyApplying} />
          <DetailItem
            label="Relationship context"
            value={request.relationshipContext}
          />
          <DetailItem label="Traits" value={request.traits} />
          <DetailItem label="Achievements" value={request.achievements} />
          <DetailItem
            label="Confidentiality"
            value={
              request.confidentialityMode === "confidential"
                ? "Confidential"
                : "Non-confidential"
            }
          />
        </dl>
      </section>

      {request.status === "submitted" ? (
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Submitted reference
              </h2>
              <p className="mt-1 text-sm text-muted">
                Submitted{" "}
                {request.submittedAt
                  ? new Date(request.submittedAt).toLocaleString()
                  : "recently"}
                .
              </p>
            </div>
            {request.confidentialityMode === "non_confidential" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={downloading}
                onClick={downloadSubmittedReference}
              >
                {downloading ? "Downloading..." : "Download reference"}
              </Button>
            ) : null}
          </div>
          {request.confidentialityMode === "confidential" ? (
            <p className="text-sm text-muted">
              This reference is confidential and cannot be downloaded.
            </p>
          ) : null}
          <form
            onSubmit={recordOutcome}
            className="space-y-3 border-t border-border pt-4"
          >
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-foreground">
                Application outcome
              </legend>
              <label className="block space-y-1">
                <span className="text-sm text-foreground">Outcome</span>
                <select
                  required
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                >
                  <option value="">Select outcome</option>
                  <option value="successful">Successful</option>
                  <option value="unsuccessful">Unsuccessful</option>
                  <option value="withdrawn">Withdrawn</option>
                  <option value="unknown">Not known</option>
                </select>
              </label>
              <DraftTextarea
                label="Outcome note (optional)"
                required={false}
                value={outcomeNote}
                onChange={setOutcomeNote}
              />
            </fieldset>
            <Button disabled={recordingOutcome}>
              {recordingOutcome
                ? "Saving..."
                : request.outcome
                  ? "Update outcome"
                  : "Record outcome"}
            </Button>
          </form>
        </section>
      ) : null}

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
          Invitation history
        </h2>
        {invitations.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No invitations yet.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {invitations.map((invitation, index) => (
              <li key={invitation.id} className="border-l-2 border-border pl-4">
                <p className="text-sm font-medium text-foreground">
                  {invitation.refereeName} ({invitation.refereeEmail})
                  {index === 0 && !invitation.supersededAt ? " · Active" : ""}
                </p>
                <p className="text-xs text-muted">
                  Invited before{" "}
                  {new Date(invitation.expiresAt).toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {invitationStatus(invitation)}
                </p>
              </li>
            ))}
          </ol>
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
    invitation_delivered: "Invitation delivered",
    reference_in_progress: "Referee started the reference",
    referee_replaced: "Referee replaced",
    manual_reminder_queued: "Reminder queued",
    thank_you_queued: "Thank-you note queued",
  };

  return labels[eventType] ?? eventType;
}

function toDraftFields(request: ReferenceRequest): DraftFields {
  return {
    refereeName: request.refereeName,
    refereeEmail: request.refereeEmail,
    refereeRelationship: request.refereeRelationship,
    organization: request.organization,
    role: request.role,
    countryCode: request.countryCode,
    applicationType: request.applicationType,
    submissionMethod: request.submissionMethod,
    timezone: request.timezone,
    candidateContext: request.candidateContext,
    whyApplying: request.whyApplying,
    relationshipContext: request.relationshipContext,
    traits: request.traits,
    achievements: request.achievements,
    confidentialityMode: request.confidentialityMode,
    deadlineAt: toLocalDateTime(request.deadlineAt),
    preferredCompletionAt: toLocalDateTime(
      request.preferredCompletionAt ?? request.deadlineAt,
    ),
  };
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function DraftInput({
  label,
  value,
  onChange,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-foreground">{label}</span>
      <input
        required
        type={type}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-border px-3 py-2 outline-none"
      />
    </label>
  );
}

function DraftTextarea({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-foreground">{label}</span>
      <textarea
        required={required}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-border px-3 py-2 outline-none"
      />
    </label>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">
        {value || "Not provided"}
      </dd>
    </div>
  );
}

function invitationStatus(invitation: RefereeInvitation) {
  if (invitation.supersededAt)
    return `Superseded ${new Date(invitation.supersededAt).toLocaleString()}`;
  if (invitation.submittedAt)
    return `Submitted ${new Date(invitation.submittedAt).toLocaleString()}`;
  if (invitation.inProgressAt)
    return `In progress since ${new Date(invitation.inProgressAt).toLocaleString()}`;
  if (invitation.decision === "declined")
    return `Declined ${invitation.decidedAt ? new Date(invitation.decidedAt).toLocaleString() : ""}`;
  if (invitation.decision === "accepted")
    return `Accepted ${invitation.decidedAt ? new Date(invitation.decidedAt).toLocaleString() : ""}`;
  if (invitation.openedAt)
    return `Opened ${new Date(invitation.openedAt).toLocaleString()}`;
  if (invitation.deliveredAt)
    return `Delivered ${new Date(invitation.deliveredAt).toLocaleString()}`;
  return "Invitation queued";
}
