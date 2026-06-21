/**
 * Idempotent demo seed for CrownBid SQL Server (server / local).
 *
 * Usage (from repo root):
 *   npm run seed:demo --workspace @crownbid/api
 *
 * Usage (from apps/api):
 *   npm run seed:demo
 *
 * Server example:
 *   cd /opt/crownbid
 *   set -a && source .env && set +a
 *   export SQLSERVER_CONNECTION_STRING="Server=127.0.0.1,1433;Database=CrownBid;User Id=sa;Password=...;Encrypt=true;TrustServerCertificate=true"
 *   export SEED_DEMO_PASSWORD='YourDemoPassword1!'
 *   npm run seed:demo --workspace @crownbid/api
 *
 * Requires backend env: SQLSERVER_CONNECTION_STRING (or DB_HOST + DB_NAME + DB_USER + DB_PASSWORD).
 * Optional: SEED_DEMO_PASSWORD — if set, creates/updates demo client credentials.
 * Optional: DEFAULT_REVIEWER_EMPLOYEE_ID (default 1) — empleado verificador FK.
 */
import "dotenv/config";
import sql from "mssql";
import { loadEnv, getDefaultReviewerEmployeeId } from "../src/config/env";
import { hashPassword } from "../src/shared/security/passwords";

const DEMO_AUCTION_LOCATION = "CrownBid Demo — Buenos Aires";
const DEMO_CATALOG_DESC = "CrownBid Demo — Catálogo general";

/** ISO 3166-1 numeric codes used as dbo.paises.numero (PK). */
const COUNTRIES: Array<{
  numero: number;
  nombre: string;
  nombreCorto: string;
  capital: string;
  nacionalidad: string;
  idiomas: string;
}> = [
  { numero: 1, nombre: "Argentina", nombreCorto: "AR", capital: "Buenos Aires", nacionalidad: "Argentina", idiomas: "Español" },
  { numero: 858, nombre: "Uruguay", nombreCorto: "UY", capital: "Montevideo", nacionalidad: "Uruguaya", idiomas: "Español" },
  { numero: 152, nombre: "Chile", nombreCorto: "CL", capital: "Santiago", nacionalidad: "Chilena", idiomas: "Español" },
  { numero: 76, nombre: "Brasil", nombreCorto: "BR", capital: "Brasilia", nacionalidad: "Brasileña", idiomas: "Portugués" },
  { numero: 724, nombre: "España", nombreCorto: "ES", capital: "Madrid", nacionalidad: "Española", idiomas: "Español" },
  { numero: 840, nombre: "Estados Unidos", nombreCorto: "US", capital: "Washington D.C.", nacionalidad: "Estadounidense", idiomas: "Inglés" },
];

const DEMO_BUYER = {
  email: "buyer@crownbid.demo",
  document: "SEED-BUYER-001",
  name: "Cliente Demo Comprador",
  address: "CABA, Argentina",
  countryNumero: 1,
  categoria: "platino" as const,
};

const DEMO_SELLER = {
  document: "SEED-SELLER-001",
  name: "Vendedor Demo CrownBid",
};

const FIXED_IDS = {
  reviewerEmpleado: 1,
  revisorPersona: 9100,
  subastadorPersona: 9101,
  duenioPersona: 9102,
};

async function tableExists(pool: sql.ConnectionPool, table: string): Promise<boolean> {
  const result = await pool
    .request()
    .input("table", sql.NVarChar(128), table)
    .query<{ ok: number }>(`
      SELECT CASE WHEN OBJECT_ID(@table, 'U') IS NOT NULL THEN 1 ELSE 0 END AS ok
    `);
  return result.recordset[0]?.ok === 1;
}

async function seedCountries(pool: sql.ConnectionPool): Promise<number> {
  let inserted = 0;
  for (const country of COUNTRIES) {
    const result = await pool
      .request()
      .input("numero", sql.Int, country.numero)
      .input("nombre", sql.NVarChar(250), country.nombre)
      .input("nombreCorto", sql.NVarChar(250), country.nombreCorto)
      .input("capital", sql.NVarChar(250), country.capital)
      .input("nacionalidad", sql.NVarChar(250), country.nacionalidad)
      .input("idiomas", sql.NVarChar(150), country.idiomas)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.paises WHERE numero = @numero)
        BEGIN
          INSERT INTO dbo.paises (numero, nombre, nombreCorto, capital, nacionalidad, idiomas)
          VALUES (@numero, @nombre, @nombreCorto, @capital, @nacionalidad, @idiomas);
          SELECT 1 AS inserted;
        END
        ELSE
          SELECT 0 AS inserted;
      `);
    if (result.recordset[0]?.inserted === 1) inserted += 1;
  }
  return inserted;
}

async function seedReviewerEmployee(pool: sql.ConnectionPool, employeeId: number): Promise<void> {
  await pool
    .request()
    .input("id", sql.Int, employeeId)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.empleados WHERE identificador = @id)
        INSERT INTO dbo.empleados (identificador, cargo, sector)
        VALUES (@id, N'Verificador registro cliente', NULL);
    `);
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
      SET IDENTITY_INSERT dbo.personas OFF;
    `);
}

async function seedAuctionDomain(pool: sql.ConnectionPool, reviewerId: number): Promise<void> {
  if (!(await tableExists(pool, "dbo.subastas"))) {
    console.warn("[seed] dbo.subastas not found — skipping auction demo data.");
    return;
  }

  await ensurePersona(pool, FIXED_IDS.revisorPersona, "SEED-REV-9100", "Revisor Demo CrownBid", "Oficina CrownBid");
  await ensurePersona(pool, FIXED_IDS.subastadorPersona, "SEED-SUB-9101", "Subastador Demo CrownBid", "Buenos Aires");
  await ensurePersona(pool, FIXED_IDS.duenioPersona, DEMO_SELLER.document, DEMO_SELLER.name, "CABA");

  await pool
    .request()
    .input("id", sql.Int, FIXED_IDS.revisorPersona)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.empleados WHERE identificador = @id)
        INSERT INTO dbo.empleados (identificador, cargo, sector) VALUES (@id, N'Revisor demo', NULL);
    `);

  await pool
    .request()
    .input("id", sql.Int, FIXED_IDS.subastadorPersona)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.subastadores WHERE identificador = @id)
        INSERT INTO dbo.subastadores (identificador, matricula, region) VALUES (@id, 'SEED-MAT-01', 'Argentina');
    `);

  await pool
    .request()
    .input("id", sql.Int, FIXED_IDS.duenioPersona)
    .input("verificador", sql.Int, reviewerId)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.duenios WHERE identificador = @id)
        INSERT INTO dbo.duenios (identificador, numeroPais, verificacionFinanciera, verificacionJudicial, calificacionRiesgo, verificador)
        VALUES (@id, 1, 'si', 'si', 2, @verificador);
    `);

  const productCheck = await pool.request().query<{ id: number | null }>(`
    SELECT TOP (1) identificador AS id
    FROM dbo.productos
    WHERE descripcionCompleta LIKE N'CrownBid Demo —%'
    ORDER BY identificador ASC
  `);

  let productId = productCheck.recordset[0]?.id ?? null;
  if (productId == null) {
    const ins = await pool
      .request()
      .input("revisor", sql.Int, FIXED_IDS.revisorPersona)
      .input("duenio", sql.Int, FIXED_IDS.duenioPersona)
      .query<{ id: number }>(`
        INSERT INTO dbo.productos (fecha, disponible, descripcionCatalogo, descripcionCompleta, revisor, duenio, seguro)
        OUTPUT INSERTED.identificador AS id
        VALUES (
          CAST(GETDATE() AS date),
          'si',
          N'CrownBid Demo — Reloj clásico',
          N'CrownBid Demo — Reloj clásico en excelente estado para pruebas de subasta.',
          @revisor,
          @duenio,
          NULL
        );
      `);
    productId = ins.recordset[0]?.id ?? null;
  }

  const auctionCheck = await pool
    .request()
    .input("ubicacion", sql.NVarChar(350), DEMO_AUCTION_LOCATION)
    .query<{ id: number | null }>(`
      SELECT TOP (1) identificador AS id
      FROM dbo.subastas
      WHERE ubicacion = @ubicacion
      ORDER BY identificador ASC
    `);

  let auctionId = auctionCheck.recordset[0]?.id ?? null;
  if (auctionId == null) {
    const hasMoneda = await pool.request().query<{ ok: number }>(`
      SELECT CASE WHEN COL_LENGTH('dbo.subastas', 'moneda') IS NOT NULL THEN 1 ELSE 0 END AS ok
    `);
    const insAuction = hasMoneda.recordset[0]?.ok
      ? await pool
          .request()
          .input("subastador", sql.Int, FIXED_IDS.subastadorPersona)
          .input("ubicacion", sql.NVarChar(350), DEMO_AUCTION_LOCATION)
          .query<{ id: number }>(`
            INSERT INTO dbo.subastas (
              fecha, hora, estado, subastador, ubicacion,
              capacidadAsistentes, tieneDeposito, seguridadPropia, categoria, moneda
            )
            OUTPUT INSERTED.identificador AS id
            VALUES (
              DATEADD(day, 15, CAST(GETDATE() AS date)),
              '18:00:00',
              'abierta',
              @subastador,
              @ubicacion,
              150,
              'si',
              'si',
              'comun',
              'ARS'
            );
          `)
      : await pool
          .request()
          .input("subastador", sql.Int, FIXED_IDS.subastadorPersona)
          .input("ubicacion", sql.NVarChar(350), DEMO_AUCTION_LOCATION)
          .query<{ id: number }>(`
            INSERT INTO dbo.subastas (
              fecha, hora, estado, subastador, ubicacion,
              capacidadAsistentes, tieneDeposito, seguridadPropia, categoria
            )
            OUTPUT INSERTED.identificador AS id
            VALUES (
              DATEADD(day, 15, CAST(GETDATE() AS date)),
              '18:00:00',
              'abierta',
              @subastador,
              @ubicacion,
              150,
              'si',
              'si',
              'comun'
            );
          `);
    auctionId = insAuction.recordset[0]?.id ?? null;
  }

  if (auctionId == null || productId == null) return;

  const catalogCheck = await pool
    .request()
    .input("desc", sql.NVarChar(250), DEMO_CATALOG_DESC)
    .input("subasta", sql.Int, auctionId)
    .query<{ id: number | null }>(`
      SELECT TOP (1) identificador AS id
      FROM dbo.catalogos
      WHERE descripcion = @desc AND subasta = @subasta
    `);

  let catalogId = catalogCheck.recordset[0]?.id ?? null;
  if (catalogId == null) {
    const insCat = await pool
      .request()
      .input("desc", sql.NVarChar(250), DEMO_CATALOG_DESC)
      .input("subasta", sql.Int, auctionId)
      .input("responsable", sql.Int, FIXED_IDS.revisorPersona)
      .query<{ id: number }>(`
        INSERT INTO dbo.catalogos (descripcion, subasta, responsable)
        OUTPUT INSERTED.identificador AS id
        VALUES (@desc, @subasta, @responsable);
      `);
    catalogId = insCat.recordset[0]?.id ?? null;
  }

  if (catalogId == null) return;

  await pool
    .request()
    .input("catalogo", sql.Int, catalogId)
    .input("producto", sql.Int, productId)
    .query(`
      IF NOT EXISTS (
        SELECT 1 FROM dbo.itemsCatalogo WHERE catalogo = @catalogo AND producto = @producto
      )
        INSERT INTO dbo.itemsCatalogo (catalogo, producto, precioBase, comision, subastado)
        VALUES (@catalogo, @producto, 1000.00, 100.00, 'no');
    `);
}

async function seedDemoBuyer(
  pool: sql.ConnectionPool,
  reviewerId: number,
  passwordHash: string | null
): Promise<void> {
  if (!(await tableExists(pool, "dbo.cliente_credenciales"))) {
    console.warn("[seed] dbo.cliente_credenciales not found — skipping demo buyer.");
    return;
  }

  const existing = await pool
    .request()
    .input("email", sql.NVarChar(320), DEMO_BUYER.email)
    .query<{ persona_id: number }>(`
      SELECT TOP (1) persona_id FROM dbo.cliente_credenciales WHERE LOWER(email) = LOWER(@email)
    `);

  let personaId = existing.recordset[0]?.persona_id ?? null;

  if (personaId == null) {
    const insPersona = await pool
      .request()
      .input("documento", sql.VarChar(20), DEMO_BUYER.document)
      .input("nombre", sql.VarChar(150), DEMO_BUYER.name)
      .input("direccion", sql.VarChar(250), DEMO_BUYER.address)
      .query<{ id: number }>(`
        INSERT INTO dbo.personas (documento, nombre, direccion, estado)
        OUTPUT INSERTED.identificador AS id
        VALUES (@documento, @nombre, @direccion, 'activo');
      `);
    personaId = insPersona.recordset[0]?.id ?? null;
  }

  if (personaId == null) return;

  await pool
    .request()
    .input("id", sql.Int, personaId)
    .input("numeroPais", sql.Int, DEMO_BUYER.countryNumero)
    .input("verificador", sql.Int, reviewerId)
    .input("categoria", sql.NVarChar(10), DEMO_BUYER.categoria)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.clientes WHERE identificador = @id)
        INSERT INTO dbo.clientes (identificador, numeroPais, admitido, categoria, verificador)
        VALUES (@id, @numeroPais, 'si', @categoria, @verificador);
      ELSE
        UPDATE dbo.clientes
        SET admitido = 'si', categoria = @categoria, numeroPais = @numeroPais
        WHERE identificador = @id;
    `);

  if (!passwordHash) return;

  await pool
    .request()
    .input("persona_id", sql.Int, personaId)
    .input("email", sql.NVarChar(320), DEMO_BUYER.email)
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

async function printSummary(pool: sql.ConnectionPool): Promise<void> {
  const countries = await pool.request().query(`
    SELECT numero, nombre, nombreCorto FROM dbo.paises ORDER BY nombre
  `);
  const auctions = await pool.request().query(`
    SELECT identificador, fecha, estado, ubicacion, categoria
    FROM dbo.subastas
    WHERE LOWER(LTRIM(RTRIM(estado))) = N'abierta'
    ORDER BY identificador
  `);
  const buyer = await pool
    .request()
    .input("email", sql.NVarChar(320), DEMO_BUYER.email)
    .query(`
      SELECT c.identificador, cc.email, c.admitido, c.categoria, p.nombre
      FROM dbo.cliente_credenciales cc
      INNER JOIN dbo.clientes c ON c.identificador = cc.persona_id
      INNER JOIN dbo.personas p ON p.identificador = c.identificador
      WHERE LOWER(cc.email) = LOWER(@email)
    `);

  console.info("\n=== Seed summary ===");
  console.info(`Countries (${countries.recordset.length}):`);
  for (const row of countries.recordset) {
    console.info(`  - ${row.numero}: ${row.nombre} (${row.nombreCorto ?? ""})`);
  }
  console.info(`Argentina countryId for registration: 1`);
  console.info(`Open auctions (${auctions.recordset.length}):`);
  for (const row of auctions.recordset) {
    console.info(`  - #${row.identificador} ${row.ubicacion} (${row.estado}, ${row.categoria})`);
  }
  const b = buyer.recordset[0];
  if (b) {
    console.info(`Demo buyer: ${b.email} (id=${b.identificador}, admitido=${b.admitido}, categoria=${b.categoria})`);
  } else {
    console.info("Demo buyer: not created (set SEED_DEMO_PASSWORD to create credentials).");
  }
  console.info("Employee admin login uses EMPLOYEE_ADMIN_* env vars (not stored in SQL).");
}

async function main(): Promise<void> {
  const env = loadEnv();
  let reviewerId: number;
  try {
    reviewerId = getDefaultReviewerEmployeeId();
  } catch {
    reviewerId = FIXED_IDS.reviewerEmpleado;
    console.warn(`[seed] DEFAULT_REVIEWER_EMPLOYEE_ID unset — using ${reviewerId}`);
  }

  const demoPassword = process.env.SEED_DEMO_PASSWORD?.trim();
  let passwordHash: string | null = null;
  if (demoPassword) {
    passwordHash = await hashPassword(demoPassword);
  } else {
    console.warn("[seed] SEED_DEMO_PASSWORD not set — countries/auctions will seed; buyer password skipped.");
  }

  console.info("[seed] Connecting to SQL Server…");
  const pool = await sql.connect(env.sqlServerConnectionString);

  try {
    const db = await pool.request().query("SELECT DB_NAME() AS name");
    console.info("[seed] Database:", db.recordset[0]?.name);

    if (!(await tableExists(pool, "dbo.paises"))) {
      throw new Error("dbo.paises not found. Run database/schema.sql first.");
    }

    const countriesInserted = await seedCountries(pool);
    console.info(`[seed] Countries: ${countriesInserted} new row(s), ${COUNTRIES.length} checked.`);

    await seedReviewerEmployee(pool, reviewerId);
    console.info(`[seed] Reviewer employee id=${reviewerId} ensured.`);

    await seedAuctionDomain(pool, reviewerId);
    console.info("[seed] Auction demo domain ensured.");

    await seedDemoBuyer(pool, reviewerId, passwordHash);
    console.info("[seed] Demo buyer ensured.");

    await printSummary(pool);
    console.info("\n[seed] Done (idempotent).");
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error("[seed] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
