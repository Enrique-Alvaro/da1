import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import type { DbUserRow } from "./auth.types";
import { ConflictError, ValidationError } from "../../shared/errors/httpErrors";

export type CreateUserInput = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  documentId: string;
  address: string;
  countryCode: string;
  documentFrontImageUrl: string;
  documentBackImageUrl: string;
};

function sqlErrorInfo(err: unknown): { number?: number } {
  const e = err as {
    number?: number;
    originalError?: { number?: number; info?: { number?: number } };
  };
  const n = e.number ?? e.originalError?.number ?? e.originalError?.info?.number;
  return { number: n };
}

export async function findUserByEmail(email: string): Promise<Pick<DbUserRow, "id"> | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("email", sql.NVarChar(320), email.toLowerCase())
    .query<{ id: string }>(`SELECT TOP (1) id FROM dbo.users WHERE email = @email`);
  const row = result.recordset[0];
  return row ? { id: row.id } : null;
}

export async function createUser(input: CreateUserInput): Promise<DbUserRow> {
  const pool = await getSqlPool();
  const req = pool.request();
  req.input("id", sql.UniqueIdentifier, input.id);
  req.input("first_name", sql.NVarChar(100), input.firstName);
  req.input("last_name", sql.NVarChar(100), input.lastName);
  req.input("email", sql.NVarChar(320), input.email);
  req.input("password_hash", sql.NVarChar(500), input.passwordHash);
  req.input("document_id", sql.NVarChar(80), input.documentId);
  req.input("address", sql.NVarChar(500), input.address);
  req.input("country_code", sql.NVarChar(2), input.countryCode);
  req.input("photo_url", sql.NVarChar(2000), null);
  req.input("document_front_image_url", sql.NVarChar(2000), input.documentFrontImageUrl);
  req.input("document_back_image_url", sql.NVarChar(2000), input.documentBackImageUrl);
  req.input("category", sql.NVarChar(20), "common");
  req.input("status", sql.NVarChar(30), "pending_verification");
  req.input("requires_password_change", sql.Bit, 1);
  req.input("bidding_blocked_until_resolved", sql.Bit, 0);
  req.input("account_service_suspended", sql.Bit, 0);

  try {
    const result = await req.query<DbUserRow>(`
      INSERT INTO dbo.users (
        id,
        first_name,
        last_name,
        email,
        password_hash,
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
      )
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
      VALUES (
        @id,
        @first_name,
        @last_name,
        @email,
        @password_hash,
        @document_id,
        @address,
        @country_code,
        @photo_url,
        @document_front_image_url,
        @document_back_image_url,
        @category,
        @status,
        @requires_password_change,
        @bidding_blocked_until_resolved,
        NULL,
        @account_service_suspended
      )
    `);
    const row = result.recordset[0];
    if (!row) {
      throw new Error("INSERT did not return OUTPUT row");
    }
    return row;
  } catch (err) {
    const { number } = sqlErrorInfo(err);
    if (number === 2627 || number === 2601) {
      throw new ConflictError("El email ya está registrado.");
    }
    if (number === 547) {
      throw new ValidationError(
        "El código de país no es válido o no está registrado en el sistema."
      );
    }
    throw err;
  }
}

/** Removes user after failed email delivery (compensating action). */
export async function deleteUserById(id: string): Promise<void> {
  const pool = await getSqlPool();
  await pool.request().input("id", sql.UniqueIdentifier, id).query(`DELETE FROM dbo.users WHERE id = @id`);
}
