import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";

function sqlErrorNumber(err: unknown): number | undefined {
  const e = err as { number?: number; originalError?: { number?: number } };
  return e.number ?? e.originalError?.number;
}

/**
 * Persists revocation by JWT `jti` until `expires_at_utc`. Does not store the raw JWT.
 * Idempotent: duplicate `jwt_id` (unique) is ignored.
 */
export async function revokeToken(input: {
  tokenJti: string;
  userId: string;
  expiresAt: Date;
}): Promise<void> {
  const pool = await getSqlPool();
  try {
    await pool
      .request()
      .input("user_id", sql.UniqueIdentifier, input.userId)
      .input("jwt_id", sql.NVarChar(450), input.tokenJti)
      .input("expires_at_utc", sql.DateTime2, input.expiresAt)
      .input("reason", sql.NVarChar(200), "logout")
      .query(`
        INSERT INTO dbo.revoked_tokens (user_id, jwt_id, expires_at_utc, reason)
        VALUES (@user_id, @jwt_id, @expires_at_utc, @reason)
      `);
  } catch (err) {
    if (sqlErrorNumber(err) === 2627) {
      return;
    }
    throw err;
  }
}

export async function isTokenRevoked(tokenJti: string): Promise<boolean> {
  const t = tokenJti.trim();
  if (!t) {
    return true;
  }
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("jwt_id", sql.NVarChar(450), t)
    .query<{ n: number }>(`
      SELECT COUNT_BIG(1) AS n
      FROM dbo.revoked_tokens
      WHERE jwt_id = @jwt_id
    `);
  const n = result.recordset[0]?.n ?? 0;
  return n > 0;
}

/** Deletes expired revocation rows. Safe for occasional cron/maintenance. */
export async function cleanupExpiredRevokedTokens(): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool.request().query(`
    DELETE FROM dbo.revoked_tokens
    WHERE expires_at_utc < SYSUTCDATETIME()
  `);
  const affected = result.rowsAffected?.[0];
  return typeof affected === "number" ? affected : 0;
}
