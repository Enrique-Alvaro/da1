import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import type { DbClientCredentialLoginRow } from "./auth.types";

export type PasswordResetTokenRow = {
  identificador: number;
  persona_id: number;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
};

export async function createPasswordResetToken(input: {
  personaId: number;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  const pool = await getSqlPool();
  await pool
    .request()
    .input("persona_id", sql.Int, input.personaId)
    .input("token_hash", sql.NVarChar(200), input.tokenHash)
    .input("expires_at", sql.DateTime2, input.expiresAt)
    .query(`
      INSERT INTO dbo.cliente_password_reset_tokens (persona_id, token_hash, expires_at)
      VALUES (@persona_id, @token_hash, @expires_at)
    `);
}

export async function findValidPasswordResetToken(
  tokenHash: string
): Promise<PasswordResetTokenRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("token_hash", sql.NVarChar(200), tokenHash)
    .query<PasswordResetTokenRow>(`
      SELECT TOP (1)
        identificador,
        persona_id,
        token_hash,
        expires_at,
        used_at
      FROM dbo.cliente_password_reset_tokens
      WHERE token_hash = @token_hash
        AND used_at IS NULL
        AND expires_at > SYSUTCDATETIME()
      ORDER BY identificador DESC
    `);
  return result.recordset[0] ?? null;
}

export async function completePasswordReset(params: {
  personaId: number;
  passwordHash: string;
  tokenHash: string;
}): Promise<DbClientCredentialLoginRow> {
  const pool = await getSqlPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const reqCred = new sql.Request(tx);
    reqCred.input("persona_id", sql.Int, params.personaId);
    reqCred.input("password_hash", sql.NVarChar(500), params.passwordHash);
    const credResult = await reqCred.query<DbClientCredentialLoginRow>(`
      UPDATE dbo.cliente_credenciales
      SET
        password_hash = @password_hash,
        requires_password_change = 0,
        updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.persona_id, INSERTED.email, INSERTED.password_hash, INSERTED.requires_password_change
      WHERE persona_id = @persona_id
    `);

    const credRow = credResult.recordset[0];
    if (!credRow) {
      throw new Error("Credencial no encontrada al restablecer contraseña.");
    }

    const reqToken = new sql.Request(tx);
    reqToken.input("token_hash", sql.NVarChar(200), params.tokenHash);
    await reqToken.query(`
      UPDATE dbo.cliente_password_reset_tokens
      SET used_at = SYSUTCDATETIME()
      WHERE token_hash = @token_hash AND used_at IS NULL
    `);

    await tx.commit();

    const full = await findCredentialByPersonaId(params.personaId);
    if (!full) {
      throw new Error("No se pudo cargar el perfil tras restablecer contraseña.");
    }
    return full;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function findCredentialByPersonaId(
  personaId: number
): Promise<DbClientCredentialLoginRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("persona_id", sql.Int, personaId)
    .query<DbClientCredentialLoginRow>(`
      SELECT TOP (1)
        cc.persona_id,
        cc.email,
        cc.password_hash,
        cc.requires_password_change,
        p.documento AS document_number,
        p.nombre AS full_name,
        p.direccion AS address,
        p.estado AS status,
        cl.numeroPais AS country_id,
        pa.nombre AS country_name,
        cl.admitido AS admitted,
        cl.categoria AS category
      FROM dbo.cliente_credenciales AS cc
      INNER JOIN dbo.personas AS p ON p.identificador = cc.persona_id
      INNER JOIN dbo.clientes AS cl ON cl.identificador = p.identificador
      LEFT JOIN dbo.paises AS pa ON pa.numero = cl.numeroPais
      WHERE cc.persona_id = @persona_id
    `);
  return result.recordset[0] ?? null;
}
