import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { NotFoundError } from "../../shared/errors/httpErrors";

export type CatalogItemRow = {
  identificador: number;
  catalogo: number;
  producto: number;
  precioBase: number;
  comision: number;
  subastado: string | null;
  descripcionCatalogo: string | null;
  descripcionCompleta: string;
  subastaId: number | null;
  catalogDescription: string | null;
  isSoldInRegistro: number;
  duenio: number | null;
};

export type ItemBidSummaryRow = {
  itemId: number;
  maxBid: number | null;
  bidCount: number;
};

const ITEM_SELECT = `
  ic.identificador,
  ic.catalogo,
  ic.producto,
  ic.precioBase,
  ic.comision,
  ic.subastado,
  p.descripcionCatalogo,
  p.descripcionCompleta,
  p.duenio,
  cat.subasta AS subastaId,
  cat.descripcion AS catalogDescription,
  CASE WHEN EXISTS (
    SELECT 1 FROM dbo.registroDeSubasta AS rs WHERE rs.producto = ic.producto
  ) THEN 1 ELSE 0 END AS isSoldInRegistro
`;

export async function listCatalogItemsBySubasta(subastaId: number): Promise<CatalogItemRow[]> {
  const pool = await getSqlPool();
  const result = await pool.request().input("subastaId", sql.Int, subastaId).query<CatalogItemRow>(`
    SELECT ${ITEM_SELECT}
    FROM dbo.itemsCatalogo AS ic
    INNER JOIN dbo.catalogos AS cat ON cat.identificador = ic.catalogo
    INNER JOIN dbo.productos AS p ON p.identificador = ic.producto
    WHERE cat.subasta = @subastaId
    ORDER BY ic.identificador ASC
  `);
  return result.recordset;
}

export async function findCatalogItemById(itemId: number): Promise<CatalogItemRow | null> {
  const pool = await getSqlPool();
  const result = await pool.request().input("itemId", sql.Int, itemId).query<CatalogItemRow>(`
    SELECT TOP (1) ${ITEM_SELECT}
    FROM dbo.itemsCatalogo AS ic
    INNER JOIN dbo.catalogos AS cat ON cat.identificador = ic.catalogo
    INNER JOIN dbo.productos AS p ON p.identificador = ic.producto
    WHERE ic.identificador = @itemId
  `);
  return result.recordset[0] ?? null;
}

export async function requireCatalogItemById(itemId: number): Promise<CatalogItemRow> {
  const row = await findCatalogItemById(itemId);
  if (!row) {
    throw new NotFoundError("Ítem no encontrado.", "ITEM_NOT_FOUND");
  }
  return row;
}

export async function listBidSummariesForSubasta(subastaId: number): Promise<ItemBidSummaryRow[]> {
  const pool = await getSqlPool();
  const result = await pool.request().input("subastaId", sql.Int, subastaId).query<ItemBidSummaryRow>(`
    SELECT
      ic.identificador AS itemId,
      MAX(pj.importe) AS maxBid,
      COUNT(pj.identificador) AS bidCount
    FROM dbo.itemsCatalogo AS ic
    INNER JOIN dbo.catalogos AS cat ON cat.identificador = ic.catalogo
    LEFT JOIN dbo.pujos AS pj ON pj.item = ic.identificador
    WHERE cat.subasta = @subastaId
    GROUP BY ic.identificador
  `);
  return result.recordset.map((r) => ({
    itemId: r.itemId,
    maxBid: r.maxBid != null ? Number(r.maxBid) : null,
    bidCount: Number(r.bidCount ?? 0),
  }));
}

export async function countCatalogItemsBySubasta(subastaId: number): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool.request().input("subastaId", sql.Int, subastaId).query<{ total: number }>(`
    SELECT COUNT(*) AS total
    FROM dbo.itemsCatalogo AS ic
    INNER JOIN dbo.catalogos AS cat ON cat.identificador = ic.catalogo
    WHERE cat.subasta = @subastaId
  `);
  return Number(result.recordset[0]?.total ?? 0);
}

export async function listPhotoIdsByProduct(productId: number): Promise<number[]> {
  const pool = await getSqlPool();
  const result = await pool.request().input("producto", sql.Int, productId).query<{ identificador: number }>(`
    SELECT identificador FROM dbo.fotos WHERE producto = @producto ORDER BY identificador ASC
  `);
  return result.recordset.map((r) => r.identificador);
}
