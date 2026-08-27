"use client";

import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { ReferenceRequest, RefereeContact } from "@/lib/requests";
import posthog from "posthog-js";
import { FormEvent, useEffect, useMemo, useState } from "react";

type CreateRequestResponse = { request: ReferenceRequest };
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
type ContactsResponse = { contacts: RefereeContact[] };

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
  const [contacts, setContacts] = useState<RefereeContact[]>([]);
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [applicationType, setApplicationType] = useState("");
  const [customPurpose, setCustomPurpose] = useState("");
  const [submissionMethod, setSubmissionMethod] = useState("");
  const [deadlineAt, setDeadlineAt] = useState("");
  const [preferredCompletionAt, setPreferredCompletionAt] = useState("");
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [candidateContext, setCandidateContext] = useState("");
  const [whyApplying, setWhyApplying] = useState("");
  const [relationshipContext, setRelationshipContext] = useState("");
  const [traits, setTraits] = useState("");
  const [achievements, setAchievements] = useState("");
  const [confidentialityMode, setConfidentialityMode] = useState<
    "confidential" | "non_confidential"
  >("confidential");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refereeLink, setRefereeLink] = useState("");
  const [tokenExpires, setTokenExpires] = useState("");
  const [serverMissingFields, setServerMissingFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedPurpose = useMemo(
    () =>
      applicationType === "other" ? customPurpose.trim() : applicationType,
    [applicationType, customPurpose],
  );

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    apiRequest<ContactsResponse>("/referee-contacts", { token })
      .then((data) => setContacts(data.contacts))
      .catch(() => setContacts([]));
  }, []);

  const localReadiness = useMemo(() => {
    const checklist = {
      refereeInformation:
        Boolean(refereeName.trim()) &&
        Boolean(refereeEmail.trim()) &&
        Boolean(refereeRelationship.trim()),
      applicationPurpose:
        Boolean(organization.trim()) &&
        Boolean(role.trim()) &&
        Boolean(selectedPurpose.trim()),
      deadline: Boolean(deadlineAt),
      candidateContext: Boolean(candidateContext.trim()),
      supportingInformation: Boolean(files && files.length > 0),
    };

    const missingFields = Object.entries(checklist)
      .filter(([, complete]) => !complete)
      .map(([field]) => field);

    return {
      checklist,
      missingFields,
      ready: missingFields.length === 0,
    };
  }, [
    refereeName,
    refereeEmail,
    refereeRelationship,
    organization,
    role,
    selectedPurpose,
    deadlineAt,
    candidateContext,
    files,
  ]);

  function nextStep() {
    if (step === 1) {
      if (
        !organization.trim() ||
        !role.trim() ||
        !applicationType ||
        !submissionMethod.trim() ||
        (countryCode.trim() && countryCode.trim().length !== 2)
      ) {
        setError("Please complete application details before continuing.");
        return;
      }
      if (applicationType === "other" && !customPurpose.trim()) {
        setError("Please enter a custom purpose.");
        return;
      }
    }
    if (step === 2) {
      if (
        !refereeName.trim() ||
        !refereeEmail.trim() ||
        !refereeRelationship.trim()
      ) {
        setError("Please complete referee details before continuing.");
        return;
      }
    }
    if (step === 3 && (!candidateContext.trim() || !whyApplying.trim())) {
      setError("Please add candidate context and why you are applying.");
      return;
    }
    if (step === 4 && (!deadlineAt || !preferredCompletionAt || !timezone)) {
      setError("Please complete the timing details before continuing.");
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
    if (!localReadiness.ready) {
      setError(
        `Complete the request packet before sending. Missing: ${formatMissingFields(localReadiness.missingFields)}.`,
      );
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setRefereeLink("");
    setTokenExpires("");
    setServerMissingFields([]);
    posthog.capture("request_started");

    try {
      const deadlineDate = new Date(deadlineAt);
      const preferredCompletionDate = new Date(preferredCompletionAt);
      const created = await apiRequest<CreateRequestResponse>("/requests", {
        method: "POST",
        token,
        body: {
          refereeName,
          refereeEmail,
          refereeRelationship,
          institutionName: organization,
          programmeName: role,
          opportunityType: selectedPurpose,
          deadlineAt: deadlineDate.toISOString(),
          instructions: candidateContext,
          confidentialityMode,
          organization,
          role,
          countryCode: countryCode.toUpperCase(),
          applicationType: selectedPurpose,
          submissionMethod,
          preferredCompletionAt: preferredCompletionDate.toISOString(),
          timezone,
          candidateContext,
          whyApplying,
          relationshipContext,
          traits,
          achievements,
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

      const readiness = await apiRequest<RequestReadinessResponse>(
        `/requests/${created.request.id}/readiness`,
        {
          token,
        },
      );

      if (!readiness.readiness.ready) {
        setServerMissingFields(readiness.readiness.missingFields);
        setError(
          `Your referee may need more context before writing a strong reference. Missing: ${formatMissingFields(readiness.readiness.missingFields)}.`,
        );
        return;
      }

      const sent = await apiRequest<SendRequestResponse>(
        `/requests/${created.request.id}/send`,
        {
          method: "POST",
          token,
        },
      );

      posthog.capture("request_completed");
      posthog.capture("request_readiness_completed");
      posthog.capture("request_sent");
      setMessage("Request created and sent successfully.");
      setRefereeLink(sent.refereeLink);
      setTokenExpires(sent.tokenExpires);
      setStep(5);
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 pb-12 sm:px-10">
      <section className="rounded-2xl border border-border bg-surface/90 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">
          Create request
        </h1>
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

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
      >
        {step === 1 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              1. About the application
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm text-foreground">
                  Organisation or institution
                </span>
                <input
                  required
                  value={organization}
                  onChange={(event) => setOrganization(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-foreground">
                  Programme or role
                </span>
                <input
                  required
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-foreground">
                What is this reference for?
              </span>
              <select
                required
                value={applicationType}
                onChange={(event) => setApplicationType(event.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 outline-none"
              >
                <option value="">Select one</option>
                {opportunityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {applicationType === "other" ? (
              <label className="block space-y-1">
                <span className="text-sm text-foreground">Custom purpose</span>
                <input
                  required
                  value={customPurpose}
                  onChange={(event) => setCustomPurpose(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                />
              </label>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm text-foreground">
                  ISO country code
                </span>
                <input
                  required
                  minLength={2}
                  maxLength={2}
                  value={countryCode}
                  onChange={(event) =>
                    setCountryCode(event.target.value.toUpperCase())
                  }
                  placeholder="GB"
                  className="w-full rounded-md border border-border px-3 py-2 uppercase outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-foreground">
                  Submission method
                </span>
                <select
                  required
                  value={submissionMethod}
                  onChange={(event) => setSubmissionMethod(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                >
                  <option value="">Select one</option>
                  <option value="email">Email</option>
                  <option value="portal">Application portal</option>
                  <option value="direct_upload">Direct upload</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              2. Your referee
            </h2>
            {contacts.length > 0 ? (
              <label className="block space-y-1">
                <span className="text-sm text-foreground">
                  Use a saved contact
                </span>
                <select
                  defaultValue=""
                  onChange={(event) => {
                    const contact = contacts.find(
                      (item) => item.id === event.target.value,
                    );
                    if (!contact) return;
                    setRefereeName(contact.name);
                    setRefereeEmail(contact.email);
                    setRefereeRelationship(contact.relationship);
                    setRelationshipContext(contact.relationship);
                    posthog.capture("referee_contact_selected");
                  }}
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                >
                  <option value="">Enter someone new</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} ({contact.email})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm text-foreground">Referee name</span>
                <input
                  required
                  value={refereeName}
                  onChange={(event) => setRefereeName(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-foreground">Referee email</span>
                <input
                  required
                  type="email"
                  value={refereeEmail}
                  onChange={(event) => setRefereeEmail(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-foreground">Relationship</span>
              <input
                required
                value={refereeRelationship}
                onChange={(event) => setRefereeRelationship(event.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 outline-none"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-foreground">
                Relationship context
              </span>
              <textarea
                required
                rows={3}
                value={relationshipContext}
                onChange={(event) => setRelationshipContext(event.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 outline-none"
              />
            </label>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              3. Supporting information
            </h2>
            <label className="block space-y-1">
              <span className="text-sm text-foreground">Candidate context</span>
              <textarea
                required
                value={candidateContext}
                onChange={(event) => setCandidateContext(event.target.value)}
                rows={5}
                maxLength={5000}
                className="w-full rounded-md border border-border px-3 py-2 outline-none"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-foreground">
                Why are you applying?
              </span>
              <textarea
                required
                rows={4}
                value={whyApplying}
                onChange={(event) => setWhyApplying(event.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 outline-none"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm text-foreground">
                  Traits to highlight
                </span>
                <textarea
                  rows={4}
                  value={traits}
                  onChange={(event) => setTraits(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-foreground">
                  Achievements to highlight
                </span>
                <textarea
                  rows={4}
                  value={achievements}
                  onChange={(event) => setAchievements(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-foreground">
                Supporting documents (optional)
              </span>
              <input
                type="file"
                multiple
                onChange={(event) => setFiles(event.target.files)}
                accept=".pdf,.doc,.docx,.txt"
                className="w-full rounded-md border border-border px-3 py-2"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm text-foreground">
                  Preferred completion
                </span>
                <input
                  required
                  type="datetime-local"
                  value={preferredCompletionAt}
                  onChange={(event) =>
                    setPreferredCompletionAt(event.target.value)
                  }
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm text-foreground">IANA timezone</span>
                <input
                  required
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  placeholder="Europe/London"
                  className="w-full rounded-md border border-border px-3 py-2 outline-none"
                />
              </label>
            </div>
            <fieldset className="space-y-2 rounded-lg border border-border p-4">
              <legend className="px-1 text-sm font-medium text-foreground">
                Reference confidentiality
              </legend>
              <label className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="confidentiality"
                  value="confidential"
                  checked={confidentialityMode === "confidential"}
                  onChange={() => setConfidentialityMode("confidential")}
                />
                <span>
                  <strong>Confidential.</strong> You will not be able to
                  download the submitted reference.
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="confidentiality"
                  value="non_confidential"
                  checked={confidentialityMode === "non_confidential"}
                  onChange={() => setConfidentialityMode("non_confidential")}
                />
                <span>
                  <strong>Shared with me.</strong> You can download the
                  submitted reference.
                </span>
              </label>
            </fieldset>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              4. Deadline
            </h2>
            <label className="block space-y-1">
              <span className="text-sm text-foreground">
                Deadline date and time
              </span>
              <input
                required
                type="datetime-local"
                value={deadlineAt}
                onChange={(event) => setDeadlineAt(event.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 outline-none"
              />
            </label>
            <p className="text-xs text-muted">
              Deadline is stored securely and shown in local time for each user.
            </p>
          </section>
        ) : null}

        {step === 5 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              5. Review and send
            </h2>
            <div className="rounded-xl border border-border bg-background/70 p-4 text-sm text-foreground">
              <p>
                <strong>Application:</strong> {organization} · {role}
              </p>
              <p className="mt-1">
                <strong>Purpose:</strong> {selectedPurpose}
              </p>
              <p className="mt-1">
                <strong>Referee:</strong> {refereeName} ({refereeEmail})
              </p>
              <p className="mt-1">
                <strong>Deadline:</strong>{" "}
                {deadlineAt ? new Date(deadlineAt).toLocaleString() : "Not set"}
              </p>
              <p className="mt-1">
                <strong>Confidentiality:</strong>{" "}
                {confidentialityMode === "confidential"
                  ? "Confidential"
                  : "Shared with me"}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-sm font-semibold text-foreground">
                Request readiness
              </p>
              <ul className="mt-2 space-y-1 text-sm text-foreground">
                <li>
                  {localReadiness.checklist.refereeInformation ? "✓" : "○"}{" "}
                  Referee information
                </li>
                <li>
                  {localReadiness.checklist.applicationPurpose ? "✓" : "○"}{" "}
                  Application purpose
                </li>
                <li>
                  {localReadiness.checklist.deadline ? "✓" : "○"} Deadline
                </li>
                <li>
                  {localReadiness.checklist.candidateContext ? "✓" : "○"}{" "}
                  Candidate context
                </li>
                <li>
                  {localReadiness.checklist.supportingInformation ? "✓" : "○"}{" "}
                  Supporting information
                </li>
              </ul>
              {!localReadiness.ready ? (
                <p className="mt-2 text-xs text-muted">
                  Missing: {formatMissingFields(localReadiness.missingFields)}
                </p>
              ) : null}
            </div>
            {serverMissingFields.length > 0 ? (
              <p className="text-xs text-muted">
                Server check missing: {formatMissingFields(serverMissingFields)}
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={step === 1 || loading}
            onClick={previousStep}
          >
            Back
          </Button>
          {step < 5 ? (
            <Button type="button" onClick={nextStep}>
              Continue
            </Button>
          ) : (
            <Button disabled={loading || !localReadiness.ready}>
              {loading
                ? "Submitting..."
                : localReadiness.ready
                  ? "Create and send request"
                  : "Complete packet to send"}
            </Button>
          )}
        </div>
      </form>

      {message ? (
        <p
          aria-live="polite"
          className="rounded-lg border border-success/20 bg-green-50 px-4 py-3 text-sm text-success"
        >
          {message}
        </p>
      ) : null}
      {refereeLink ? (
        <div className="space-y-2 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-sm font-medium text-foreground">
            Secure referee link
          </p>
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
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-error/20 bg-red-50 px-4 py-3 text-sm text-error"
        >
          {error}
        </p>
      ) : null}
    </main>
  );
}

function formatMissingFields(fields: string[]) {
  if (fields.length === 0) {
    return "none";
  }

  const labels: Record<string, string> = {
    refereeInformation: "referee information",
    applicationPurpose: "application purpose",
    deadline: "deadline",
    candidateContext: "candidate context",
    supportingInformation: "supporting information",
  };

  return fields.map((field) => labels[field] ?? field).join(", ");
}
