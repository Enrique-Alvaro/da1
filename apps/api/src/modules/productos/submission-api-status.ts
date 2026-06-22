import type { DerivedProductStatus } from "./producto-status";

/** Estados expuestos al contrato mobile/TPO (derivados, no persistidos). */
export type ApiSubmissionStatus =
  | "PENDING_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "ASSIGNED_TO_AUCTION"
  | "RETURNED"
  | "UNKNOWN";

export function toApiSubmissionStatus(derived: DerivedProductStatus): ApiSubmissionStatus {
  switch (derived) {
    case "pending_review":
      return "PENDING_REVIEW";
    case "rejected":
      return "REJECTED";
    case "approved":
      return "ACCEPTED";
    case "scheduled":
      return "ASSIGNED_TO_AUCTION";
    case "sold":
      return "ASSIGNED_TO_AUCTION";
    default:
      return "UNKNOWN";
  }
}
