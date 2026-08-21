"use client";

import { FormEvent, useMemo, useState } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { ReferenceRequest } from "@/lib/requests";

type CreateRequestResponse = { request: ReferenceRequest };
type UploadDocumentResponse = {
  document: { id: string; safeFilename: string; contentType: string; sizeBytes: number };
};
type SendRequestResponse = {
  request: ReferenceRequest;
  refereeLink: string;
  tokenExpires: string;
};

type Step = 1 | 2 | 3 | 4 | 5;
const TOTAL_STEPS = 5;

const opportunityOptions = [
  { value: "academic", label: "Academic" },
  { value: "employment", label: "Employment" },
  { value: "scholarship", label: "Scholarship" },
  { value: "fellowship", label: "Fellowship" },
  { value: "professional", label: "Professional" },
  { value: "research", label: "Research" },
  { value: "grant", label: "Grant" },
  { value: "membership", label: "Membership" },
  { value: "other", label: "Other" },
];

export default function NewRequestPage() {
  const [step, setStep] = useState<Step>(1);
  const [refereeName, setRefereeName] = useState("");
  const [refereeEmail, setRefereeEmail] = useState("");
  const [refereeRelationship, setRefereeRelationship] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [programmeName, setProgrammeName] = useState("");
  const [opportunityType, setOpportunityType] = useState("");
  const [customPurpose, setCustomPurpose] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [instructions, setInstructions] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refereeLink, setRefereeLink] = useState("");
  const [tokenExpires, setTokenExpires] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedPurpose = useMemo(
    () => (opportunityType === "other" ? customPurpose.trim() : opportunityType),
    [opportunityType, customPurpose],
  );

  function nextStep() {
    if (step === 1) {
      if (!institutionName.trim() || !programmeName.trim() || !opportunityType) {
        setError("Please complete application details before continuing.");
        return;
      }
      if (opportunityType === "other" && !customPurpose.trim()) {
        setError("Please enter a custom purpose.");
        return;
      }
    }
    if (step === 2) {
      if (!refereeName.trim() || !refereeEmail.trim() || !refereeRelationship.trim()) {
        setError("Please complete referee details before continuing.");
        return;
      }
    }
    if (step === 4 && !deadlineAt) {
      setError("Please set a deadline before continuing.");
      return;
    }
    setError("");
    setStep((current) => Math.min(TOTAL_STEPS, current + 1) as Step);
  }

  function previousStep() {
    setError("");
    setStep((current) => Math.max(1, current - 1) as Step);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAuthToken();
    if (!token) {
      setError("Please sign in to create a request.");
      return;
    }
    if (!selectedPurpose) {
      setError("Please choose what this reference is for.");
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
          opportunityType: selectedPurpose,
          deadlineAt: deadlineDate.toISOString(),
          instructions,
        },
      });

      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          const payload = new FormData();
          payload.append("file", file);
          await apiRequest<UploadDocumentResponse>(`/requests/${created.request.id}/documents`, {
            method: "POST",
            token,
            body: payload,
          });
        }
      }

      const sent = await apiRequest<SendRequestResponse>(`/requests/${created.request.id}/send`, {
        method: "POST",
        token,
      });

      posthog.capture("request_created");
      posthog.capture("request_sent");
      posthog.capture("email_invitation_sent");
      setMessage("Request created and sent successfully.");
      setRefereeLink(sent.refereeLink);
      setTokenExpires(sent.tokenExpires);
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create or send the request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 pb-12 sm:px-10">
      <section className="rounded-2xl border border-border bg-surface/90 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Create request</h1>
        <p className="mt-1 text-sm text-muted">
          Step {step} of {TOTAL_STEPS}. Build once, send once, track clearly.
        </p>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <span
              key={index}
              className={`h-2 rounded-full ${index + 1 <= step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        {step === 1 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">1. About the application</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm text-foreground">Organisation or institution</span>
                <input required value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} className="w-full rounded-md border border-border px-3 py-2 outline-none" />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-foreground">Programme or role</span>
                <input required value={programmeName} onChange={(event) => setProgrammeName(event.target.value)} className="w-full rounded-md border border-border px-3 py-2 outline-none" />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-foreground">What is this reference for?</span>
              <select required value={opportunityType} onChange={(event) => setOpportunityType(event.target.value)} className="w-full rounded-md border border-border px-3 py-2 outline-none">
                <option value="">Select one</option>
                {opportunityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {opportunityType === "other" ? (
              <label className="block space-y-1">
                <span className="text-sm text-foreground">Custom purpose</span>
                <input required value={customPurpose} onChange={(event) => setCustomPurpose(event.target.value)} className="w-full rounded-md border border-border px-3 py-2 outline-none" />
              </label>
            ) : null}
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">2. Your referee</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm text-foreground">Referee name</span>
                <input required value={refereeName} onChange={(event) => setRefereeName(event.target.value)} className="w-full rounded-md border border-border px-3 py-2 outline-none" />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-foreground">Referee email</span>
                <input required type="email" value={refereeEmail} onChange={(event) => setRefereeEmail(event.target.value)} className="w-full rounded-md border border-border px-3 py-2 outline-none" />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-foreground">Relationship</span>
              <input required value={refereeRelationship} onChange={(event) => setRefereeRelationship(event.target.value)} className="w-full rounded-md border border-border px-3 py-2 outline-none" />
            </label>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">3. Supporting information</h2>
            <label className="block space-y-1">
              <span className="text-sm text-foreground">Instructions or context</span>
              <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={5} maxLength={5000} className="w-full rounded-md border border-border px-3 py-2 outline-none" />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-foreground">Supporting documents (optional)</span>
              <input type="file" multiple onChange={(event) => setFiles(event.target.files)} accept=".pdf,.doc,.docx,.txt" className="w-full rounded-md border border-border px-3 py-2" />
            </label>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">4. Deadline</h2>
            <label className="block space-y-1">
              <span className="text-sm text-foreground">Deadline date and time</span>
              <input required type="datetime-local" value={deadlineAt} onChange={(event) => setDeadlineAt(event.target.value)} className="w-full rounded-md border border-border px-3 py-2 outline-none" />
            </label>
            <p className="text-xs text-muted">
              Deadline is stored securely and shown in local time for each user.
            </p>
          </section>
        ) : null}

        {step === 5 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">5. Review and send</h2>
            <div className="rounded-xl border border-border bg-background/70 p-4 text-sm text-foreground">
              <p><strong>Application:</strong> {institutionName} · {programmeName}</p>
              <p className="mt-1"><strong>Purpose:</strong> {selectedPurpose}</p>
              <p className="mt-1"><strong>Referee:</strong> {refereeName} ({refereeEmail})</p>
              <p className="mt-1"><strong>Deadline:</strong> {deadlineAt ? new Date(deadlineAt).toLocaleString() : "Not set"}</p>
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button type="button" variant="secondary" disabled={step === 1 || loading} onClick={previousStep}>
            Back
          </Button>
          {step < 5 ? (
            <Button type="button" onClick={nextStep}>
              Continue
            </Button>
          ) : (
            <Button disabled={loading}>
              {loading ? "Submitting..." : "Create and send request"}
            </Button>
          )}
        </div>
      </form>

      {message ? (
        <p className="rounded-lg border border-success/20 bg-green-50 px-4 py-3 text-sm text-success">{message}</p>
      ) : null}
      {refereeLink ? (
        <div className="space-y-2 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-sm font-medium text-foreground">Secure referee link</p>
          <a href={refereeLink} target="_blank" rel="noreferrer" className="break-all text-sm text-primary underline underline-offset-2">
            {refereeLink}
          </a>
          <p className="text-xs text-muted">Expires: {new Date(tokenExpires).toLocaleString()}</p>
        </div>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">{error}</p>
      ) : null}
    </main>
  );
}
