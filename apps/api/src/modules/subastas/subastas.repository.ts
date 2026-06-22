import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { NotFoundError } from "../../shared/errors/httpErrors";

export type SubastaRow = {
  identificador: number;
  fecha: Date | string | null;
  hora: Date | string | null;
  horaFin: Date | string | null;
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
  horaFin,
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
        s.horaFin,
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

export type CreateSubastaInput = {
  fecha: string;
  hora: string;
  horaFin: string;
  estado: string | null;
  subastador: number | null;
  ubicacion: string;
  capacidadAsistentes: number | null;
  tieneDeposito: string;
  seguridadPropia: string;
  categoria: string;
  moneda: string;
};

export type UpdateSubastaInput = Partial<CreateSubastaInput>;

export async function insertSubasta(input: CreateSubastaInput): Promise<SubastaRow> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("fecha", sql.Date, input.fecha)
    .input("hora", sql.VarChar(8), input.hora)
    .input("horaFin", sql.VarChar(8), input.horaFin)
    .input("estado", sql.VarChar(10), input.estado)
    .input("subastador", sql.Int, input.subastador)
    .input("ubicacion", sql.NVarChar(350), input.ubicacion)
    .input("capacidadAsistentes", sql.Int, input.capacidadAsistentes)
    .input("tieneDeposito", sql.VarChar(2), input.tieneDeposito)
    .input("seguridadPropia", sql.VarChar(2), input.seguridadPropia)
    .input("categoria", sql.NVarChar(10), input.categoria)
    .input("moneda", sql.VarChar(3), input.moneda)
    .query<SubastaRow>(`
      INSERT INTO dbo.subastas (
        fecha, hora, horaFin, estado, subastador, ubicacion,
        capacidadAsistentes, tieneDeposito, seguridadPropia, categoria, moneda
      )
      OUTPUT
        INSERTED.identificador,
        INSERTED.fecha,
        INSERTED.hora,
        INSERTED.horaFin,
        INSERTED.estado,
        INSERTED.subastador,
        INSERTED.ubicacion,
        INSERTED.capacidadAsistentes,
        INSERTED.tieneDeposito,
        INSERTED.seguridadPropia,
        INSERTED.categoria,
        INSERTED.moneda
      VALUES (
        @fecha, @hora, @horaFin, @estado, @subastador, @ubicacion,
        @capacidadAsistentes, @tieneDeposito, @seguridadPropia, @categoria, @moneda
      )
    `);
  const row = result.recordset[0];
  if (!row) {
    throw new Error("INSERT subastas did not return row");
  }
  return row;
}

export async function updateSubasta(
  identificador: number,
  input: UpdateSubastaInput
): Promise<SubastaRow> {
  const existing = await requireSubastaById(identificador);
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("identificador", sql.Int, identificador)
    .input("fecha", sql.Date, input.fecha ?? formatDateForSql(existing.fecha))
    .input("hora", sql.VarChar(8), input.hora ?? formatTimeForSql(existing.hora))
    .input("horaFin", sql.VarChar(8), input.horaFin ?? formatTimeForSql(existing.horaFin ?? existing.hora))
    .input("estado", sql.VarChar(10), input.estado ?? existing.estado)
    .input("subastador", sql.Int, input.subastador ?? existing.subastador)
    .input("ubicacion", sql.NVarChar(350), input.ubicacion ?? existing.ubicacion)
    .input("capacidadAsistentes", sql.Int, input.capacidadAsistentes ?? existing.capacidadAsistentes)
    .input("tieneDeposito", sql.VarChar(2), input.tieneDeposito ?? existing.tieneDeposito)
    .input("seguridadPropia", sql.VarChar(2), input.seguridadPropia ?? existing.seguridadPropia)
    .input("categoria", sql.NVarChar(10), input.categoria ?? existing.categoria)
    .input("moneda", sql.VarChar(3), input.moneda ?? existing.moneda ?? "ARS")
    .query<SubastaRow>(`
      UPDATE dbo.subastas
      SET
        fecha = @fecha,
        hora = @hora,
        horaFin = @horaFin,
        estado = @estado,
        subastador = @subastador,
        ubicacion = @ubicacion,
        capacidadAsistentes = @capacidadAsistentes,
        tieneDeposito = @tieneDeposito,
        seguridadPropia = @seguridadPropia,
        categoria = @categoria,
        moneda = @moneda
      OUTPUT
        INSERTED.identificador,
        INSERTED.fecha,
        INSERTED.hora,
        INSERTED.horaFin,
        INSERTED.estado,
        INSERTED.subastador,
        INSERTED.ubicacion,
        INSERTED.capacidadAsistentes,
        INSERTED.tieneDeposito,
        INSERTED.seguridadPropia,
        INSERTED.categoria,
        INSERTED.moneda
      WHERE identificador = @identificador
    `);
  const row = result.recordset[0];
  if (!row) {
    throw new NotFoundError("Subasta no encontrada.", "AUCTION_NOT_FOUND");
  }
  return row;
}

function formatDateForSql(value: Date | string | null): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value ?? "").slice(0, 10);
}

function formatTimeForSql(value: Date | string | null): string {
  if (value instanceof Date) {
    return value.toISOString().slice(11, 19);
  }
  const s = String(value ?? "").trim();
  return s.length >= 8 ? s.slice(0, 8) : s;
}
