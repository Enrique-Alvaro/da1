import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";

export async function countAsistenciasByCliente(clienteId: number): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool.request().input("cliente", sql.Int, clienteId).query<{ n: number }>(`
    SELECT COUNT_BIG(1) AS n FROM dbo.asistentes WHERE cliente = @cliente
  `);
  return Number(result.recordset[0]?.n ?? 0);
}

export async function countPujosByCliente(clienteId: number): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool.request().input("cliente", sql.Int, clienteId).query<{ n: number }>(`
    SELECT COUNT_BIG(1) AS n
    FROM dbo.pujos AS pj
    INNER JOIN dbo.asistentes AS a ON a.identificador = pj.asistente
    WHERE a.cliente = @cliente
  `);
  return Number(result.recordset[0]?.n ?? 0);
}

export async function sumPujosImporteByCliente(clienteId: number): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("cliente", sql.Int, clienteId)
    .query<{ total: number | null }>(`
    SELECT SUM(pj.importe) AS total
    FROM dbo.pujos AS pj
    INNER JOIN dbo.asistentes AS a ON a.identificador = pj.asistente
    WHERE a.cliente = @cliente
  `);
  return Number(result.recordset[0]?.total ?? 0);
}

export async function countWinsByCliente(clienteId: number): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool.request().input("cliente", sql.Int, clienteId).query<{ n: number }>(`
    SELECT COUNT_BIG(1) AS n
    FROM dbo.registroDeSubasta
    WHERE cliente = @cliente
  `);
  return Number(result.recordset[0]?.n ?? 0);
}

export async function sumWinsImporteByCliente(clienteId: number): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("cliente", sql.Int, clienteId)
    .query<{ total: number | null }>(`
    SELECT SUM(importe) AS total
    FROM dbo.registroDeSubasta
    WHERE cliente = @cliente
  `);
  return Number(result.recordset[0]?.total ?? 0);
}
