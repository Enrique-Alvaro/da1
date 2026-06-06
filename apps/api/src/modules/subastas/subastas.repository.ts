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
  moneda: string | null;
};

export type SubastaDetailRow = SubastaRow & {
  subastadorNombre: string | null;
  subastadorMatricula: string | null;
  subastadorRegion: string | null;
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
  categoria,
  moneda
`;

/** Valores del esquema académico: abierta = en curso; carrada = cerrada. */
export const SUBASTA_ESTADO_ABIERTA = "abierta";

export type ListSubastasFilters = {
  featured?: boolean;
  status?: "scheduled" | "live" | "closed";
  category?: string;
  limit?: number;
};

function buildStatusFilter(status: ListSubastasFilters["status"]): string {
  if (!status) {
    return "";
  }
  if (status === "live") {
    return "AND LOWER(LTRIM(RTRIM(estado))) = N'abierta'";
  }
  if (status === "closed") {
    return "AND LOWER(LTRIM(RTRIM(estado))) = N'carrada'";
  }
  return "AND (estado IS NULL OR LOWER(LTRIM(RTRIM(estado))) NOT IN (N'abierta', N'carrada'))";
}

export async function listSubastas(filters: ListSubastasFilters = {}): Promise<SubastaRow[]> {
  const pool = await getSqlPool();
  const request = pool.request();
  if (filters.category) {
    request.input("categoria", sql.NVarChar(10), filters.category.trim().toLowerCase());
  }
  const statusClause = filters.status ? buildStatusFilter(filters.status) : "";
  const categoryClause = filters.category
    ? "AND LOWER(LTRIM(RTRIM(categoria))) = @categoria"
    : "";
  const featuredClause = filters.featured
    ? "AND LOWER(LTRIM(RTRIM(estado))) = N'abierta'"
    : "";
  const limit = filters.limit ?? (filters.featured ? 6 : undefined);
  const top = limit ? `TOP (${Math.min(limit, 50)})` : "";
  const order = filters.featured
    ? "ORDER BY fecha ASC, hora ASC, identificador ASC"
    : "ORDER BY identificador ASC";
  const result = await request.query<SubastaRow>(`
    SELECT ${top} ${SELECT_LIST}
    FROM dbo.subastas
    WHERE 1 = 1
      ${statusClause}
      ${categoryClause}
      ${featuredClause}
    ${order}
  `);
  return result.recordset;
}

export async function findSubastaById(identificador: number): Promise<SubastaRow | null> {
  const row = await findSubastaDetailById(identificador);
  return row;
}

export async function findSubastaDetailById(identificador: number): Promise<SubastaDetailRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("identificador", sql.Int, identificador)
    .query<SubastaDetailRow>(`
      SELECT TOP (1)
        s.identificador,
        s.fecha,
        s.hora,
        s.estado,
        s.subastador,
        s.ubicacion,
        s.capacidadAsistentes,
        s.tieneDeposito,
        s.seguridadPropia,
        s.categoria,
        s.moneda,
        p.nombre AS subastadorNombre,
        sub.matricula AS subastadorMatricula,
        sub.region AS subastadorRegion
      FROM dbo.subastas AS s
      LEFT JOIN dbo.subastadores AS sub ON sub.identificador = s.subastador
      LEFT JOIN dbo.personas AS p ON p.identificador = sub.identificador
      WHERE s.identificador = @identificador
    `);
  return result.recordset[0] ?? null;
}

export async function requireSubastaById(identificador: number): Promise<SubastaRow> {
  const row = await findSubastaDetailById(identificador);
  if (!row) {
    throw new NotFoundError("Subasta no encontrada.", "AUCTION_NOT_FOUND");
  }
  return row;
}

export async function requireSubastaDetailById(identificador: number): Promise<SubastaDetailRow> {
  const row = await findSubastaDetailById(identificador);
  if (!row) {
    throw new NotFoundError("Subasta no encontrada.", "AUCTION_NOT_FOUND");
  }
  return row;
}
