import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { getCompanyClientId } from "../../config/env";

export type UserPurchaseRow = {
  registroId: number;
  auctionId: number;
  productoId: number;
  itemId: number | null;
  title: string | null;
  finalAmount: number;
  commissionAmount: number;
  currency: string | null;
};

export async function listPurchasesByCliente(clienteId: number): Promise<UserPurchaseRow[]> {
  const pool = await getSqlPool();
  const companyId = getCompanyClientId();
  const request = pool.request().input("cliente", sql.Int, clienteId);
  if (companyId !== null) {
    request.input("companyId", sql.Int, companyId);
  }
  const companyFilter = companyId !== null ? "AND rs.cliente <> @companyId" : "";
  const result = await request.query<UserPurchaseRow>(`
    SELECT
      rs.identificador AS registroId,
      rs.subasta AS auctionId,
      rs.producto AS productoId,
      (
        SELECT TOP (1) ic2.identificador
        FROM dbo.itemsCatalogo AS ic2
        INNER JOIN dbo.catalogos AS c2 ON c2.identificador = ic2.catalogo
        WHERE ic2.producto = rs.producto AND c2.subasta = rs.subasta
        ORDER BY ic2.identificador ASC
      ) AS itemId,
      p.descripcionCatalogo AS title,
      rs.importe AS finalAmount,
      rs.comision AS commissionAmount,
      s.moneda AS currency
    FROM dbo.registroDeSubasta AS rs
    INNER JOIN dbo.productos AS p ON p.identificador = rs.producto
    INNER JOIN dbo.subastas AS s ON s.identificador = rs.subasta
    WHERE rs.cliente = @cliente
      ${companyFilter}
    ORDER BY rs.identificador DESC
  `);
  return result.recordset;
}
