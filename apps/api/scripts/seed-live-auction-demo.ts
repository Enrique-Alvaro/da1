/**
 * Repeatable live-auction demo seed (development / QA only).
 *
 * Usage (repo root):
 *   npm run seed:live-auction-demo
 *
 * Usage (apps/api):
 *   npm run seed:live-auction-demo
 *
 * Env:
 *   SQLSERVER_CONNECTION_STRING (or DB_* parts) — required
 *   SEED_LIVE_DEMO_PASSWORD — default Password123!
 *   DEFAULT_REVIEWER_EMPLOYEE_ID — default 1
 *
 * Safe to re-run: each run creates a NEW auction (unique run id). Previous demo data is kept.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import sql from "mssql";
import { loadEnv, getDefaultReviewerEmployeeId } from "../src/config/env";
import { hashPassword } from "../src/shared/security/passwords";
import { validateBidAmountRules } from "../src/modules/pujos/pujos.service";
import {
  insertAsistenteInTransaction,
  insertBidInTransaction,
} from "../src/modules/pujos/pujos.repository";
import { notifySubmissionCustodyUpdated } from "../src/modules/notifications/notifications.events";

const DEMO_PASSWORD_DEFAULT = "Password123!";

type DemoRunContext = {
  runId: string;
  ubicacion: string;
  catalogDesc: string;
  items: DemoItemSpec[];
};

function createDemoRunContext(): DemoRunContext {
  const runId = `${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
  const ubicacion = `Subasta Demo en Vivo - ${runId}`;
  const catalogDesc = `Catálogo demo en vivo - ${runId}`;
  const items = DEMO_ITEM_TEMPLATES.map((spec, index) => ({
    ...spec,
    pieceNumber: `DEMO-${runId}-${String(index + 1).padStart(3, "0")}`,
  }));
  return { runId, ubicacion, catalogDesc, items };
}

const DEMO_OWNER = {
  personaId: 9201,
  document: "DEMO-OWNER-9201",
  name: "Demo Owner",
  email: "demo.owner@crownbid.test",
  categoria: "comun" as const,
};

const DEMO_COMPETITOR = {
  personaId: 9202,
  document: "DEMO-COMP-9202",
  name: "Demo Competitor",
  email: "demo.competitor@crownbid.test",
  categoria: "comun" as const,
};

const DEMO_SUBASTADOR = {
  personaId: 9200,
  document: "DEMO-SUB-9200",
  name: "Subastador Demo Live",
};

const DEMO_DEPOSIT = "Depósito Central - Sector A";
const DEMO_INSURANCE = {
  policy: "POL-DEMO-2026-001",
  company: "Demo Seguros S.A.",
};

const DEMO_JPEG_BASE = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
  "base64"
);

type DemoItemSpec = {
  pieceNumber: string;
  title: string;
  description: string;
  basePrice: number;
  components: string;
  artistOrDesigner?: string;
  originDate?: string;
  history?: string;
};

type DemoItemTemplate = Omit<DemoItemSpec, "pieceNumber">;

const DEMO_ITEM_TEMPLATES: DemoItemTemplate[] = [
  {
    title: "Juego de Té Inglés de Porcelana - 18 piezas",
    description:
      "Juego de té de porcelana blanca con detalles dorados, compuesto por 18 piezas. Incluye tetera, azucarera, lechera, seis tazas, seis platos y piezas complementarias.",
    basePrice: 10000,
    components: "18 piezas",
  },
  {
    title: "Lámpara de Mesa Art Déco",
    description:
      "Lámpara de mesa estilo Art Déco con base metálica y tulipa opalina. Pieza decorativa en buen estado general.",
    basePrice: 18000,
    components: "1 pieza",
  },
  {
    title: "Cuadro Óleo sobre Lienzo - Paisaje Urbano",
    description:
      "Óleo sobre lienzo de paisaje urbano con marco de madera. Obra firmada, ideal para colección o decoración.",
    basePrice: 25000,
    components: "1 pieza",
    artistOrDesigner: "A. Moretti",
    originDate: "1984",
    history:
      "Obra proveniente de colección particular familiar. Conservada en interior durante más de 20 años.",
  },
];

function demoJpeg(_photoIndex: number): Buffer {
  return DEMO_JPEG_BASE;
}

async function tableExists(pool: sql.ConnectionPool, table: string): Promise<boolean> {
  const result = await pool
    .request()
    .input("table", sql.NVarChar(128), table)
    .query<{ ok: number }>(`
      SELECT CASE WHEN OBJECT_ID(@table, 'U') IS NOT NULL THEN 1 ELSE 0 END AS ok
    `);
  return result.recordset[0]?.ok === 1;
}

async function ensurePersona(
  pool: sql.ConnectionPool,
  id: number,
  documento: string,
  nombre: string,
  direccion: string | null
): Promise<void> {
  await pool
    .request()
    .input("id", sql.Int, id)
    .input("documento", sql.VarChar(20), documento)
    .input("nombre", sql.VarChar(150), nombre)
    .input("direccion", sql.VarChar(250), direccion)
    .query(`
      SET IDENTITY_INSERT dbo.personas ON;
      IF NOT EXISTS (SELECT 1 FROM dbo.personas WHERE identificador = @id)
        INSERT INTO dbo.personas (identificador, documento, nombre, direccion, estado)
        VALUES (@id, @documento, @nombre, @direccion, 'activo');
      ELSE
        UPDATE dbo.personas
        SET documento = @documento, nombre = @nombre, direccion = COALESCE(@direccion, direccion)
        WHERE identificador = @id;
      SET IDENTITY_INSERT dbo.personas OFF;
    `);
}


async function ensureClienteUser(
  pool: sql.ConnectionPool,
  spec: typeof DEMO_OWNER,
  passwordHash: string,
  reviewerId: number
): Promise<void> {
  if (!(await tableExists(pool, "dbo.cliente_credenciales"))) {
    throw new Error("dbo.cliente_credenciales not found. Run database/cliente_credenciales.sql");
  }

  await ensurePersona(pool, spec.personaId, spec.document, spec.name, "Buenos Aires, Argentina");

  await pool
    .request()
    .input("id", sql.Int, spec.personaId)
    .input("numeroPais", sql.Int, 1)
    .input("verificador", sql.Int, reviewerId)
    .input("categoria", sql.NVarChar(10), spec.categoria)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.clientes WHERE identificador = @id)
        INSERT INTO dbo.clientes (identificador, numeroPais, admitido, categoria, verificador)
        VALUES (@id, @numeroPais, 'si', @categoria, @verificador);
      ELSE
        UPDATE dbo.clientes
        SET admitido = 'si', categoria = @categoria, numeroPais = @numeroPais
        WHERE identificador = @id;
    `);

  await pool
    .request()
    .input("id", sql.Int, spec.personaId)
    .input("verificador", sql.Int, reviewerId)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.duenios WHERE identificador = @id)
        INSERT INTO dbo.duenios (identificador, numeroPais, verificacionFinanciera, verificacionJudicial, calificacionRiesgo, verificador)
        VALUES (@id, 1, 'si', 'si', 2, @verificador);
    `);

  await pool
    .request()
    .input("persona_id", sql.Int, spec.personaId)
    .input("email", sql.NVarChar(320), spec.email)
    .input("password_hash", sql.NVarChar(500), passwordHash)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.cliente_credenciales WHERE persona_id = @persona_id)
        INSERT INTO dbo.cliente_credenciales (persona_id, email, password_hash, requires_password_change)
        VALUES (@persona_id, @email, @password_hash, 0);
      ELSE
        UPDATE dbo.cliente_credenciales
        SET email = @email, password_hash = @password_hash, requires_password_change = 0, updated_at = SYSUTCDATETIME()
        WHERE persona_id = @persona_id;
    `);
}

async function ensureSubastador(pool: sql.ConnectionPool): Promise<number> {
  await ensurePersona(
    pool,
    DEMO_SUBASTADOR.personaId,
    DEMO_SUBASTADOR.document,
    DEMO_SUBASTADOR.name,
    "Buenos Aires"
  );
  await pool
    .request()
    .input("id", sql.Int, DEMO_SUBASTADOR.personaId)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.subastadores WHERE identificador = @id)
        INSERT INTO dbo.subastadores (identificador, matricula, region)
        VALUES (@id, 'DEMO-LIVE-01', 'Argentina');
    `);
  return DEMO_SUBASTADOR.personaId;
}

async function ensureCompetitorPaymentMethod(
  pool: sql.ConnectionPool,
  reviewerId: number
): Promise<number> {
  if (!(await tableExists(pool, "dbo.mediosPago"))) {
    throw new Error("dbo.mediosPago not found. Run migration 001.");
  }

  await pool
    .request()
    .input("cliente", sql.Int, DEMO_COMPETITOR.personaId)
    .query(`
      DELETE FROM dbo.mediosPago
      WHERE cliente = @cliente AND entidad = N'DEMO LIVE Auction';
    `);

  const ins = await pool
    .request()
    .input("cliente", sql.Int, DEMO_COMPETITOR.personaId)
    .input("verificador", sql.Int, reviewerId)
    .query<{ id: number }>(`
      INSERT INTO dbo.mediosPago (
        cliente, tipo, estado, moneda, titular, entidad, ultimosDigitos,
        montoGarantia, montoDisponible, verificador, verificadoEn
      )
      OUTPUT INSERTED.identificador AS id
      VALUES (
        @cliente, 'cuenta_bancaria', 'verificado', 'ARS', N'Demo Competitor',
        N'DEMO LIVE Auction', '4242', 500000.00, 500000.00, @verificador, SYSUTCDATETIME()
      )
    `);
  const id = ins.recordset[0]?.id;
  if (id == null) {
    throw new Error("Failed to create competitor payment method.");
  }
  return id;
}

async function ensureProductPhotos(pool: sql.ConnectionPool, productId: number): Promise<void> {
  await pool.request().input("producto", sql.Int, productId).query(`
    DELETE FROM dbo.fotos WHERE producto = @producto
  `);
  for (let i = 1; i <= 6; i += 1) {
    await pool
      .request()
      .input("producto", sql.Int, productId)
      .input("foto", sql.VarBinary(sql.MAX), demoJpeg(i))
      .query(`INSERT INTO dbo.fotos (producto, foto) VALUES (@producto, @foto)`);
  }
}

async function upsertInsurancePolicy(pool: sql.ConnectionPool): Promise<void> {
  await pool
    .request()
    .input("nroPoliza", sql.NVarChar(30), DEMO_INSURANCE.policy)
    .input("compania", sql.NVarChar(150), DEMO_INSURANCE.company)
    .query(`
      IF EXISTS (SELECT 1 FROM dbo.seguros WHERE nroPoliza = @nroPoliza)
        UPDATE dbo.seguros SET compania = @compania WHERE nroPoliza = @nroPoliza;
      ELSE
        INSERT INTO dbo.seguros (nroPoliza, compania, polizaCombinada, importe)
        VALUES (@nroPoliza, @compania, N'no', 1);
    `);
}

async function insertDemoProduct(
  pool: sql.ConnectionPool,
  spec: DemoItemSpec,
  ownerId: number,
  reviewerId: number
): Promise<number> {
  await upsertInsurancePolicy(pool);

  const ins = await pool
    .request()
    .input("revisor", sql.Int, reviewerId)
    .input("duenio", sql.Int, ownerId)
    .input("title", sql.NVarChar(500), spec.title)
    .input("desc", sql.NVarChar(2000), spec.description)
    .input("numeroPieza", sql.NVarChar(50), spec.pieceNumber)
    .input("componentes", sql.NVarChar(1000), spec.components)
    .input("artista", sql.NVarChar(200), spec.artistOrDesigner ?? null)
    .input("fechaOrigen", sql.NVarChar(50), spec.originDate ?? null)
    .input("historia", sql.NVarChar(2000), spec.history ?? null)
    .input("deposito", sql.NVarChar(250), DEMO_DEPOSIT)
    .input("seguro", sql.NVarChar(30), DEMO_INSURANCE.policy)
    .query<{ id: number }>(`
      INSERT INTO dbo.productos (
        fecha, disponible, descripcionCatalogo, descripcionCompleta, revisor, duenio, seguro,
        numeroPieza, componentes, artistaODisenador, fechaOrigen, historia, depositoUbicacion
      )
      OUTPUT INSERTED.identificador AS id
      VALUES (
        CAST(GETDATE() AS date), 'si', @title, @desc, @revisor, @duenio, @seguro,
        @numeroPieza, @componentes, @artista, @fechaOrigen, @historia, @deposito
      )
    `);
  const productId = ins.recordset[0]?.id;
  if (productId == null) {
    throw new Error(`Failed to insert product ${spec.pieceNumber}`);
  }
  await ensureProductPhotos(pool, productId);
  return productId;
}

async function createLiveAuction(
  pool: sql.ConnectionPool,
  subastadorId: number,
  reviewerId: number,
  demoRun: DemoRunContext
): Promise<{ auctionId: number; catalogId: number; itemIds: number[] }> {
  await pool.request().query(`ALTER TABLE dbo.subastas NOCHECK CONSTRAINT chkFecha`);

  const auctionIns = await pool
    .request()
    .input("subastador", sql.Int, subastadorId)
    .input("ubicacion", sql.NVarChar(350), demoRun.ubicacion)
    .query<{ id: number }>(`
      INSERT INTO dbo.subastas (
        fecha, hora, horaFin, estado, subastador, ubicacion,
        capacidadAsistentes, tieneDeposito, seguridadPropia, categoria, moneda
      )
      OUTPUT INSERTED.identificador AS id
      VALUES (
        CAST(GETDATE() AS date),
        CAST(DATEADD(minute, -1, GETDATE()) AS time),
        CAST(DATEADD(hour, 2, GETDATE()) AS time),
        'abierta',
        @subastador,
        @ubicacion,
        80,
        N'si',
        N'si',
        N'comun',
        'ARS'
      )
    `);

  await pool.request().query(`ALTER TABLE dbo.subastas CHECK CONSTRAINT chkFecha`);

  const auctionId = auctionIns.recordset[0]?.id;
  if (auctionId == null) {
    throw new Error("Failed to create demo auction.");
  }

  const catIns = await pool
    .request()
    .input("desc", sql.NVarChar(250), demoRun.catalogDesc)
    .input("subasta", sql.Int, auctionId)
    .input("responsable", sql.Int, reviewerId)
    .query<{ id: number }>(`
      INSERT INTO dbo.catalogos (descripcion, subasta, responsable)
      OUTPUT INSERTED.identificador AS id
      VALUES (@desc, @subasta, @responsable)
    `);
  const catalogId = catIns.recordset[0]?.id;
  if (catalogId == null) {
    throw new Error("Failed to create demo catalog.");
  }

  const itemIds: number[] = [];
  for (const spec of demoRun.items) {
    const productId = await insertDemoProduct(pool, spec, DEMO_OWNER.personaId, reviewerId);
    const itemIns = await pool
      .request()
      .input("catalogo", sql.Int, catalogId)
      .input("producto", sql.Int, productId)
      .input("precioBase", sql.Decimal(18, 2), spec.basePrice)
      .query<{ id: number }>(`
        INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
        OUTPUT INSERTED.identificador AS id
        VALUES (@catalogo, @producto, @precioBase, 1000.00, N'no')
      `);
    const itemId = itemIns.recordset[0]?.id;
    if (itemId == null) {
      throw new Error(`Failed to catalog item ${spec.pieceNumber}`);
    }
    itemIds.push(itemId);

    await notifySubmissionCustodyUpdated({
      ownerDuenioId: DEMO_OWNER.personaId,
      submissionId: productId,
      itemTitle: spec.title,
      auctionId,
      catalogItemId: itemId,
      kind: "both",
      depositLocation: DEMO_DEPOSIT,
      insurancePolicy: DEMO_INSURANCE.policy,
      insuranceCompany: DEMO_INSURANCE.company,
    });
  }

  return { auctionId, catalogId, itemIds };
}

async function seedCompetitorOpeningBid(
  auctionId: number,
  itemId: number,
  basePrice: number,
  paymentMethodId: number
): Promise<void> {
  const asistente = await insertAsistenteInTransaction(DEMO_COMPETITOR.personaId, auctionId);
  const bidAmount = 10100;

  validateBidAmountRules(bidAmount, basePrice, basePrice, "comun");

  await insertBidInTransaction({
    asistenteId: asistente.identificador,
    itemId,
    importe: bidAmount,
    basePrice,
    auctionCategory: "comun",
    clienteId: DEMO_COMPETITOR.personaId,
    paymentMethodId,
    auctionCurrency: "ARS",
    validateAmount: validateBidAmountRules,
  });
}

async function printSummary(params: {
  demoRun: DemoRunContext;
  auctionId: number;
  itemIds: number[];
  paymentMethodId: number;
  password: string;
}): Promise<void> {
  const { demoRun, auctionId, itemIds, paymentMethodId, password } = params;
  const [lot1, lot2, lot3] = itemIds;

  console.info("\n=== Live auction demo ready ===");
  console.info(`Run id: ${demoRun.runId}`);
  console.info(`Auction: #${auctionId} — "${demoRun.ubicacion}"`);
  console.info("Window: started ~1 min ago, ends in ~10 minutes from seed time.");
  console.info(`Items: #${lot1} (${demoRun.items[0]?.pieceNumber}), #${lot2} (${demoRun.items[1]?.pieceNumber}), #${lot3} (${demoRun.items[2]?.pieceNumber})`);
  console.info(`Competitor opening bid on item #${lot1}: ARS 10,100 (winning)`);
  console.info(`Your next valid bid on item #${lot1}: from ARS 10,200 to ARS 12,100`);
  console.info("");
  console.info("Users (password for both):", password);
  console.info(`  Owner:      ${DEMO_OWNER.email}`);
  console.info(`  Competitor: ${DEMO_COMPETITOR.email}`);
  console.info("");
  console.info("Manual test flow:");
  console.info("  1. Login with your user (admitted + verified payment method ARS).");
  console.info("  2. Open live auction in app → item 1 should show competitor winning at 10,100.");
  console.info("  3. Enter live room, bid 10,200+ to take the lead.");
  console.info("  4. Employee closes item: POST /api/subastas/:id/items/:itemId/cerrar");
  console.info("  5. Repeat for items 2 and 3.");
  console.info("");
  console.info("Postman / API hints:");
  console.info(`  GET  /api/subastas/${auctionId}`);
  console.info(`  GET  /api/subastas/${auctionId}/items`);
  console.info(`  GET  /api/subastas/${auctionId}/live?itemId=${lot1}`);
  console.info(`  POST /api/subastas/${auctionId}/asistentes`);
  console.info(`  POST /api/subastas/${auctionId}/pujos  { itemId, amount, paymentMethodId }`);
  console.info(`  POST /api/subastas/${auctionId}/items/${lot1}/cerrar`);
  console.info(`  Competitor paymentMethodId (reference): ${paymentMethodId}`);
  console.info("");
  console.info("Owner visibility: login as demo.owner → Mis artículos / notifications.");
  console.info("Docs: docs/live-auction-demo.md");
}

async function main(): Promise<void> {
  const env = loadEnv();
  let reviewerId: number;
  try {
    reviewerId = getDefaultReviewerEmployeeId();
  } catch {
    reviewerId = 1;
    console.warn("[live-demo] DEFAULT_REVIEWER_EMPLOYEE_ID unset — using 1");
  }

  const password = process.env.SEED_LIVE_DEMO_PASSWORD?.trim() || DEMO_PASSWORD_DEFAULT;
  const passwordHash = await hashPassword(password);

  console.info("[live-demo] Connecting to SQL Server…");
  const pool = await sql.connect(env.sqlServerConnectionString);

  try {
    if (!(await tableExists(pool, "dbo.subastas"))) {
      throw new Error("dbo.subastas not found. Run database/schema.sql and migrations.");
    }

    const demoRun = createDemoRunContext();
    console.info(`[live-demo] Creating new auction run ${demoRun.runId}…`);

    await ensureSubastador(pool);
    await ensureClienteUser(pool, DEMO_OWNER, passwordHash, reviewerId);
    await ensureClienteUser(pool, DEMO_COMPETITOR, passwordHash, reviewerId);
    const paymentMethodId = await ensureCompetitorPaymentMethod(pool, reviewerId);

    const { auctionId, itemIds } = await createLiveAuction(
      pool,
      DEMO_SUBASTADOR.personaId,
      reviewerId,
      demoRun
    );
    await seedCompetitorOpeningBid(auctionId, itemIds[0]!, demoRun.items[0]!.basePrice, paymentMethodId);

    await printSummary({ demoRun, auctionId, itemIds, paymentMethodId, password });
    console.info("\n[live-demo] Done.");
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error("[live-demo] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
