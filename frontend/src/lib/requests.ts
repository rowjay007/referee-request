export type ReferenceRequest = {
  id: string;
  activeInvitationId?: string | null;
  refereeName: string;
  refereeEmail: string;
  refereeRelationship: string;
  institutionName: string;
  programmeName: string;
  opportunityType: string;
  deadlineAt: string;
  instructions: string;
  confidentialityMode: "confidential" | "non_confidential";
  organization: string;
  role: string;
  countryCode: string;
  applicationType: string;
  submissionMethod: string;
  preferredCompletionAt: string | null;
  timezone: string;
  candidateContext: string;
  whyApplying: string;
  relationshipContext: string;
  traits: string;
  achievements: string;
  outcome: "successful" | "unsuccessful" | "withdrawn" | "unknown" | null;
  outcomeNote: string | null;
  outcomeAt: string | null;
  status:
    | "draft"
    | "sent"
    | "delivered"
    | "opened"
    | "accepted"
    | "in_progress"
    | "declined"
    | "submitted"
    | "cancelled"
    | "expired";
  sentAt: string | null;
  openedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RefereeContact = {
  id: string;
  name: string;
  email: string;
  relationship: string;
  createdAt: string;
  updatedAt: string;
};

export type RefereeInvitation = {
  id: string;
  refereeName: string;
  refereeEmail: string;
  refereeRelationship: string;
  expiresAt: string;
  deliveredAt: string | null;
  openedAt: string | null;
  decision: "accepted" | "declined" | null;
  decidedAt: string | null;
  inProgressAt: string | null;
  submittedAt: string | null;
  revokedAt: string | null;
  supersededAt: string | null;
};

export type RequestStatusPresentation = {
  heading: string;
  detail: string;
  tone: "neutral" | "warning" | "success";
};

export function statusMessage(request: ReferenceRequest) {
  if (request.status === "submitted" && request.submittedAt) {
    return `Reference submitted on ${new Date(request.submittedAt).toLocaleDateString()}.`;
  }

  if (request.status === "opened") {
    return `${request.refereeName} has opened your request.`;
  }

  if (request.status === "accepted") {
    return `${request.refereeName} accepted your request and has not started the reference yet.`;
  }

  if (request.status === "in_progress") {
    return `${request.refereeName} is working on your reference.`;
  }

  if (request.status === "declined") {
    return `${request.refereeName} declined this request.`;
  }

  if (request.status === "sent") {
    return `Your invitation to ${request.refereeName} is queued for delivery.`;
  }

  if (request.status === "delivered") {
    return `Your invitation was delivered to ${request.refereeName}.`;
  }

  if (request.status === "draft") {
    return "Draft saved. Send request when ready.";
  }

  if (request.status === "expired") {
    return "Request link expired before submission.";
  }

  if (request.status === "cancelled") {
    return "Request was cancelled.";
  }

  return "Status updated.";
}

export function statusPresentation(
  request: ReferenceRequest,
): RequestStatusPresentation {
  if (request.status === "submitted" && request.submittedAt) {
    return {
      heading: "Reference submitted",
      detail: `${request.refereeName} submitted on ${new Date(request.submittedAt).toLocaleDateString()}.`,
      tone: "success",
    };
  }

  if (request.status === "opened") {
    return {
      heading: `Waiting for ${request.refereeName}`,
      detail: `${request.refereeName} opened your request and has not decided yet.`,
      tone: "warning",
    };
  }

  if (request.status === "accepted") {
    return {
      heading: `Accepted by ${request.refereeName}`,
      detail: `${request.refereeName} accepted your request and has not started the reference yet.`,
      tone: "warning",
    };
  }

  if (request.status === "in_progress") {
    return {
      heading: "Reference in progress",
      detail: `${request.refereeName} has started working on your reference.`,
      tone: "warning",
    };
  }

  if (request.status === "declined") {
    return {
      heading: `Declined by ${request.refereeName}`,
      detail: `${request.refereeName} declined your request. Choose another referee to stay on track.`,
      tone: "warning",
    };
  }

  if (request.status === "sent") {
    return {
      heading: "Invitation queued",
      detail: `Your invitation to ${request.refereeName} is being delivered.`,
      tone: "warning",
    };
  }

  if (request.status === "delivered") {
    return {
      heading: "Invitation delivered",
      detail: `${request.refereeName} has not opened your request yet.`,
      tone: "warning",
    };
  }

  if (request.status === "draft") {
    return {
      heading: "Draft ready",
      detail: "Review and send when you are ready.",
      tone: "neutral",
    };
  }

  if (request.status === "expired") {
    return {
      heading: "Link expired",
      detail: "The secure link expired before submission.",
      tone: "warning",
    };
  }

  if (request.status === "cancelled") {
    return {
      heading: "Request cancelled",
      detail: "This request was cancelled.",
      tone: "neutral",
    };
  }

  return {
    heading: "Status updated",
    detail: "Request status changed.",
    tone: "neutral",
  };
}

export function daysUntilDeadline(deadlineAt: string) {
  const now = new Date();
  const deadline = new Date(deadlineAt);
  const ms = deadline.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function deadlineLabel(deadlineAt: string) {
  const days = daysUntilDeadline(deadlineAt);
  if (days < 0)
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due in 1 day";
  return `Due in ${days} days`;
}
