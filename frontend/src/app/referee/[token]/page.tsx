"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";

type RefereeDocument = {
  id: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  downloadPath: string;
};

type RefereeRequestData = {
  candidateName: string;
  candidateEmail: string;
  refereeName: string;
  refereeEmail: string;
  refereeRelationship: string;
  institutionName: string;
  programmeName: string;
  opportunityType: string;
  deadlineAt: string;
  instructions: string;
  status: string;
  submittedAt: string | null;
  documents: RefereeDocument[];
};

type RefereeRequestResponse = {
  request: RefereeRequestData;
};

type SubmissionResponse = {
  submission: {
    id: string;
    submittedAt: string;
  };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function RefereePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [request, setRequest] = useState<RefereeRequestData | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    apiRequest<RefereeRequestResponse>(`/referee/${token}`)
      .then((data) => {
        setRequest(data.request);
        posthog.capture("referee_link_opened");
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load this referee request.",
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Please select a reference file to submit.");
      return;
    }
    if (!token) {
      setError("Invalid referee link.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    posthog.capture("reference_upload_started");

    try {
      const payload = new FormData();
      payload.append("referenceFile", file);
      const data = await apiRequest<SubmissionResponse>(`/referee/${token}/submit`, {
        method: "POST",
        body: payload,
      });
      setMessage(
        `Reference submitted successfully on ${new Date(data.submission.submittedAt).toLocaleString()}.`,
      );
      posthog.capture("reference_submitted");
      setRequest((current) =>
        current
          ? {
              ...current,
              status: "submitted",
              submittedAt: data.submission.submittedAt,
            }
          : current,
      );
      setFile(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit the reference.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 px-6 py-10 sm:px-10">
        <p className="text-sm text-muted">Loading request details...</p>
      </main>
    );
  }

  if (error && !request) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 px-6 py-10 sm:px-10">
        <p className="text-sm text-error">{error}</p>
      </main>
    );
  }

  if (!request) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 px-6 py-10 sm:px-10">
        <p className="text-sm text-error">Request not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Reference Request
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          {request.candidateName} is requesting your reference
        </h1>
        <p className="mt-2 text-sm text-muted">
          Please review the details below and submit your reference before{" "}
          <span className="font-medium text-foreground">
            {new Date(request.deadlineAt).toLocaleString()}
          </span>
          .
        </p>
      </header>

      <section className="grid gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2">
        <InfoItem label="Candidate" value={request.candidateName} />
        <InfoItem label="Candidate email" value={request.candidateEmail} />
        <InfoItem label="Institution or company" value={request.institutionName} />
        <InfoItem label="Programme or role" value={request.programmeName} />
        <InfoItem label="Opportunity type" value={request.opportunityType} />
        <InfoItem label="Relationship" value={request.refereeRelationship} />
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Instructions</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
          {request.instructions || "No additional instructions provided."}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Supporting documents</h2>
        {request.documents.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No supporting documents attached.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {request.documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{document.name}</p>
                  <p className="text-xs text-muted">
                    {document.contentType} · {Math.ceil(document.sizeBytes / 1024)} KB
                  </p>
                </div>
                <a
                  className="text-sm font-medium text-primary underline underline-offset-2"
                  href={`${API_BASE_URL}${document.downloadPath}`}
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Upload your reference</h2>
        {request.submittedAt ? (
          <p className="mt-2 text-sm text-success">
            Reference already submitted on{" "}
            {new Date(request.submittedAt).toLocaleString()}.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx,.txt"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-border px-3 py-2"
            />
            <Button disabled={submitting}>
              {submitting ? "Submitting..." : "Submit reference"}
            </Button>
          </form>
        )}
      </section>

      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}
