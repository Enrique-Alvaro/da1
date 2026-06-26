import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { AppError } from "../../shared/errors/AppError";
import { ConflictError } from "../../shared/errors/httpErrors";
import {
  assertPaymentMethodForBid,
  type MedioPagoBidRow,
} from "./pujos-payment-validation";

export type AsistenteRow = {
  identificador: number;
  numeroPostor: number;
  cliente: number;
  subasta: number;
};

export type ItemEnSubastaRow = {
  identificador: number;
  precioBase: number;
  subastaId: number;
  ownerPersonId: number | null;
};

export type PujoRow = {
  identificador: number;
  asistente: number;
  item: number;
  importe: number;
  ganador: string;
};

const MEDIO_PAGO_BID_SELECT = `
  identificador,
  cliente,
  tipo,
  estado,
  moneda,
  montoDisponible
`;

export async function findAsistenteByClienteAndSubasta(
  clienteId: number,
  subastaId: number
): Promise<AsistenteRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("cliente", sql.Int, clienteId)
    .input("subasta", sql.Int, subastaId)
    .query<AsistenteRow>(`
      SELECT TOP (1) identificador, numeroPostor, cliente, subasta
      FROM dbo.asistentes
      WHERE cliente = @cliente AND subasta = @subasta
    `);
  return result.recordset[0] ?? null;
}

export async function countAsistentesBySubasta(subastaId: number): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("subasta", sql.Int, subastaId)
    .query<{ n: number }>(`
      SELECT COUNT_BIG(1) AS n FROM dbo.asistentes WHERE subasta = @subasta
    `);
  return Number(result.recordset[0]?.n ?? 0);
}

/**
 * Inscripción atómica: bloquea filas de la subasta, asigna siguiente numeroPostor e inserta.
 */
export async function insertAsistenteInTransaction(
  clienteId: number,
  subastaId: number
): Promise<AsistenteRow> {
  const pool = await getSqlPool();
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);
  try {
    const reqExisting = new sql.Request(tx);
    reqExisting.input("cliente", sql.Int, clienteId);
    reqExisting.input("subasta", sql.Int, subastaId);
    const existingRes = await reqExisting.query<AsistenteRow>(`
      SELECT TOP (1) identificador, numeroPostor, cliente, subasta
      FROM dbo.asistentes WITH (UPDLOCK, HOLDLOCK)
      WHERE cliente = @cliente AND subasta = @subasta
    `);
    const existing = existingRes.recordset[0];
    if (existing) {
      await tx.commit();
      return existing;
    }

    const reqMax = new sql.Request(tx);
    reqMax.input("subasta", sql.Int, subastaId);
    const maxRes = await reqMax.query<{ maxNum: number | null }>(`
      SELECT MAX(numeroPostor) AS maxNum
      FROM dbo.asistentes WITH (UPDLOCK, HOLDLOCK)
      WHERE subasta = @subasta
    `);
    const numeroPostor = (maxRes.recordset[0]?.maxNum ?? 0) + 1;

    const reqIns = new sql.Request(tx);
    reqIns.input("cliente", sql.Int, clienteId);
    reqIns.input("subasta", sql.Int, subastaId);
    reqIns.input("numeroPostor", sql.Int, numeroPostor);
    const insRes = await reqIns.query<AsistenteRow>(`
      INSERT INTO dbo.asistentes (numeroPostor, cliente, subasta)
      OUTPUT INSERTED.identificador, INSERTED.numeroPostor, INSERTED.cliente, INSERTED.subasta
      VALUES (@numeroPostor, @cliente, @subasta)
    `);
    const row = insRes.recordset[0];
    if (!row) {
      throw new Error("INSERT asistentes did not return row");
    }

    await tx.commit();
    return row;
  } catch (err) {
    try {
      await tx.rollback();
    } catch {
      /* noop */
    }
    if (err instanceof AppError) {
      throw err;
    }
    const { number } = err as { number?: number };
    if (number === 2627 || number === 2601) {
      const again = await findAsistenteByClienteAndSubasta(clienteId, subastaId);
      if (again) {
        return again;
      }
      throw new ConflictError(
        "No se pudo registrar el asistente por conflicto.",
        "ASSISTANT_REGISTRATION_CONFLICT"
      );
    }
    throw err;
  }
}

const LEADING_BID_EXPOSURE_SQL = `
  WITH item_best AS (
    SELECT pu.item, MAX(pu.importe) AS importe
    FROM dbo.pujos AS pu
    GROUP BY pu.item
  ),
  leading AS (
    SELECT DISTINCT ib.item, ib.importe
    FROM item_best AS ib
    INNER JOIN dbo.pujos AS pu ON pu.item = ib.item AND pu.importe = ib.importe
    INNER JOIN dbo.asistentes AS a ON a.identificador = pu.asistente
    WHERE a.cliente = @clienteId
  )
  SELECT COALESCE(SUM(l.importe), 0) AS total
  FROM leading AS l
  INNER JOIN dbo.itemsCatalogo AS ic ON ic.identificador = l.item
  WHERE (ic.subastado IS NULL OR LOWER(LTRIM(RTRIM(ic.subastado))) <> 'si')
`;

export async function sumLeadingBidExposureForCliente(
  clienteId: number,
  excludeItemId?: number
): Promise<number> {
  const pool = await getSqlPool();
  const req = pool.request().input("clienteId", sql.Int, clienteId);
  const excludeClause =
    excludeItemId != null ? "AND ic.identificador <> @excludeItemId" : "";
  if (excludeItemId != null) {
    req.input("excludeItemId", sql.Int, excludeItemId);
  }
  const result = await req.query<{ total: number | null }>(
    `${LEADING_BID_EXPOSURE_SQL} ${excludeClause}`
  );
  return Number(result.recordset[0]?.total ?? 0);
}

export async function sumLeadingBidExposureForClienteInTransaction(
  tx: sql.Transaction,
  clienteId: number,
  excludeItemId?: number
): Promise<number> {
  const req = new sql.Request(tx);
  req.input("clienteId", sql.Int, clienteId);
  const excludeClause =
    excludeItemId != null ? "AND ic.identificador <> @excludeItemId" : "";
  if (excludeItemId != null) {
    req.input("excludeItemId", sql.Int, excludeItemId);
  }
  const result = await req.query<{ total: number | null }>(
    `${LEADING_BID_EXPOSURE_SQL} ${excludeClause}`
  );
  return Number(result.recordset[0]?.total ?? 0);
}

export async function getMaxBidForItem(itemId: number): Promise<number | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("itemId", sql.Int, itemId)
    .query<{ importe: number | null }>(`
      SELECT MAX(importe) AS importe FROM dbo.pujos WHERE item = @itemId
    `);
  const max = result.recordset[0]?.importe;
  return max != null ? Number(max) : null;
}

export async function findItemInSubasta(
  itemId: number,
  subastaId: number
): Promise<ItemEnSubastaRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("itemId", sql.Int, itemId)
    .input("subastaId", sql.Int, subastaId)
    .query<ItemEnSubastaRow>(`
      SELECT TOP (1)
        ic.identificador,
        ic.precioBase,
        cat.subasta AS subastaId,
        p.duenio AS ownerPersonId
      FROM dbo.itemsCatalogo AS ic
      INNER JOIN dbo.catalogos AS cat ON cat.identificador = ic.catalogo
      INNER JOIN dbo.productos AS p ON p.identificador = ic.producto
      WHERE ic.identificador = @itemId AND cat.subasta = @subastaId
    `);
  return result.recordset[0] ?? null;
}

async function loadMedioPagoForBidInTransaction(
  tx: sql.Transaction,
  paymentMethodId: number,
  clienteId: number
): Promise<MedioPagoBidRow | null> {
  const req = new sql.Request(tx);
  req.input("id", sql.Int, paymentMethodId);
  req.input("cliente", sql.Int, clienteId);
  const result = await req.query<MedioPagoBidRow>(`
    SELECT TOP (1) ${MEDIO_PAGO_BID_SELECT}
    FROM dbo.mediosPago WITH (UPDLOCK, HOLDLOCK)
    WHERE identificador = @id AND cliente = @cliente
  `);
  return result.recordset[0] ?? null;
}

export type InsertBidInput = {
  asistenteId: number;
  itemId: number;
  importe: number;
  basePrice: number;
  auctionCategory: string;
  clienteId: number;
  paymentMethodId: number;
  auctionCurrency: string;
  validateAmount: (
    amount: number,
    currentBest: number,
    basePrice: number,
    auctionCategory: string
  ) => void;
};

/**
 * Transacción: revalida medio de pago, lee mejor oferta con bloqueo, revalida importe e inserta puja.
 */
export async function insertBidInTransaction(input: InsertBidInput): Promise<PujoRow> {
  const pool = await getSqlPool();
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);
  try {
    const medioRow = await loadMedioPagoForBidInTransaction(
      tx,
      input.paymentMethodId,
      input.clienteId
    );
    const committedExposure = await sumLeadingBidExposureForClienteInTransaction(
      tx,
      input.clienteId,
      input.itemId
    );
    assertPaymentMethodForBid(medioRow, input.auctionCurrency, input.importe, {
      committedExposure,
    });

    const reqLock = new sql.Request(tx);
    reqLock.input("itemId", sql.Int, input.itemId);
    const bestRes = await reqLock.query<{ importe: number | null }>(`
      SELECT TOP (1) importe
      FROM dbo.pujos WITH (UPDLOCK, HOLDLOCK)
      WHERE item = @itemId
      ORDER BY importe DESC
    `);
    const maxBid = bestRes.recordset[0]?.importe;
    const currentBest = maxBid != null ? Number(maxBid) : input.basePrice;
    input.validateAmount(input.importe, currentBest, input.basePrice, input.auctionCategory);

    const reqIns = new sql.Request(tx);
    reqIns.input("asistente", sql.Int, input.asistenteId);
    reqIns.input("item", sql.Int, input.itemId);
    reqIns.input("importe", sql.Decimal(18, 2), input.importe);
    const insRes = await reqIns.query<PujoRow>(`
      INSERT INTO dbo.pujos (asistente, item, importe, ganador)
      OUTPUT INSERTED.identificador, INSERTED.asistente, INSERTED.item, INSERTED.importe, INSERTED.ganador
      VALUES (@asistente, @item, @importe, N'no')
    `);
    const row = insRes.recordset[0];
    if (!row) {
      throw new Error("INSERT pujos did not return row");
    }

    await tx.commit();
    return row;
  } catch (err) {
    try {
      await tx.rollback();
    } catch {
      /* noop */
    }
    if (err instanceof AppError) {
      throw err;
    }
    const { number } = err as { number?: number };
    if (number === 2627 || number === 2601) {
      throw new ConflictError(
        "No se pudo registrar la puja por conflicto concurrente.",
        "BID_CONFLICT"
      );
    }
    throw err;
  }
}
