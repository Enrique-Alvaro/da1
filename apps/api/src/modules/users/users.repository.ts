import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { NotFoundError } from "../../shared/errors/httpErrors";
import type { DbPersonaClienteProfileRow } from "../auth/auth.types";
import type { UserCategory } from "./user.mapper";

/** Fila mínima de dbo.clientes (PK = personas.identificador). */
export type ClienteIdentityRow = {
  identificador: number;
  admitido: string;
  categoria: string;
};

/**
 * Exige fila real en dbo.clientes. Usar cuando la operación es solo para clientes/postores.
 */
export async function findClienteByPersonId(
  personId: number
): Promise<ClienteIdentityRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("personaId", sql.Int, personId)
    .query<ClienteIdentityRow>(`
      SELECT TOP (1)
        identificador,
        admitido,
        categoria
      FROM dbo.clientes
      WHERE identificador = @personaId
    `);
  return result.recordset[0] ?? null;
}

/**
 * Perfil persona + cliente. INNER JOIN dbo.clientes garantiza que existe fila de cliente;
 * si no hay cliente, devuelve null (misma condición que findClienteByPersonId para persona registrada vía API).
 */
export async function findProfileByPersonId(personId: number): Promise<DbPersonaClienteProfileRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("id", sql.Int, personId)
    .query<DbPersonaClienteProfileRow>(`
      SELECT TOP (1)
        p.identificador AS id,
        p.documento AS document_number,
        p.nombre AS full_name,
        p.direccion AS address,
        p.estado AS status,
        c.numeroPais AS country_id,
        pa.nombre AS country_name,
        c.admitido AS admitted,
        c.categoria AS category,
        cc.email AS email
      FROM dbo.personas AS p
      INNER JOIN dbo.clientes AS c ON c.identificador = p.identificador
      LEFT JOIN dbo.paises AS pa ON pa.numero = c.numeroPais
      LEFT JOIN dbo.cliente_credenciales AS cc ON cc.persona_id = p.identificador
      WHERE p.identificador = @id
    `);
  return result.recordset[0] ?? null;
}

export type AdminClientDetailRow = {
  identificador: number;
  full_name: string;
  email: string | null;
  admitido: string;
  categoria: string;
  document_number: string;
  status: string;
  country_name: string | null;
  registered_at: Date | null;
  payment_method_count: number;
  verified_payment_method_count: number;
};

export type ListAdminClientsQuery = {
  admitido?: "si" | "no" | "all";
  search?: string;
  limit?: number;
  offset?: number;
};

export type AdminClientListRow = Omit<AdminClientDetailRow, "status">;

export async function listAdminClients(
  query: ListAdminClientsQuery = {}
): Promise<AdminClientListRow[]> {
  const pool = await getSqlPool();
  const request = pool.request();
  const filters: string[] = ["1 = 1"];

  const admitido = query.admitido ?? "all";
  if (admitido === "si") {
    filters.push("LOWER(LTRIM(RTRIM(c.admitido))) = N'si'");
  } else if (admitido === "no") {
    filters.push("LOWER(LTRIM(RTRIM(c.admitido))) <> N'si'");
  }

  if (query.search?.trim()) {
    request.input("search", sql.NVarChar(200), `%${query.search.trim()}%`);
    filters.push(
      "(cc.email LIKE @search OR p.nombre LIKE @search OR p.documento LIKE @search)"
    );
  }

  const limit = Math.min(query.limit ?? 50, 100);
  const offset = query.offset ?? 0;

  const result = await request.query<AdminClientListRow>(`
    SELECT
      c.identificador,
      p.nombre AS full_name,
      cc.email,
      c.admitido,
      c.categoria,
      p.documento AS document_number,
      pa.nombre AS country_name,
      cc.created_at AS registered_at,
      (
        SELECT COUNT_BIG(1)
        FROM dbo.mediosPago AS mp
        WHERE mp.cliente = c.identificador
      ) AS payment_method_count,
      (
        SELECT COUNT_BIG(1)
        FROM dbo.mediosPago AS mp
        WHERE mp.cliente = c.identificador AND mp.estado = N'verificado'
      ) AS verified_payment_method_count
    FROM dbo.clientes AS c
    INNER JOIN dbo.personas AS p ON p.identificador = c.identificador
    LEFT JOIN dbo.cliente_credenciales AS cc ON cc.persona_id = c.identificador
    LEFT JOIN dbo.paises AS pa ON pa.numero = c.numeroPais
    WHERE ${filters.join(" AND ")}
    ORDER BY cc.created_at DESC, c.identificador DESC
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
  `);
  return result.recordset;
}

export async function findAdminClientDetail(clienteId: number): Promise<AdminClientDetailRow | null> {
  const pool = await getSqlPool();
  const result = await pool.request().input("id", sql.Int, clienteId).query<AdminClientDetailRow>(`
    SELECT TOP (1)
      c.identificador,
      p.nombre AS full_name,
      cc.email,
      c.admitido,
      c.categoria,
      p.documento AS document_number,
      p.estado AS status,
      pa.nombre AS country_name,
      cc.created_at AS registered_at,
      (
        SELECT COUNT_BIG(1)
        FROM dbo.mediosPago AS mp
        WHERE mp.cliente = c.identificador
      ) AS payment_method_count,
      (
        SELECT COUNT_BIG(1)
        FROM dbo.mediosPago AS mp
        WHERE mp.cliente = c.identificador AND mp.estado = N'verificado'
      ) AS verified_payment_method_count
    FROM dbo.clientes AS c
    INNER JOIN dbo.personas AS p ON p.identificador = c.identificador
    LEFT JOIN dbo.cliente_credenciales AS cc ON cc.persona_id = c.identificador
    LEFT JOIN dbo.paises AS pa ON pa.numero = c.numeroPais
    WHERE c.identificador = @id
  `);
  return result.recordset[0] ?? null;
}

export async function updatePersonaProfile(input: {
  personId: number;
  address?: string | null;
  email?: string;
}): Promise<void> {
  const pool = await getSqlPool();
  if (input.address !== undefined) {
    await pool
      .request()
      .input("personId", sql.Int, input.personId)
      .input("address", sql.NVarChar(300), input.address ?? null)
      .query(`UPDATE dbo.personas SET direccion = @address WHERE identificador = @personId`);
  }
  if (input.email !== undefined) {
    await pool
      .request()
      .input("personId", sql.Int, input.personId)
      .input("email", sql.NVarChar(200), input.email)
      .query(`UPDATE dbo.cliente_credenciales SET email = @email WHERE persona_id = @personId`);
  }
}

export async function updateClienteAdmission(input: {
  clienteId: number;
  admitido: "si" | "no";
  categoria?: UserCategory;
}): Promise<ClienteIdentityRow> {
  const pool = await getSqlPool();
  const request = pool
    .request()
    .input("id", sql.Int, input.clienteId)
    .input("admitido", sql.NVarChar(2), input.admitido);

  if (input.categoria !== undefined) {
    request.input("categoria", sql.NVarChar(10), input.categoria);
    const result = await request.query(`
      UPDATE dbo.clientes
      SET admitido = @admitido, categoria = @categoria
      WHERE identificador = @id
    `);
    if ((result.rowsAffected[0] ?? 0) < 1) {
      throw new NotFoundError("Cliente no encontrado.", "CLIENT_NOT_FOUND");
    }
  } else {
    const result = await request.query(`
      UPDATE dbo.clientes
      SET admitido = @admitido
      WHERE identificador = @id
    `);
    if ((result.rowsAffected[0] ?? 0) < 1) {
      throw new NotFoundError("Cliente no encontrado.", "CLIENT_NOT_FOUND");
    }
  }

  const updated = await findClienteByPersonId(input.clienteId);
  if (!updated) {
    throw new NotFoundError("Cliente no encontrado.", "CLIENT_NOT_FOUND");
  }
  return updated;
}
