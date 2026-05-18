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

export async function listProductos(): Promise<ProductoRow[]> {
  const pool = await getSqlPool();
  const result = await pool.request().query<ProductoRow>(`
    SELECT ${SELECT_LIST}
    FROM dbo.productos
    ORDER BY identificador
  `);
  return result.recordset;
}

export async function findProductoById(identificador: number): Promise<ProductoRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("identificador", sql.Int, identificador)
    .query<ProductoRow>(`
      SELECT TOP (1) ${SELECT_LIST}
      FROM dbo.productos
      WHERE identificador = @identificador
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
