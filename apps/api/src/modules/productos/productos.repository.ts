import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { NotFoundError } from "../../shared/errors/httpErrors";

export type ProductoRow = {
  identificador: number;
  fecha: Date | string | null;
  disponible: string | null;
  descripcionCatalogo: string | null;
  descripcionCompleta: string;
  revisor: number;
  duenio: number;
  seguro: string | null;
};

const SELECT_LIST = `
  identificador,
  fecha,
  disponible,
  descripcionCatalogo,
  descripcionCompleta,
  revisor,
  duenio,
  seguro
`;

/** Solo productos aprobados (disponible = si). Los envíos pendientes no se listan aquí. */
export async function listProductos(): Promise<ProductoRow[]> {
  const pool = await getSqlPool();
  const result = await pool.request().query<ProductoRow>(`
    SELECT ${SELECT_LIST}
    FROM dbo.productos
    WHERE disponible = N'si'
    ORDER BY identificador
  `);
  return result.recordset;
}

/** Solo productos aprobados; pendientes se tratan como inexistentes en rutas públicas. */
export async function findProductoById(identificador: number): Promise<ProductoRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("identificador", sql.Int, identificador)
    .query<ProductoRow>(`
      SELECT TOP (1) ${SELECT_LIST}
      FROM dbo.productos
      WHERE identificador = @identificador
        AND disponible = N'si'
    `);
  return result.recordset[0] ?? null;
}

export async function requireProductoById(identificador: number): Promise<ProductoRow> {
  const row = await findProductoById(identificador);
  if (!row) {
    throw new NotFoundError("Producto no encontrado.");
  }
  return row;
}

export async function findProductPhotoBuffer(
  productId: number,
  photoId: number
): Promise<Buffer | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("producto", sql.Int, productId)
    .input("photoId", sql.Int, photoId)
    .query<{ foto: Buffer }>(`
      SELECT TOP (1) f.foto
      FROM dbo.fotos AS f
      INNER JOIN dbo.productos AS p ON p.identificador = f.producto
      WHERE f.identificador = @photoId
        AND f.producto = @producto
        AND p.disponible = N'si'
    `);
  const row = result.recordset[0];
  if (!row?.foto) {
    return null;
  }
  return Buffer.isBuffer(row.foto) ? row.foto : Buffer.from(row.foto);
}
