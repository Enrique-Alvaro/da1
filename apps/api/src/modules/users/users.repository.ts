import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import type { DbUserRow } from "../auth/auth.types";

export async function findUserById(userId: string): Promise<DbUserRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("id", sql.UniqueIdentifier, userId)
    .query<DbUserRow>(`
      SELECT TOP (1)
        id,
        first_name,
        last_name,
        email,
        document_id,
        address,
        country_code,
        photo_url,
        document_front_image_url,
        document_back_image_url,
        category,
        status,
        requires_password_change,
        bidding_blocked_until_resolved,
        delinquent_win_id,
        account_service_suspended
      FROM dbo.users
      WHERE id = @id
    `);
  const row = result.recordset[0];
  return row ?? null;
}
