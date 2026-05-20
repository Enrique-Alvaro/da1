import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { ConflictError } from "../../shared/errors/httpErrors";

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
};

export type PujoRow = {
  identificador: number;
  asistente: number;
  item: number;
  importe: number;
  ganador: string;
};

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

export async function insertAsistente(
  clienteId: number,
  subastaId: number,
  numeroPostor: number
): Promise<AsistenteRow> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("cliente", sql.Int, clienteId)
    .input("subasta", sql.Int, subastaId)
    .input("numeroPostor", sql.Int, numeroPostor)
    .query<AsistenteRow>(`
      INSERT INTO dbo.asistentes (numeroPostor, cliente, subasta)
      OUTPUT INSERTED.identificador, INSERTED.numeroPostor, INSERTED.cliente, INSERTED.subasta
      VALUES (@numeroPostor, @cliente, @subasta)
    `);
  const row = result.recordset[0];
  if (!row) {
    throw new Error("INSERT asistentes did not return row");
  }
  return row;
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
        cat.subasta AS subastaId
      FROM dbo.itemsCatalogo AS ic
      INNER JOIN dbo.catalogos AS cat ON cat.identificador = ic.catalogo
      WHERE ic.identificador = @itemId AND cat.subasta = @subastaId
    `);
  return result.recordset[0] ?? null;
}

export type InsertBidInput = {
  asistenteId: number;
  itemId: number;
  importe: number;
  basePrice: number;
  auctionCategory: string;
  validateAmount: (
    amount: number,
    currentBest: number,
    basePrice: number,
    auctionCategory: string
  ) => void;
};

/**
 * Transacción: lee mejor oferta con bloqueo, revalida importe e inserta puja.
 */
export async function insertBidInTransaction(input: InsertBidInput): Promise<PujoRow> {
  const pool = await getSqlPool();
  const tx = new sql.Transaction(pool);
  await tx.begin(sql.ISOLATION_LEVEL.READ_COMMITTED);
  try {
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
    if (err instanceof ConflictError) {
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

export async function getNextNumeroPostor(subastaId: number): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("subasta", sql.Int, subastaId)
    .query<{ maxNum: number | null }>(`
      SELECT MAX(numeroPostor) AS maxNum FROM dbo.asistentes WHERE subasta = @subasta
    `);
  const max = result.recordset[0]?.maxNum;
  return (max ?? 0) + 1;
}
