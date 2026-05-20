import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import type { CreatePaymentMethodBody } from "./payment-methods.schema";

export type MedioPagoRow = {
  identificador: number;
  cliente: number;
  tipo: string;
  estado: string;
  moneda: string;
  titular: string;
  entidad: string | null;
  ultimosDigitos: string | null;
  aliasOCbu: string | null;
  montoGarantia: number | null;
  montoDisponible: number | null;
  motivoRechazo: string | null;
  verificador: number | null;
  creadoEn: Date;
  actualizadoEn: Date;
  verificadoEn: Date | null;
};

const SELECT_LIST = `
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
`;

export async function listByCliente(clienteId: number): Promise<MedioPagoRow[]> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("cliente", sql.Int, clienteId)
    .query<MedioPagoRow>(`
      SELECT ${SELECT_LIST}
      FROM dbo.mediosPago
      WHERE cliente = @cliente
      ORDER BY identificador DESC
    `);
  return result.recordset;
}

export async function findByIdAndCliente(
  id: number,
  clienteId: number
): Promise<MedioPagoRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("cliente", sql.Int, clienteId)
    .query<MedioPagoRow>(`
      SELECT TOP (1) ${SELECT_LIST}
      FROM dbo.mediosPago
      WHERE identificador = @id AND cliente = @cliente
    `);
  return result.recordset[0] ?? null;
}

export type InsertMedioPagoInput = {
  clienteId: number;
  body: CreatePaymentMethodBody;
};

export async function insertMedioPago(input: InsertMedioPagoInput): Promise<MedioPagoRow> {
  const { clienteId, body } = input;
  const montoGarantia =
    body.tipo === "cheque_certificado" && body.montoGarantia != null
      ? body.montoGarantia
      : null;
  const montoDisponible = montoGarantia;

  const ultimosDigitos = body.ultimosDigitos?.trim() || null;
  const aliasOCbu = body.aliasOCbu?.trim() || null;
  const entidad = body.entidad?.trim() || null;

  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("cliente", sql.Int, clienteId)
    .input("tipo", sql.VarChar(30), body.tipo)
    .input("moneda", sql.VarChar(3), body.moneda)
    .input("titular", sql.NVarChar(150), body.titular.trim())
    .input("entidad", sql.NVarChar(150), entidad)
    .input("ultimosDigitos", sql.VarChar(4), ultimosDigitos)
    .input("aliasOCbu", sql.NVarChar(50), aliasOCbu)
    .input("montoGarantia", sql.Decimal(18, 2), montoGarantia)
    .input("montoDisponible", sql.Decimal(18, 2), montoDisponible)
    .query<MedioPagoRow>(`
      INSERT INTO dbo.mediosPago (
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
        verificadoEn
      )
      OUTPUT INSERTED.*
      VALUES (
        @cliente,
        @tipo,
        'pendiente',
        @moneda,
        @titular,
        @entidad,
        @ultimosDigitos,
        @aliasOCbu,
        @montoGarantia,
        @montoDisponible,
        NULL,
        NULL,
        NULL
      )
    `);

  const row = result.recordset[0];
  if (!row) {
    throw new Error("INSERT mediosPago did not return row");
  }
  return row;
}

export async function disableMedioPago(id: number, clienteId: number): Promise<MedioPagoRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .input("cliente", sql.Int, clienteId)
    .query<MedioPagoRow>(`
      UPDATE dbo.mediosPago
      SET
        estado = 'deshabilitado',
        actualizadoEn = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE identificador = @id AND cliente = @cliente
    `);
  return result.recordset[0] ?? null;
}
