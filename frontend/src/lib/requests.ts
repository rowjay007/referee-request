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
