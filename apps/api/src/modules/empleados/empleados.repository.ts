import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { NotFoundError } from "../../shared/errors/httpErrors";

export type EmpleadoRow = {
  identificador: number;
  cargo: string | null;
  sector: number | null;
};

const SELECT_LIST = `identificador, cargo, sector`;

export async function listEmpleados(): Promise<EmpleadoRow[]> {
  const pool = await getSqlPool();
  const result = await pool.request().query<EmpleadoRow>(`
    SELECT ${SELECT_LIST}
    FROM dbo.empleados
    ORDER BY identificador
  `);
  return result.recordset;
}

export async function findEmpleadoById(identificador: number): Promise<EmpleadoRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("identificador", sql.Int, identificador)
    .query<EmpleadoRow>(`
      SELECT TOP (1) ${SELECT_LIST}
      FROM dbo.empleados
      WHERE identificador = @identificador
    `);
  return result.recordset[0] ?? null;
}

export async function requireEmpleadoById(identificador: number): Promise<EmpleadoRow> {
  const row = await findEmpleadoById(identificador);
  if (!row) {
    throw new NotFoundError("Empleado no encontrado.");
  }
  return row;
}
