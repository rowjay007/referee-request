export type ReferenceRequest = {
  id: string;
  refereeName: string;
  refereeEmail: string;
  refereeRelationship: string;
  institutionName: string;
  programmeName: string;
  opportunityType: string;
  deadlineAt: string;
  instructions: string;
  status: "draft" | "sent" | "opened" | "submitted" | "cancelled" | "expired";
  sentAt: string | null;
  openedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
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

  if (request.status === "sent") {
    return `${request.refereeName} has not opened your request yet.`;
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

export function statusPresentation(request: ReferenceRequest): RequestStatusPresentation {
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
      detail: `${request.refereeName} opened your request and has not submitted yet.`,
      tone: "warning",
    };
  }

  if (request.status === "sent") {
    return {
      heading: `Waiting for ${request.refereeName}`,
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

  return { heading: "Status updated", detail: "Request status changed.", tone: "neutral" };
}

export function daysUntilDeadline(deadlineAt: string) {
  const now = new Date();
  const deadline = new Date(deadlineAt);
  const ms = deadline.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function deadlineLabel(deadlineAt: string) {
  const days = daysUntilDeadline(deadlineAt);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due in 1 day";
  return `Due in ${days} days`;
}
