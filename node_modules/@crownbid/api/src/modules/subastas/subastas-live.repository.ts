import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";

export type BidHistoryRow = {
  identificador: number;
  item: number;
  importe: number;
  ganador: string | null;
  numeroPostor: number;
  cliente: number;
  personaNombre: string | null;
};

export type WinningBidRow = {
  identificador: number;
  importe: number;
  cliente: number;
  numeroPostor: number;
};

export async function listBidHistoryBySubasta(
  subastaId: number,
  itemId?: number
): Promise<BidHistoryRow[]> {
  const pool = await getSqlPool();
  const request = pool.request().input("subastaId", sql.Int, subastaId);
  let itemFilter = "";
  if (itemId !== undefined) {
    request.input("itemId", sql.Int, itemId);
    itemFilter = "AND ic.identificador = @itemId";
  }
  const result = await request.query<BidHistoryRow>(`
    SELECT
      pj.identificador,
      pj.item,
      pj.importe,
      pj.ganador,
      a.numeroPostor,
      a.cliente,
      per.nombre AS personaNombre
    FROM dbo.pujos AS pj
    INNER JOIN dbo.asistentes AS a ON a.identificador = pj.asistente
    INNER JOIN dbo.itemsCatalogo AS ic ON ic.identificador = pj.item
    INNER JOIN dbo.catalogos AS cat ON cat.identificador = ic.catalogo
    LEFT JOIN dbo.personas AS per ON per.identificador = a.cliente
    WHERE cat.subasta = @subastaId
      ${itemFilter}
    ORDER BY pj.identificador DESC
  `);
  return result.recordset;
}

export async function findWinningBidForItem(itemId: number): Promise<WinningBidRow | null> {
  const pool = await getSqlPool();
  const result = await pool.request().input("itemId", sql.Int, itemId).query<WinningBidRow>(`
    SELECT TOP (1)
      pj.identificador,
      pj.importe,
      a.cliente,
      a.numeroPostor
    FROM dbo.pujos AS pj
    INNER JOIN dbo.asistentes AS a ON a.identificador = pj.asistente
    WHERE pj.item = @itemId
    ORDER BY pj.importe DESC, pj.identificador DESC
  `);
  return result.recordset[0] ?? null;
}

export async function getMaxBidForAuction(subastaId: number): Promise<number | null> {
  const pool = await getSqlPool();
  const result = await pool.request().input("subastaId", sql.Int, subastaId).query<{ maxBid: number | null }>(`
    SELECT MAX(pj.importe) AS maxBid
    FROM dbo.pujos AS pj
    INNER JOIN dbo.itemsCatalogo AS ic ON ic.identificador = pj.item
    INNER JOIN dbo.catalogos AS cat ON cat.identificador = ic.catalogo
    WHERE cat.subasta = @subastaId
  `);
  const v = result.recordset[0]?.maxBid;
  return v != null ? Number(v) : null;
}
