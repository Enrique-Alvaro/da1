import type { AccessDenialCode } from "./subastas-access.service";

/** Códigos expuestos al contrato mobile/TPO (alias de códigos internos). */
export type PublicAccessDenialCode =
  | "USER_NOT_AUTHENTICATED"
  | "USER_NOT_ADMITTED"
  | "CATEGORY_NOT_ALLOWED"
  | "PAYMENT_METHOD_REQUIRED"
  | "PAYMENT_METHOD_NOT_VERIFIED"
  | "AUCTION_NOT_OPEN"
  | "LIVE_SESSION_REQUIRED"
  | "LIVE_SESSION_OTHER_AUCTION"
  | "CLIENT_NOT_FOUND"
  | "OWNER_CANNOT_BID"
  | "NONE";

export function toPublicAccessDenialCode(
  code: AccessDenialCode | null
): PublicAccessDenialCode | null {
  if (code === null) {
    return null;
  }
  switch (code) {
    case "AUTH_REQUIRED":
      return "USER_NOT_AUTHENTICATED";
    default:
      return code as PublicAccessDenialCode;
  }
}
