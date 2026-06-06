/**
 * Aprueba un cliente por email (admitido = 'si').
 * Uso: desde apps/api → npx tsx scripts/approve-client.ts <email> [categoria]
 * Categorías válidas: comun | especial | plata | oro | platino  (default: comun)
 *
 * Ejemplo:
 *   npx tsx scripts/approve-client.ts usuario@ejemplo.com
 *   npx tsx scripts/approve-client.ts usuario@ejemplo.com plata
 */
import "dotenv/config";
import sql from "mssql";
import { loadEnv } from "../src/config/env";

const VALID_CATEGORIES = ["comun", "especial", "plata", "oro", "platino"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  const categoriaArg = process.argv[3]?.trim().toLowerCase();

  if (!email) {
    console.error("Uso: npx tsx scripts/approve-client.ts <email> [categoria]");
    console.error("Categorías: comun | especial | plata | oro | platino");
    process.exit(1);
  }

  const categoria: Category =
    categoriaArg && (VALID_CATEGORIES as readonly string[]).includes(categoriaArg)
      ? (categoriaArg as Category)
      : "comun";

  const env = loadEnv();
  const pool = await sql.connect(env.sqlServerConnectionString);

  try {
    // Buscar el cliente por email
    const findResult = await pool
      .request()
      .input("email", sql.NVarChar(200), email)
      .query<{ identificador: number; nombre: string; admitido: string; categoria: string }>(`
        SELECT TOP (1)
          c.identificador,
          p.nombre,
          c.admitido,
          c.categoria
        FROM dbo.clientes AS c
        INNER JOIN dbo.personas AS p ON p.identificador = c.identificador
        INNER JOIN dbo.cliente_credenciales AS cc ON cc.persona_id = c.identificador
        WHERE LOWER(cc.email) = @email
      `);

    const client = findResult.recordset[0];
    if (!client) {
      console.error(`No se encontró ningún cliente con email: ${email}`);
      process.exit(1);
    }

    console.info(`Cliente encontrado:`);
    console.info(`  ID:        ${client.identificador}`);
    console.info(`  Nombre:    ${client.nombre}`);
    console.info(`  Estado actual: admitido=${client.admitido}, categoria=${client.categoria}`);

    // Aprobar
    await pool
      .request()
      .input("id", sql.Int, client.identificador)
      .input("categoria", sql.NVarChar(10), categoria)
      .query(`
        UPDATE dbo.clientes
        SET admitido = 'si', categoria = @categoria
        WHERE identificador = @id
      `);

    console.info(`\n✓ Cliente aprobado correctamente.`);
    console.info(`  admitido = si`);
    console.info(`  categoria = ${categoria}`);
  } finally {
    await pool.close();
  }
}

main().catch((e) => {
  console.error("Error:", e?.message ?? e);
  process.exit(1);
});
