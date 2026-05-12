import sql from "mssql";
import { getEnv } from "../../config/env";
import { getSqlPool } from "../../db/sqlServer";
import type { DbClientCredentialLoginRow } from "./auth.types";
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
} from "../../shared/errors/httpErrors";

export type CreatePersonaClienteCredentialInput = {
  documentNumber: string;
  fullName: string;
  address: string | null;
  countryId: number;
  fotoBuffer: Buffer | null;
  email: string;
  passwordHash: string;
};

export type PersonaClienteCreated = {
  id: number;
  documentNumber: string;
  fullName: string;
  status: string;
  admitted: "si" | "no";
  category: "comun" | "especial" | "plata" | "oro" | "platino";
};

function sqlErrorInfo(err: unknown): { number?: number } {
  const e = err as {
    number?: number;
    originalError?: { number?: number; info?: { number?: number } };
  };
  const n = e.number ?? e.originalError?.number ?? e.originalError?.info?.number;
  return { number: n };
}

export function getConfiguredClientVerifierEmployeeId(): number {
  const v = getEnv().DEFAULT_CLIENT_VERIFIER_EMPLOYEE_ID;
  if (v === undefined || v === null || !Number.isFinite(v) || v <= 0) {
    throw new InternalServerError(
      "Configurá DEFAULT_CLIENT_VERIFIER_EMPLOYEE_ID en el entorno con el identificador de un empleado existente en la tabla empleados."
    );
  }
  return v;
}

/**
 * Alta cliente: personas + clientes + cliente_credenciales en una transacción.
 */
export async function createPersonaClienteCredential(
  input: CreatePersonaClienteCredentialInput
): Promise<PersonaClienteCreated> {
  const verifierId = getConfiguredClientVerifierEmployeeId();
  const pool = await getSqlPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const checkCountry = new sql.Request(tx);
    checkCountry.input("numero", sql.Int, input.countryId);
    const countryRes = await checkCountry.query<{ n: number }>(`
      SELECT COUNT_BIG(1) AS n FROM dbo.paises WHERE numero = @numero
    `);
    if ((countryRes.recordset[0]?.n ?? 0) < 1) {
      throw new BadRequestError("El país indicado no es válido.");
    }

    const checkDup = new sql.Request(tx);
    checkDup.input("documento", sql.NVarChar(20), input.documentNumber);
    const dupRes = await checkDup.query<{ n: number }>(`
      SELECT COUNT_BIG(1) AS n FROM dbo.personas WHERE documento = @documento
    `);
    if ((dupRes.recordset[0]?.n ?? 0) > 0) {
      throw new ConflictError("Ya existe una persona registrada con ese documento.");
    }

    const checkEmp = new sql.Request(tx);
    checkEmp.input("verificador", sql.Int, verifierId);
    const empRes = await checkEmp.query<{ n: number }>(`
      SELECT COUNT_BIG(1) AS n FROM dbo.empleados WHERE identificador = @verificador
    `);
    if ((empRes.recordset[0]?.n ?? 0) < 1) {
      throw new InternalServerError(
        "DEFAULT_CLIENT_VERIFIER_EMPLOYEE_ID no coincide con ningún empleado en la base de datos."
      );
    }

    const insP = new sql.Request(tx);
    insP.input("documento", sql.NVarChar(20), input.documentNumber);
    insP.input("nombre", sql.NVarChar(150), input.fullName);
    insP.input("direccion", sql.NVarChar(250), input.address);
    insP.input("foto", sql.VarBinary(sql.MAX), input.fotoBuffer);

    const insPersona = await insP.query<{ identificador: number }>(`
      INSERT INTO dbo.personas (documento, nombre, direccion, estado, foto)
      OUTPUT INSERTED.identificador AS identificador
      VALUES (@documento, @nombre, @direccion, N'activo', @foto)
    `);
    const personaId = insPersona.recordset[0]?.identificador;
    if (personaId === undefined || personaId === null) {
      throw new Error("INSERT personas did not return identificador");
    }

    const insC = new sql.Request(tx);
    insC.input("identificador", sql.Int, personaId);
    insC.input("numeroPais", sql.Int, input.countryId);
    insC.input("verificador", sql.Int, verifierId);
    await insC.query(`
      INSERT INTO dbo.clientes (identificador, numeroPais, admitido, categoria, verificador)
      VALUES (@identificador, @numeroPais, N'no', N'comun', @verificador)
    `);

    const insCred = new sql.Request(tx);
    insCred.input("persona_id", sql.Int, personaId);
    insCred.input("email", sql.NVarChar(320), input.email);
    insCred.input("password_hash", sql.NVarChar(500), input.passwordHash);
    await insCred.query(`
      INSERT INTO dbo.cliente_credenciales (persona_id, email, password_hash, requires_password_change)
      VALUES (@persona_id, @email, @password_hash, 1)
    `);

    await tx.commit();

    return {
      id: personaId,
      documentNumber: input.documentNumber,
      fullName: input.fullName,
      status: "activo",
      admitted: "no",
      category: "comun",
    };
  } catch (err) {
    try {
      await tx.rollback();
    } catch {
      /* transacción ya confirmada o rollback previo */
    }
    if (
      err instanceof BadRequestError ||
      err instanceof ConflictError ||
      err instanceof InternalServerError
    ) {
      throw err;
    }
    const { number } = sqlErrorInfo(err);
    if (number === 2627 || number === 2601) {
      throw new ConflictError(
        "Ya existe un registro con ese correo electrónico o número de documento."
      );
    }
    if (number === 547) {
      throw new BadRequestError("No se pudo completar el registro: conflicto de integridad referencial.");
    }
    throw err;
  }
}

const credentialJoinSelect = `
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
`;

export async function findCredentialByEmailWithPassword(
  email: string
): Promise<DbClientCredentialLoginRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("email", sql.NVarChar(320), email.toLowerCase())
    .query<DbClientCredentialLoginRow>(`${credentialJoinSelect} WHERE cc.email = @email`);
  return result.recordset[0] ?? null;
}

export async function findCredentialByPersonaIdWithPassword(
  personaId: number
): Promise<DbClientCredentialLoginRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("persona_id", sql.Int, personaId)
    .query<DbClientCredentialLoginRow>(`${credentialJoinSelect} WHERE cc.persona_id = @persona_id`);
  return result.recordset[0] ?? null;
}

export type CredentialFlagsRow = {
  requires_password_change: boolean | Buffer;
};

export async function findCredentialFlagsByPersonaId(
  personaId: number
): Promise<CredentialFlagsRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("persona_id", sql.Int, personaId)
    .query<CredentialFlagsRow>(`
      SELECT TOP (1) requires_password_change
      FROM dbo.cliente_credenciales
      WHERE persona_id = @persona_id
    `);
  return result.recordset[0] ?? null;
}

/**
 * Cambio inicial: actualiza hash y apaga requires_password_change.
 * Devuelve filas afectadas (0 si no estaba en estado “debe cambiar”).
 */
export async function updateClienteCredencialAfterInitialPassword(params: {
  personaId: number;
  newPasswordHash: string;
}): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("persona_id", sql.Int, params.personaId)
    .input("password_hash", sql.NVarChar(500), params.newPasswordHash)
    .query(`
      UPDATE dbo.cliente_credenciales
      SET
        password_hash = @password_hash,
        requires_password_change = 0,
        updated_at = SYSUTCDATETIME()
      WHERE persona_id = @persona_id AND requires_password_change = 1
    `);
  return result.rowsAffected[0] ?? 0;
}

/** Compensación tras fallo de correo post-registro. */
export async function deleteRegistrationCascade(personaId: number): Promise<void> {
  const pool = await getSqlPool();
  await pool.request().input("id", sql.Int, personaId).query(`
    DELETE FROM dbo.cliente_credenciales WHERE persona_id = @id
  `);
  await pool.request().input("id", sql.Int, personaId).query(`
    DELETE FROM dbo.clientes WHERE identificador = @id
  `);
  await pool.request().input("id", sql.Int, personaId).query(`
    DELETE FROM dbo.personas WHERE identificador = @id
  `);
}
