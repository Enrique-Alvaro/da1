import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { NotFoundError } from "../../shared/errors/httpErrors";

export type SubastaRow = {
  identificador: number;
  fecha: Date | string | null;
  hora: Date | string | null;
  estado: string | null;
  subastador: number | null;
  ubicacion: string | null;
  capacidadAsistentes: number | null;
  tieneDeposito: string | null;
  seguridadPropia: string | null;
  categoria: string | null;
};

const SELECT_LIST = `
  identificador,
  fecha,
  hora,
  estado,
  subastador,
  ubicacion,
  capacidadAsistentes,
  tieneDeposito,
  seguridadPropia,
  categoria
`;

export async function listSubastas(): Promise<SubastaRow[]> {
  const pool = await getSqlPool();
  const result = await pool.request().query<SubastaRow>(`
    SELECT ${SELECT_LIST}
    FROM dbo.subastas
    ORDER BY identificador
  `);
  return result.recordset;
}

export async function findSubastaById(identificador: number): Promise<SubastaRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("identificador", sql.Int, identificador)
    .query<SubastaRow>(`
      SELECT TOP (1) ${SELECT_LIST}
      FROM dbo.subastas
      WHERE identificador = @identificador
    `);
  return result.recordset[0] ?? null;
}

export async function requireSubastaById(identificador: number): Promise<SubastaRow> {
  const row = await findSubastaById(identificador);
  if (!row) {
    throw new NotFoundError("Subasta no encontrada.");
  }
  return row;
}
