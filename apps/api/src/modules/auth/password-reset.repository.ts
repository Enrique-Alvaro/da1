import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { UnauthorizedError } from "../../shared/errors/httpErrors";
import type { DbUserRow } from "./auth.types";

export type PasswordResetRow = {
  id: string;
  user_id: string;
  expires_at_utc: Date;
  used_at_utc: Date | null;
};

export async function createPasswordResetToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  const pool = await getSqlPool();
  await pool
    .request()
    .input("user_id", sql.UniqueIdentifier, input.userId)
    .input("token_hash", sql.NVarChar(200), input.tokenHash)
    .input("expires_at_utc", sql.DateTime2, input.expiresAt)
    .query(`
      INSERT INTO dbo.password_reset_tokens (user_id, token_hash, expires_at_utc)
      VALUES (@user_id, @token_hash, @expires_at_utc)
    `);
}

export async function findResetTokenByHash(
  tokenHash: string
): Promise<PasswordResetRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("token_hash", sql.NVarChar(200), tokenHash)
    .query<PasswordResetRow>(`
      SELECT TOP (1)
        id,
        user_id,
        expires_at_utc,
        used_at_utc
      FROM dbo.password_reset_tokens
      WHERE token_hash = @token_hash
    `);
  return result.recordset[0] ?? null;
}

/**
 * Updates password and invalidates all pending reset tokens for the user (transaction).
 */
export async function completePasswordReset(params: {
  userId: string;
  passwordHash: string;
}): Promise<DbUserRow> {
  const pool = await getSqlPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const reqUser = new sql.Request(tx);
    reqUser.input("user_id", sql.UniqueIdentifier, params.userId);
    reqUser.input("password_hash", sql.NVarChar(500), params.passwordHash);
    const userResult = await reqUser.query<DbUserRow>(`
      UPDATE dbo.users
      SET
        password_hash = @password_hash,
        requires_password_change = 0,
        updated_at = SYSUTCDATETIME()
      OUTPUT
        INSERTED.id,
        INSERTED.first_name,
        INSERTED.last_name,
        INSERTED.email,
        INSERTED.document_id,
        INSERTED.address,
        INSERTED.country_code,
        INSERTED.photo_url,
        INSERTED.document_front_image_url,
        INSERTED.document_back_image_url,
        INSERTED.category,
        INSERTED.status,
        INSERTED.requires_password_change,
        INSERTED.bidding_blocked_until_resolved,
        INSERTED.delinquent_win_id,
        INSERTED.account_service_suspended
      WHERE id = @user_id
    `);
    const row = userResult.recordset[0];
    if (!row) {
      await tx.rollback();
      throw new UnauthorizedError("No autorizado.");
    }

    const reqMark = new sql.Request(tx);
    reqMark.input("user_id", sql.UniqueIdentifier, params.userId);
    await reqMark.query(`
      UPDATE dbo.password_reset_tokens
      SET used_at_utc = SYSUTCDATETIME()
      WHERE user_id = @user_id AND used_at_utc IS NULL
    `);

    await tx.commit();
    return row;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function cleanupExpiredPasswordResetTokens(): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool.request().query(`
    DELETE FROM dbo.password_reset_tokens
    WHERE expires_at_utc < SYSUTCDATETIME()
  `);
  const affected = result.rowsAffected?.[0];
  return typeof affected === "number" ? affected : 0;
}
