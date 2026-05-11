import type { DbUserRow } from "../auth/auth.types";

export type UserPublic = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  documentId: string;
  address: string;
  country: string;
  photoUrl: string | null;
  documentFrontImageUrl: string;
  documentBackImageUrl: string;
  category: string;
  status: string;
  biddingBlockedUntilResolved: boolean;
  delinquentWinId: string | null;
  accountServiceSuspended: boolean;
  requiresPasswordChange: boolean;
};

function bit(v: boolean | Buffer | undefined): boolean {
  if (Buffer.isBuffer(v)) {
    return v[0] === 1;
  }
  return Boolean(v);
}

/** Maps dbo.users row to API contract (never exposes password_hash). */
export function mapUserRowToApi(row: DbUserRow): UserPublic {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    documentId: row.document_id,
    address: row.address,
    country: row.country_code,
    photoUrl: row.photo_url,
    documentFrontImageUrl: row.document_front_image_url,
    documentBackImageUrl: row.document_back_image_url,
    category: row.category,
    status: row.status,
    biddingBlockedUntilResolved: bit(row.bidding_blocked_until_resolved),
    delinquentWinId: row.delinquent_win_id,
    accountServiceSuspended: bit(row.account_service_suspended),
    requiresPasswordChange: bit(row.requires_password_change),
  };
}
