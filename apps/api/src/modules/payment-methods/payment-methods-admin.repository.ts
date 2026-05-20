import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import type { MedioPagoRow } from "./payment-methods.repository";
import type { PaymentMethodStatusFilter } from "./payment-methods-admin.schema";

export type MedioPagoAdminListRow = MedioPagoRow & {
  client_name: string;
  client_email: string | null;
};

const MP_SELECT = `
  mp.identificador,
  mp.cliente,
  mp.tipo,
  mp.estado,
  mp.moneda,
  mp.titular,
  mp.entidad,
  mp.ultimosDigitos,
  mp.aliasOCbu,
  mp.montoGarantia,
  mp.montoDisponible,
  mp.motivoRechazo,
  mp.verificador,
  mp.creadoEn,
  mp.actualizadoEn,
  mp.verificadoEn
`;

export async function listForAdmin(
  status: PaymentMethodStatusFilter
): Promise<MedioPagoAdminListRow[]> {
  const pool = await getSqlPool();
  const request = pool.request();

  let whereClause = "";
  if (status !== "all") {
    request.input("estado", sql.VarChar(20), status);
    whereClause = "WHERE mp.estado = @estado";
  }

  const result = await request.query<MedioPagoAdminListRow>(`
    SELECT
      ${MP_SELECT},
      p.nombre AS client_name,
      cc.email AS client_email
    FROM dbo.mediosPago AS mp
    INNER JOIN dbo.clientes AS c ON c.identificador = mp.cliente
    INNER JOIN dbo.personas AS p ON p.identificador = c.identificador
    LEFT JOIN dbo.cliente_credenciales AS cc ON cc.persona_id = p.identificador
    ${whereClause}
    ORDER BY mp.identificador DESC
  `);
  return result.recordset;
}

export async function findById(id: number): Promise<MedioPagoRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .query<MedioPagoRow>(`
      SELECT TOP (1)
        identificador,
        cliente,
        tipo,
        estado,
        moneda,
        titular,
        entidad,
        ultimosDigitos,
        aliasOCbu,
        montoGarantia,
        montoDisponible,
        motivoRechazo,
        verificador,
        creadoEn,
        actualizadoEn,
        verificadoEn
      FROM dbo.mediosPago
      WHERE identificador = @id
    `);
  return result.recordset[0] ?? null;
}

export async function verifyById(
  id: number,
  verifierEmployeeId: number
): Promise<MedioPagoRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("verificador", sql.Int, verifierEmployeeId)
    .query<MedioPagoRow>(`
      UPDATE dbo.mediosPago
      SET
        estado = 'verificado',
        verificador = @verificador,
        verificadoEn = SYSUTCDATETIME(),
        actualizadoEn = SYSUTCDATETIME(),
        motivoRechazo = NULL
      OUTPUT INSERTED.*
      WHERE identificador = @id
    `);
  return result.recordset[0] ?? null;
}

export async function rejectById(
  id: number,
  verifierEmployeeId: number,
  reason: string
): Promise<MedioPagoRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("verificador", sql.Int, verifierEmployeeId)
    .input("motivoRechazo", sql.NVarChar(500), reason)
    .query<MedioPagoRow>(`
      UPDATE dbo.mediosPago
      SET
        estado = 'rechazado',
        motivoRechazo = @motivoRechazo,
        verificador = @verificador,
        verificadoEn = NULL,
        actualizadoEn = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE identificador = @id
    `);
  return result.recordset[0] ?? null;
}
