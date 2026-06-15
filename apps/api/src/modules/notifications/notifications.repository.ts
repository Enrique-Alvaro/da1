import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import type { CreateNotificationInput, NotificationRow } from "./notifications.types";

const SELECT_FIELDS = `
  identificador,
  cliente,
  tipo,
  titulo,
  mensaje,
  leida,
  auctionId,
  itemId,
  saleId,
  paymentMethodId,
  submissionId,
  idempotencyKey,
  creadoEn
`;

function mapRow(row: NotificationRow & { leida: number | boolean }): NotificationRow {
  return {
    ...row,
    leida: Boolean(row.leida),
  };
}

export async function insertNotification(
  input: CreateNotificationInput
): Promise<NotificationRow | null> {
  const pool = await getSqlPool();
  const req = pool.request();
  req.input("cliente", sql.Int, input.clienteId);
  req.input("tipo", sql.VarChar(50), input.type);
  req.input("titulo", sql.NVarChar(200), input.title);
  req.input("mensaje", sql.NVarChar(1000), input.message);
  req.input("auctionId", sql.Int, input.auctionId ?? null);
  req.input("itemId", sql.Int, input.itemId ?? null);
  req.input("saleId", sql.Int, input.saleId ?? null);
  req.input("paymentMethodId", sql.Int, input.paymentMethodId ?? null);
  req.input("submissionId", sql.Int, input.submissionId ?? null);
  req.input("idempotencyKey", sql.NVarChar(120), input.idempotencyKey ?? null);

  try {
    const result = await req.query<NotificationRow & { leida: number }>(`
      INSERT INTO dbo.notificaciones (
        cliente, tipo, titulo, mensaje, auctionId, itemId, saleId,
        paymentMethodId, submissionId, idempotencyKey
      )
      OUTPUT
        INSERTED.identificador,
        INSERTED.cliente,
        INSERTED.tipo,
        INSERTED.titulo,
        INSERTED.mensaje,
        INSERTED.leida,
        INSERTED.auctionId,
        INSERTED.itemId,
        INSERTED.saleId,
        INSERTED.paymentMethodId,
        INSERTED.submissionId,
        INSERTED.idempotencyKey,
        INSERTED.creadoEn
      VALUES (
        @cliente, @tipo, @titulo, @mensaje, @auctionId, @itemId, @saleId,
        @paymentMethodId, @submissionId, @idempotencyKey
      )
    `);
    const row = result.recordset[0];
    return row ? mapRow(row) : null;
  } catch (err: unknown) {
    const number = (err as { number?: number }).number;
    if (number === 2627 || number === 2601) {
      if (input.idempotencyKey) {
        return findByIdempotencyKey(input.idempotencyKey);
      }
      return null;
    }
    throw err;
  }
}

async function findByIdempotencyKey(key: string): Promise<NotificationRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("key", sql.NVarChar(120), key)
    .query<NotificationRow & { leida: number }>(`
      SELECT TOP (1) ${SELECT_FIELDS}
      FROM dbo.notificaciones
      WHERE idempotencyKey = @key
    `);
  const row = result.recordset[0];
  return row ? mapRow(row) : null;
}

export async function listByCliente(
  clienteId: number,
  limit: number,
  offset: number
): Promise<{ rows: NotificationRow[]; total: number }> {
  const pool = await getSqlPool();
  const countReq = pool.request().input("cliente", sql.Int, clienteId);
  const countRes = await countReq.query<{ total: number }>(`
    SELECT COUNT_BIG(1) AS total FROM dbo.notificaciones WHERE cliente = @cliente
  `);
  const total = Number(countRes.recordset[0]?.total ?? 0);

  const listReq = pool.request();
  listReq.input("cliente", sql.Int, clienteId);
  listReq.input("limit", sql.Int, limit);
  listReq.input("offset", sql.Int, offset);
  const listRes = await listReq.query<NotificationRow & { leida: number }>(`
    SELECT ${SELECT_FIELDS}
    FROM dbo.notificaciones
    WHERE cliente = @cliente
    ORDER BY creadoEn DESC, identificador DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `);

  return {
    rows: listRes.recordset.map(mapRow),
    total,
  };
}

export async function countUnreadByCliente(clienteId: number): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("cliente", sql.Int, clienteId)
    .query<{ count: number }>(`
      SELECT COUNT(1) AS count
      FROM dbo.notificaciones
      WHERE cliente = @cliente AND leida = 0
    `);
  return Number(result.recordset[0]?.count ?? 0);
}

export async function markRead(clienteId: number, notificationId: number): Promise<boolean> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("cliente", sql.Int, clienteId)
    .input("id", sql.Int, notificationId)
    .query(`
      UPDATE dbo.notificaciones
      SET leida = 1
      WHERE identificador = @id AND cliente = @cliente AND leida = 0
    `);
  return (result.rowsAffected[0] ?? 0) > 0;
}

export async function markAllRead(clienteId: number): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("cliente", sql.Int, clienteId)
    .query(`
      UPDATE dbo.notificaciones
      SET leida = 1
      WHERE cliente = @cliente AND leida = 0
    `);
  return result.rowsAffected[0] ?? 0;
}

export async function findByIdForCliente(
  clienteId: number,
  notificationId: number
): Promise<NotificationRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("cliente", sql.Int, clienteId)
    .input("id", sql.Int, notificationId)
    .query<NotificationRow & { leida: number }>(`
      SELECT TOP (1) ${SELECT_FIELDS}
      FROM dbo.notificaciones
      WHERE identificador = @id AND cliente = @cliente
    `);
  const row = result.recordset[0];
  return row ? mapRow(row) : null;
}

export async function findWinningBidderForItem(
  itemId: number
): Promise<{ clienteId: number; amount: number } | null> {
  const pool = await getSqlPool();
  const result = await pool.request().input("itemId", sql.Int, itemId).query<{
    cliente: number;
    importe: number;
  }>(`
    SELECT TOP (1) a.cliente, p.importe
    FROM dbo.pujos AS p
    INNER JOIN dbo.asistentes AS a ON a.identificador = p.asistente
    WHERE p.item = @itemId
    ORDER BY p.importe DESC, p.identificador ASC
  `);
  const row = result.recordset[0];
  if (!row) return null;
  return { clienteId: row.cliente, amount: Number(row.importe) };
}

export async function listDistinctBiddersForItem(itemId: number): Promise<number[]> {
  const pool = await getSqlPool();
  const result = await pool.request().input("itemId", sql.Int, itemId).query<{ cliente: number }>(`
    SELECT DISTINCT a.cliente
    FROM dbo.pujos AS p
    INNER JOIN dbo.asistentes AS a ON a.identificador = p.asistente
    WHERE p.item = @itemId
  `);
  return result.recordset.map((r) => r.cliente);
}
