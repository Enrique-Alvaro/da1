import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { NotFoundError } from "../../shared/errors/httpErrors";
import { throwIfSqlConstraintViolation } from "../../shared/db/sqlServerErrors";
import type { SectoresCreateBody, SectoresUpdateBody } from "./sectores.schema";

export type SectorRow = {
  identificador: number;
  nombreSector: string;
  codigoSector: string | null;
  responsableSector: number | null;
};

const SELECT_LIST = `
  identificador,
  nombreSector,
  codigoSector,
  responsableSector
`;

export async function listSectores(): Promise<SectorRow[]> {
  const pool = await getSqlPool();
  const result = await pool.request().query<SectorRow>(`
    SELECT ${SELECT_LIST}
    FROM dbo.sectores
    ORDER BY identificador
  `);
  return result.recordset;
}

export async function findSectorById(identificador: number): Promise<SectorRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("identificador", sql.Int, identificador)
    .query<SectorRow>(`
      SELECT TOP (1) ${SELECT_LIST}
      FROM dbo.sectores
      WHERE identificador = @identificador
    `);
  return result.recordset[0] ?? null;
}

export async function requireSectorById(identificador: number): Promise<SectorRow> {
  const row = await findSectorById(identificador);
  if (!row) {
    throw new NotFoundError("Sector no encontrado.");
  }
  return row;
}

export async function insertSector(body: SectoresCreateBody): Promise<SectorRow> {
  const pool = await getSqlPool();
  try {
    const result = await pool
      .request()
      .input("nombreSector", sql.NVarChar(150), body.nombreSector)
      .input("codigoSector", sql.NVarChar(10), body.codigoSector ?? null)
      .input("responsableSector", sql.Int, body.responsableSector ?? null)
      .query<SectorRow>(`
        INSERT INTO dbo.sectores (nombreSector, codigoSector, responsableSector)
        OUTPUT INSERTED.identificador, INSERTED.nombreSector, INSERTED.codigoSector,
               INSERTED.responsableSector
        VALUES (@nombreSector, @codigoSector, @responsableSector)
      `);
    const row = result.recordset[0];
    if (!row) {
      throw new Error("INSERT sectores did not return row");
    }
    return row;
  } catch (err) {
    throwIfSqlConstraintViolation(err, "Sectores");
    throw err;
  }
}

export async function updateSector(
  identificador: number,
  body: SectoresUpdateBody
): Promise<SectorRow> {
  const pool = await getSqlPool();
  try {
    const result = await pool
      .request()
      .input("identificador", sql.Int, identificador)
      .input("nombreSector", sql.NVarChar(150), body.nombreSector)
      .input("codigoSector", sql.NVarChar(10), body.codigoSector ?? null)
      .input("responsableSector", sql.Int, body.responsableSector ?? null)
      .query<SectorRow>(`
        UPDATE dbo.sectores
        SET
          nombreSector = @nombreSector,
          codigoSector = @codigoSector,
          responsableSector = @responsableSector
        OUTPUT INSERTED.identificador, INSERTED.nombreSector, INSERTED.codigoSector,
                INSERTED.responsableSector
        WHERE identificador = @identificador
      `);
    const row = result.recordset[0];
    if (!row) {
      throw new NotFoundError("Sector no encontrado.");
    }
    return row;
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    throwIfSqlConstraintViolation(err, "Sectores");
    throw err;
  }
}

export async function deleteSector(identificador: number): Promise<void> {
  const pool = await getSqlPool();
  try {
    const result = await pool
      .request()
      .input("identificador", sql.Int, identificador)
      .query(`
        DELETE FROM dbo.sectores WHERE identificador = @identificador
      `);
    const affected = result.rowsAffected[0] ?? 0;
    if (affected < 1) {
      throw new NotFoundError("Sector no encontrado.");
    }
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw err;
    }
    throwIfSqlConstraintViolation(err, "Sectores");
    throw err;
  }
}
