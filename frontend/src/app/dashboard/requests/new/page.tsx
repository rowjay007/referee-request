"use client";

import { FormEvent, useState } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { ReferenceRequest } from "@/lib/requests";

type CreateRequestResponse = {
  request: ReferenceRequest;
};

type UploadDocumentResponse = {
  document: {
    id: string;
    safeFilename: string;
    contentType: string;
    sizeBytes: number;
  };
};

type SendRequestResponse = {
  request: ReferenceRequest;
  refereeLink: string;
  tokenExpires: string;
};

export default function NewRequestPage() {
  const [refereeName, setRefereeName] = useState("");
  const [refereeEmail, setRefereeEmail] = useState("");
  const [refereeRelationship, setRefereeRelationship] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [programmeName, setProgrammeName] = useState("");
  const [opportunityType, setOpportunityType] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [instructions, setInstructions] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refereeLink, setRefereeLink] = useState("");
  const [tokenExpires, setTokenExpires] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAuthToken();
    if (!token) {
      setError("Please sign in to create a request.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setRefereeLink("");
    setTokenExpires("");
    posthog.capture("request_creation_started");

    try {
      const deadlineDate = new Date(deadlineAt);
      const created = await apiRequest<CreateRequestResponse>("/requests", {
        method: "POST",
        token,
        body: {
          refereeName,
          refereeEmail,
          refereeRelationship,
          institutionName,
          programmeName,
          opportunityType,
          deadlineAt: deadlineDate.toISOString(),
          instructions,
        },
      });

      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          const payload = new FormData();
          payload.append("file", file);
          await apiRequest<UploadDocumentResponse>(
            `/requests/${created.request.id}/documents`,
            {
              method: "POST",
              token,
              body: payload,
            },
          );
        }
      }

      const sent = await apiRequest<SendRequestResponse>(
        `/requests/${created.request.id}/send`,
        {
        method: "POST",
        token,
        },
      );

      posthog.capture("request_created");
      posthog.capture("request_sent");
      posthog.capture("email_invitation_sent");
      setMessage("Request created and sent successfully.");
      setRefereeLink(sent.refereeLink);
      setTokenExpires(sent.tokenExpires);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create or send the request.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10 sm:px-10">
      <h1 className="text-2xl font-semibold text-foreground">
        Create reference request
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-border bg-surface p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm text-foreground">Referee full name</span>
            <input
              required
              value={refereeName}
              onChange={(event) => setRefereeName(event.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-foreground">Referee email</span>
            <input
              required
              type="email"
              value={refereeEmail}
              onChange={(event) => setRefereeEmail(event.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm text-foreground">Relationship</span>
          <input
            required
            value={refereeRelationship}
            onChange={(event) => setRefereeRelationship(event.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-primary"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm text-foreground">Institution or company</span>
            <input
              required
              value={institutionName}
              onChange={(event) => setInstitutionName(event.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-foreground">Programme or role</span>
            <input
              required
              value={programmeName}
              onChange={(event) => setProgrammeName(event.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm text-foreground">Opportunity type</span>
            <select
              required
              value={opportunityType}
              onChange={(event) => setOpportunityType(event.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-primary"
            >
              <option value="">Select one</option>
              <option value="university">University</option>
              <option value="scholarship">Scholarship</option>
              <option value="fellowship">Fellowship</option>
              <option value="job">Job</option>
              <option value="internship">Internship</option>
              <option value="professional">Professional opportunity</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-foreground">Deadline</span>
            <input
              required
              type="datetime-local"
              value={deadlineAt}
              onChange={(event) => setDeadlineAt(event.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-primary"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm text-foreground">Instructions or context</span>
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            rows={6}
            className="w-full rounded-md border border-border px-3 py-2 outline-none focus:border-primary"
            maxLength={5000}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-foreground">
            Supporting documents (PDF, DOC, DOCX, TXT)
          </span>
          <input
            type="file"
            multiple
            onChange={(event) => setFiles(event.target.files)}
            accept=".pdf,.doc,.docx,.txt"
            className="w-full rounded-md border border-border px-3 py-2"
          />
        </label>

        <Button disabled={loading} className="w-full">
          {loading ? "Submitting..." : "Create and send request"}
        </Button>
      </form>

      {message ? <p className="text-sm text-success">{message}</p> : null}
      {refereeLink ? (
        <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm font-medium text-foreground">Referee link</p>
          <a
            href={refereeLink}
            target="_blank"
            rel="noreferrer"
            className="break-all text-sm text-primary underline underline-offset-2"
          >
            {refereeLink}
          </a>
          <p className="text-xs text-muted">
            Expires: {new Date(tokenExpires).toLocaleString()}
          </p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </main>
  );
}
