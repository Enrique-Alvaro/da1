import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { getDefaultReviewerEmployeeId } from "../../config/env";
import {
  ConflictError,
  NotFoundError,
} from "../../shared/errors/httpErrors";
import { deriveProductStatus, type DerivedProductStatus } from "./producto-status";
import type { ProductoRow } from "./productos.repository";

export type ProductSubmissionFlags = {
  isScheduled: boolean;
  isSold: boolean;
  catalogItemId: number | null;
  auctionId: number | null;
};

export type ProductSubmissionRow = ProductoRow & ProductSubmissionFlags & {
  imageCount: number;
};

const PRODUCT_SELECT = `
  p.identificador,
  p.fecha,
  p.disponible,
  p.descripcionCatalogo,
  p.descripcionCompleta,
  p.revisor,
  p.duenio,
  p.seguro,
  (
    SELECT COUNT_BIG(1)
    FROM dbo.fotos AS f
    WHERE f.producto = p.identificador
  ) AS imageCount,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM dbo.itemsCatalogo AS ic WHERE ic.producto = p.identificador
    ) THEN 1 ELSE 0
  END AS isScheduled,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM dbo.registroDeSubasta AS rs WHERE rs.producto = p.identificador
    ) THEN 1 ELSE 0
  END AS isSold,
  (
    SELECT TOP (1) ic.identificador
    FROM dbo.itemsCatalogo AS ic
    WHERE ic.producto = p.identificador
    ORDER BY ic.identificador
  ) AS catalogItemId,
  (
    SELECT TOP (1) c.subasta
    FROM dbo.itemsCatalogo AS ic
    INNER JOIN dbo.catalogos AS c ON c.identificador = ic.catalogo
    WHERE ic.producto = p.identificador
    ORDER BY ic.identificador
  ) AS auctionId
`;

const PRODUCT_FROM = `FROM dbo.productos AS p`;

function mapSubmissionRow(row: Record<string, unknown>): ProductSubmissionRow {
  return {
    identificador: row.identificador as number,
    fecha: row.fecha as Date | string | null,
    disponible: row.disponible as string | null,
    descripcionCatalogo: row.descripcionCatalogo as string | null,
    descripcionCompleta: row.descripcionCompleta as string,
    revisor: row.revisor as number,
    duenio: row.duenio as number,
    seguro: row.seguro as string | null,
    isScheduled: Boolean(row.isScheduled),
    isSold: Boolean(row.isSold),
    catalogItemId: (row.catalogItemId as number | null) ?? null,
    auctionId: (row.auctionId as number | null) ?? null,
    imageCount: Number(row.imageCount ?? 0),
  };
}

export async function assertSubastaExists(subastaId: number): Promise<void> {
  const pool = await getSqlPool();
  const result = await pool.request().input("id", sql.Int, subastaId).query<{ n: number }>(`
    SELECT COUNT_BIG(1) AS n FROM dbo.subastas WHERE identificador = @id
  `);
  if ((result.recordset[0]?.n ?? 0) < 1) {
    throw new NotFoundError("Subasta no encontrada.");
  }
}

export async function insertProductWithPhotos(input: {
  duenioId: number;
  revisorId: number;
  catalogDescription: string;
  fullDescriptionUrl: string;
  imageBuffers: Buffer[];
}): Promise<number> {
  const pool = await getSqlPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const ins = new sql.Request(tx);
    ins.input("descripcionCatalogo", sql.NVarChar(500), input.catalogDescription);
    ins.input("descripcionCompleta", sql.NVarChar(300), input.fullDescriptionUrl);
    ins.input("revisor", sql.Int, input.revisorId);
    ins.input("duenio", sql.Int, input.duenioId);
    const prodRes = await ins.query<{ identificador: number }>(`
      INSERT INTO dbo.productos (
        fecha,
        disponible,
        descripcionCatalogo,
        descripcionCompleta,
        revisor,
        duenio,
        seguro
      )
      OUTPUT INSERTED.identificador AS identificador
      VALUES (
        CAST(GETDATE() AS date),
        N'no',
        @descripcionCatalogo,
        @descripcionCompleta,
        @revisor,
        @duenio,
        NULL
      )
    `);
    const productId = prodRes.recordset[0]?.identificador;
    if (productId === undefined) {
      throw new Error("INSERT productos did not return identificador");
    }

    for (const buf of input.imageBuffers) {
      const fotoReq = new sql.Request(tx);
      fotoReq.input("producto", sql.Int, productId);
      fotoReq.input("foto", sql.VarBinary(sql.MAX), buf);
      await fotoReq.query(`
        INSERT INTO dbo.fotos (producto, foto)
        VALUES (@producto, @foto)
      `);
    }

    await tx.commit();
    return productId;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function findSubmissionById(productId: number): Promise<ProductSubmissionRow | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("id", sql.Int, productId)
    .query(`
      SELECT TOP (1) ${PRODUCT_SELECT}
      ${PRODUCT_FROM}
      WHERE p.identificador = @id
    `);
  const row = result.recordset[0];
  return row ? mapSubmissionRow(row) : null;
}

export async function listSubmissionsByDuenio(duenioId: number): Promise<ProductSubmissionRow[]> {
  const pool = await getSqlPool();
  const result = await pool.request().input("duenio", sql.Int, duenioId).query(`
    SELECT ${PRODUCT_SELECT}
    ${PRODUCT_FROM}
    WHERE p.duenio = @duenio
    ORDER BY p.identificador DESC
  `);
  return result.recordset.map((r) => mapSubmissionRow(r));
}

export async function countPhotosByProduct(productId: number): Promise<number> {
  const pool = await getSqlPool();
  const result = await pool.request().input("producto", sql.Int, productId).query<{ n: number }>(`
    SELECT COUNT_BIG(1) AS n FROM dbo.fotos WHERE producto = @producto
  `);
  return Number(result.recordset[0]?.n ?? 0);
}

export type FotoMetaRow = {
  identificador: number;
  producto: number;
};

export async function findOwnedPhotoBuffer(input: {
  productId: number;
  photoId: number;
  duenioId: number;
}): Promise<Buffer | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("producto", sql.Int, input.productId)
    .input("photoId", sql.Int, input.photoId)
    .input("duenio", sql.Int, input.duenioId)
    .query<{ foto: Buffer }>(`
      SELECT TOP (1) f.foto
      FROM dbo.fotos AS f
      INNER JOIN dbo.productos AS p ON p.identificador = f.producto
      WHERE f.identificador = @photoId
        AND f.producto = @producto
        AND p.duenio = @duenio
    `);
  const row = result.recordset[0];
  if (!row?.foto) {
    return null;
  }
  return Buffer.isBuffer(row.foto) ? row.foto : Buffer.from(row.foto);
}

export async function listPhotoIdsByProduct(productId: number): Promise<FotoMetaRow[]> {
  const pool = await getSqlPool();
  const result = await pool.request().input("producto", sql.Int, productId).query<FotoMetaRow>(`
    SELECT identificador, producto
    FROM dbo.fotos
    WHERE producto = @producto
    ORDER BY identificador
  `);
  return result.recordset;
}

export async function listPendingReviewProducts(): Promise<ProductSubmissionRow[]> {
  const pool = await getSqlPool();
  const result = await pool.request().query(`
    SELECT ${PRODUCT_SELECT}
    ${PRODUCT_FROM}
    WHERE p.disponible = N'no'
      AND NOT EXISTS (
        SELECT 1 FROM dbo.itemsCatalogo AS ic WHERE ic.producto = p.identificador
      )
    ORDER BY p.identificador ASC
  `);
  return result.recordset.map((r) => mapSubmissionRow(r));
}

export async function applyAdminDecision(input: {
  productId: number;
  employeeId: number;
  approve: boolean;
}): Promise<ProductSubmissionRow> {
  await assertEmployeeExists(input.employeeId);

  const current = await findSubmissionById(input.productId);
  if (!current) {
    throw new NotFoundError("Producto no encontrado.");
  }
  if (current.isScheduled) {
    throw new ConflictError("El producto ya está asignado a un catálogo.");
  }
  if (current.isSold) {
    throw new ConflictError("El producto ya fue vendido.");
  }

  const avail = (current.disponible ?? "no").trim().toLowerCase();
  if (!input.approve && avail === "si") {
    throw new ConflictError(
      "No se puede rechazar un producto ya aprobado. No es equivalente a rechazar una revisión pendiente."
    );
  }

  const pool = await getSqlPool();
  await pool
    .request()
    .input("id", sql.Int, input.productId)
    .input("disponible", sql.NVarChar(2), input.approve ? "si" : "no")
    .input("revisor", sql.Int, input.employeeId)
    .query(`
      UPDATE dbo.productos
      SET disponible = @disponible, revisor = @revisor
      WHERE identificador = @id
    `);

  const updated = await findSubmissionById(input.productId);
  if (!updated) {
    throw new NotFoundError("Producto no encontrado.");
  }
  return updated;
}

export async function assignProductToAuction(input: {
  productId: number;
  employeeId: number;
  catalogId?: number;
  subastaId?: number;
  catalogDescription?: string;
  precioBase: number;
  comision: number;
}): Promise<ProductSubmissionRow> {
  await assertEmployeeExists(input.employeeId);

  if (input.catalogId === undefined && input.subastaId !== undefined) {
    await assertSubastaExists(input.subastaId);
  }

  const pool = await getSqlPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const lockProd = new sql.Request(tx);
    lockProd.input("producto", sql.Int, input.productId);
    const prodRes = await lockProd.query<{
      identificador: number;
      disponible: string | null;
    }>(`
      SELECT identificador, disponible
      FROM dbo.productos WITH (UPDLOCK, HOLDLOCK)
      WHERE identificador = @producto
    `);
    const locked = prodRes.recordset[0];
    if (!locked) {
      throw new NotFoundError("Producto no encontrado.");
    }
    if ((locked.disponible ?? "no").toLowerCase() !== "si") {
      throw new ConflictError("Solo se pueden programar productos aprobados (disponible = si).");
    }

    const lockScheduled = new sql.Request(tx);
    lockScheduled.input("producto", sql.Int, input.productId);
    const schedRes = await lockScheduled.query<{ n: number }>(`
      SELECT COUNT_BIG(1) AS n
      FROM dbo.itemsCatalogo WITH (UPDLOCK, HOLDLOCK)
      WHERE producto = @producto
    `);
    if ((schedRes.recordset[0]?.n ?? 0) > 0) {
      throw new ConflictError("El producto ya está programado en un catálogo.");
    }

    const lockSold = new sql.Request(tx);
    lockSold.input("producto", sql.Int, input.productId);
    const soldRes = await lockSold.query<{ n: number }>(`
      SELECT COUNT_BIG(1) AS n
      FROM dbo.registroDeSubasta WITH (UPDLOCK, HOLDLOCK)
      WHERE producto = @producto
    `);
    if ((soldRes.recordset[0]?.n ?? 0) > 0) {
      throw new ConflictError("El producto ya fue vendido.");
    }

    let catalogId = input.catalogId;
    if (catalogId === undefined) {
      const insCat = new sql.Request(tx);
      insCat.input("descripcion", sql.NVarChar(250), input.catalogDescription ?? "Catálogo");
      insCat.input("subasta", sql.Int, input.subastaId ?? null);
      insCat.input("responsable", sql.Int, input.employeeId);
      const catRes = await insCat.query<{ identificador: number }>(`
        INSERT INTO dbo.catalogos (descripcion, subasta, responsable)
        OUTPUT INSERTED.identificador AS identificador
        VALUES (@descripcion, @subasta, @responsable)
      `);
      catalogId = catRes.recordset[0]?.identificador;
      if (catalogId === undefined) {
        throw new Error("INSERT catalogos did not return identificador");
      }
    } else {
      const check = new sql.Request(tx);
      check.input("id", sql.Int, catalogId);
      const exists = await check.query<{ n: number }>(`
        SELECT COUNT_BIG(1) AS n FROM dbo.catalogos WHERE identificador = @id
      `);
      if ((exists.recordset[0]?.n ?? 0) < 1) {
        throw new NotFoundError("Catálogo no encontrado.");
      }
    }

    const insItem = new sql.Request(tx);
    insItem.input("catalogo", sql.Int, catalogId);
    insItem.input("producto", sql.Int, input.productId);
    insItem.input("precioBase", sql.Decimal(18, 2), input.precioBase);
    insItem.input("comision", sql.Decimal(18, 2), input.comision);
    await insItem.query(`
      INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
      VALUES (@catalogo, @producto, @precioBase, @comision, N'no')
    `);

    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }

  const updated = await findSubmissionById(input.productId);
  if (!updated) {
    throw new NotFoundError("Producto no encontrado.");
  }
  return updated;
}

export async function deleteProductSubmission(productId: number): Promise<void> {
  const current = await findSubmissionById(productId);
  if (!current) {
    throw new NotFoundError("Producto no encontrado.");
  }
  if (current.isScheduled) {
    throw new ConflictError("No se puede cancelar un producto ya programado en catálogo.");
  }
  if (current.isSold) {
    throw new ConflictError("No se puede cancelar un producto vendido.");
  }
  if ((current.disponible ?? "no").toLowerCase() !== "no") {
    throw new ConflictError("Solo se pueden cancelar envíos pendientes (disponible = no).");
  }
  if (current.seguro !== null && current.seguro !== undefined && String(current.seguro).trim() !== "") {
    throw new ConflictError(
      "No se puede cancelar un producto con póliza de seguro asociada."
    );
  }

  const pool = await getSqlPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const delFotos = new sql.Request(tx);
    delFotos.input("producto", sql.Int, productId);
    await delFotos.query(`DELETE FROM dbo.fotos WHERE producto = @producto`);

    const delProd = new sql.Request(tx);
    delProd.input("id", sql.Int, productId);
    const delRes = await delProd.query(`
      DELETE FROM dbo.productos WHERE identificador = @id
    `);
    const affected = delRes.rowsAffected[0] ?? 0;
    if (affected < 1) {
      throw new NotFoundError("Producto no encontrado.");
    }
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    const num = (err as { number?: number }).number;
    if (num === 547) {
      throw new ConflictError(
        "No se puede eliminar el producto por referencias existentes en la base de datos."
      );
    }
    throw err;
  }
}

export function toDerivedStatus(row: ProductSubmissionRow): DerivedProductStatus {
  return deriveProductStatus({
    disponible: row.disponible,
    isScheduled: row.isScheduled,
    isSold: row.isSold,
  });
}

export async function assertEmployeeExists(employeeId: number): Promise<void> {
  const pool = await getSqlPool();
  const result = await pool.request().input("id", sql.Int, employeeId).query<{ n: number }>(`
    SELECT COUNT_BIG(1) AS n FROM dbo.empleados WHERE identificador = @id
  `);
  if ((result.recordset[0]?.n ?? 0) < 1) {
    throw new NotFoundError("Empleado no encontrado.");
  }
}

export function resolveDefaultReviewerId(): number {
  return getDefaultReviewerEmployeeId();
}
