import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { ConflictError, NotFoundError } from "../../shared/errors/httpErrors";

export type ItemCloseContextRow = {
  itemId: number;
  productoId: number;
  duenioId: number;
  precioBase: number;
  comision: number;
  subastado: string | null;
  subastaId: number;
  moneda: string | null;
  descripcionCatalogo: string | null;
};

export type WinningBidCloseRow = {
  pujoId: number;
  importe: number;
  clienteId: number;
  numeroPostor: number;
  personaNombre: string | null;
};

export type RegistroDeSubastaRow = {
  identificador: number;
  subasta: number;
  duenio: number;
  producto: number;
  cliente: number;
  importe: number;
  comision: number;
};

export async function findItemCloseContext(
  auctionId: number,
  itemId: number
): Promise<ItemCloseContextRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("auctionId", sql.Int, auctionId)
    .input("itemId", sql.Int, itemId)
    .query<ItemCloseContextRow>(`
      SELECT TOP (1)
        ic.identificador AS itemId,
        ic.producto AS productoId,
        p.duenio AS duenioId,
        ic.precioBase,
        ic.comision,
        ic.subastado,
        cat.subasta AS subastaId,
        s.moneda,
        p.descripcionCatalogo
      FROM dbo.itemsCatalogo AS ic
      INNER JOIN dbo.catalogos AS cat ON cat.identificador = ic.catalogo
      INNER JOIN dbo.productos AS p ON p.identificador = ic.producto
      INNER JOIN dbo.subastas AS s ON s.identificador = cat.subasta
      WHERE ic.identificador = @itemId AND cat.subasta = @auctionId
    `);
  return result.recordset[0] ?? null;
}

export async function findRegistroByProductoAndSubasta(
  productoId: number,
  subastaId: number
): Promise<RegistroDeSubastaRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("producto", sql.Int, productoId)
    .input("subasta", sql.Int, subastaId)
    .query<RegistroDeSubastaRow>(`
      SELECT TOP (1)
        identificador, subasta, duenio, producto, cliente, importe, comision
      FROM dbo.registroDeSubasta
      WHERE producto = @producto AND subasta = @subasta
      ORDER BY identificador DESC
    `);
  return result.recordset[0] ?? null;
}

/** Highest bid; on tie, earliest bid (lowest identificador) wins. */
export async function findWinningBidForClose(itemId: number): Promise<WinningBidCloseRow | null> {
  const pool = await getSqlPool();
  const result = await pool.request().input("itemId", sql.Int, itemId).query<WinningBidCloseRow>(`
    SELECT TOP (1)
      pj.identificador AS pujoId,
      pj.importe,
      a.cliente AS clienteId,
      a.numeroPostor,
      per.nombre AS personaNombre
    FROM dbo.pujos AS pj
    INNER JOIN dbo.asistentes AS a ON a.identificador = pj.asistente
    LEFT JOIN dbo.personas AS per ON per.identificador = a.cliente
    WHERE pj.item = @itemId
    ORDER BY pj.importe DESC, pj.identificador ASC
  `);
  return result.recordset[0] ?? null;
}

export type CloseItemPersistenceInput = {
  auctionId: number;
  itemId: number;
  productoId: number;
  duenioId: number;
  clienteId: number;
  finalAmount: number;
  commissionAmount: number;
  winningPujoId: number | null;
};

export async function persistItemClose(
  input: CloseItemPersistenceInput
): Promise<RegistroDeSubastaRow> {
  const pool = await getSqlPool();
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);
  try {
    const lockItem = new sql.Request(tx);
    lockItem.input("itemId", sql.Int, input.itemId);
    const itemRes = await lockItem.query<{ subastado: string | null; producto: number }>(`
      SELECT ic.subastado, ic.producto
      FROM dbo.itemsCatalogo AS ic WITH (UPDLOCK, HOLDLOCK)
      WHERE ic.identificador = @itemId
    `);
    const lockedItem = itemRes.recordset[0];
    if (!lockedItem) {
      throw new NotFoundError("Ítem no encontrado.", "ITEM_NOT_FOUND");
    }

    const lockReg = new sql.Request(tx);
    lockReg.input("producto", sql.Int, input.productoId);
    lockReg.input("subasta", sql.Int, input.auctionId);
    const regRes = await lockReg.query<{ n: number }>(`
      SELECT COUNT_BIG(1) AS n
      FROM dbo.registroDeSubasta WITH (UPDLOCK, HOLDLOCK)
      WHERE producto = @producto AND subasta = @subasta
    `);
    if ((regRes.recordset[0]?.n ?? 0) > 0) {
      throw new ConflictError("El ítem ya fue finalizado.", "ITEM_ALREADY_FINALIZED");
    }

    if ((lockedItem.subastado ?? "no").trim().toLowerCase() === "si") {
      throw new ConflictError("El ítem ya fue finalizado.", "ITEM_ALREADY_FINALIZED");
    }

    if (input.winningPujoId !== null) {
      const resetPujos = new sql.Request(tx);
      resetPujos.input("itemId", sql.Int, input.itemId);
      await resetPujos.query(`
        UPDATE dbo.pujos SET ganador = N'no' WHERE item = @itemId
      `);

      const setWinner = new sql.Request(tx);
      setWinner.input("pujoId", sql.Int, input.winningPujoId);
      await setWinner.query(`
        UPDATE dbo.pujos SET ganador = N'si' WHERE identificador = @pujoId
      `);
    }

    const markSold = new sql.Request(tx);
    markSold.input("itemId", sql.Int, input.itemId);
    await markSold.query(`
      UPDATE dbo.itemsCatalogo SET subastado = N'si' WHERE identificador = @itemId
    `);

    const insReg = new sql.Request(tx);
    insReg.input("subasta", sql.Int, input.auctionId);
    insReg.input("duenio", sql.Int, input.duenioId);
    insReg.input("producto", sql.Int, input.productoId);
    insReg.input("cliente", sql.Int, input.clienteId);
    insReg.input("importe", sql.Decimal(18, 2), input.finalAmount);
    insReg.input("comision", sql.Decimal(18, 2), input.commissionAmount);
    const insRes = await insReg.query<RegistroDeSubastaRow>(`
      INSERT INTO dbo.registroDeSubasta (subasta, duenio, producto, cliente, importe, comision)
      OUTPUT
        INSERTED.identificador,
        INSERTED.subasta,
        INSERTED.duenio,
        INSERTED.producto,
        INSERTED.cliente,
        INSERTED.importe,
        INSERTED.comision
      VALUES (@subasta, @duenio, @producto, @cliente, @importe, @comision)
    `);
    const registro = insRes.recordset[0];
    if (!registro) {
      throw new Error("INSERT registroDeSubasta did not return row");
    }

    await tx.commit();
    return registro;
  } catch (err) {
    try {
      await tx.rollback();
    } catch {
      /* noop */
    }
    throw err;
  }
}

/** Marks item sold without registroDeSubasta (company purchase when COMPANY_CLIENT_ID is unset). */
export async function markItemSoldOnly(itemId: number): Promise<void> {
  const pool = await getSqlPool();
  await pool.request().input("itemId", sql.Int, itemId).query(`
    UPDATE dbo.itemsCatalogo SET subastado = N'si' WHERE identificador = @itemId
  `);
}
