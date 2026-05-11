/** Row shape returned from dbo.users (INSERT OUTPUT / SELECT). */
export type DbUserRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  document_id: string;
  address: string;
  country_code: string;
  photo_url: string | null;
  document_front_image_url: string;
  document_back_image_url: string;
  category: string;
  status: string;
  requires_password_change: boolean | Buffer;
  bidding_blocked_until_resolved: boolean | Buffer;
  delinquent_win_id: string | null;
  account_service_suspended: boolean | Buffer;
};

/** Login query — includes hash for verification only; never expose to API. */
export type DbUserWithPasswordRow = DbUserRow & {
  password_hash: string;
};
