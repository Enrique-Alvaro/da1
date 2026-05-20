import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import type { DbPersonaClienteProfileRow } from "../auth/auth.types";

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
