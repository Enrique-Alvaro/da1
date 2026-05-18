import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { NotFoundError } from "../../shared/errors/httpErrors";
import { throwIfSqlConstraintViolation } from "../../shared/db/sqlServerErrors";
import type { PaisesCreateBody, PaisesUpdateBody } from "./paises.schema";

export type PaisRow = {
  numero: number;
  nombre: string;
  nombreCorto: string | null;
  capital: string;
  nacionalidad: string;
  idiomas: string;
};

const SELECT_LIST = `
  numero,
  nombre,
  nombreCorto,
  capital,
  nacionalidad,
  idiomas
`;

export async function listPaises(): Promise<PaisRow[]> {
  const pool = await getSqlPool();
  const result = await pool.request().query<PaisRow>(`
    SELECT ${SELECT_LIST}
    FROM dbo.paises
    ORDER BY numero
  `);
  return result.recordset;
}

export async function findPaisByNumero(numero: number): Promise<PaisRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("numero", sql.Int, numero)
    .query<PaisRow>(`
      SELECT TOP (1) ${SELECT_LIST}
      FROM dbo.paises
      WHERE numero = @numero
    `);
  return result.recordset[0] ?? null;
}

export async function requirePaisByNumero(numero: number): Promise<PaisRow> {
  const row = await findPaisByNumero(numero);
  if (!row) {
    throw new NotFoundError("País no encontrado.");
  }
  return row;
}

export async function insertPais(body: PaisesCreateBody): Promise<PaisRow> {
  const pool = await getSqlPool();
  try {
    const result = await pool
      .request()
      .input("numero", sql.Int, body.numero)
      .input("nombre", sql.NVarChar(250), body.nombre)
      .input("nombreCorto", sql.NVarChar(250), body.nombreCorto ?? null)
      .input("capital", sql.NVarChar(250), body.capital)
      .input("nacionalidad", sql.NVarChar(250), body.nacionalidad)
      .input("idiomas", sql.NVarChar(150), body.idiomas)
      .query<PaisRow>(`
        INSERT INTO dbo.paises (numero, nombre, nombreCorto, capital, nacionalidad, idiomas)
        OUTPUT INSERTED.numero, INSERTED.nombre, INSERTED.nombreCorto, INSERTED.capital,
               INSERTED.nacionalidad, INSERTED.idiomas
        VALUES (@numero, @nombre, @nombreCorto, @capital, @nacionalidad, @idiomas)
      `);
    const row = result.recordset[0];
    if (!row) {
      throw new Error("INSERT paises did not return row");
    }
    return row;
  } catch (err) {
    throwIfSqlConstraintViolation(err, "Países");
    throw err;
  }
}

export async function updatePais(numero: number, body: PaisesUpdateBody): Promise<PaisRow> {
  const pool = await getSqlPool();
  try {
    const result = await pool
      .request()
      .input("numero", sql.Int, numero)
      .input("nombre", sql.NVarChar(250), body.nombre)
      .input("nombreCorto", sql.NVarChar(250), body.nombreCorto ?? null)
      .input("capital", sql.NVarChar(250), body.capital)
      .input("nacionalidad", sql.NVarChar(250), body.nacionalidad)
      .input("idiomas", sql.NVarChar(150), body.idiomas)
      .query<PaisRow>(`
        UPDATE dbo.paises
        SET
          nombre = @nombre,
          nombreCorto = @nombreCorto,
          capital = @capital,
          nacionalidad = @nacionalidad,
          idiomas = @idiomas
        OUTPUT INSERTED.numero, INSERTED.nombre, INSERTED.nombreCorto, INSERTED.capital,
                INSERTED.nacionalidad, INSERTED.idiomas
        WHERE numero = @numero
      `);
    const row = result.recordset[0];
    if (!row) {
      throw new NotFoundError("País no encontrado.");
    }
    return row;
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    throwIfSqlConstraintViolation(err, "Países");
    throw err;
  }
}

export async function deletePais(numero: number): Promise<void> {
  const pool = await getSqlPool();
  try {
    const result = await pool.request().input("numero", sql.Int, numero).query(`
      DELETE FROM dbo.paises WHERE numero = @numero
    `);
    const affected = result.rowsAffected[0] ?? 0;
    if (affected < 1) {
      throw new NotFoundError("País no encontrado.");
    }
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    throwIfSqlConstraintViolation(err, "Países");
    throw err;
  }
}
