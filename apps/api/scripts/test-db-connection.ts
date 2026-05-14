/**
 * Prueba rápida de conectividad a SQL Server (CLI).
 * Uso: desde apps/api → npm run db:test
 */
import "dotenv/config";
import sql from "mssql";
import { loadEnv } from "../src/config/env";

async function main(): Promise<void> {
  const env = loadEnv();
  const connStr = env.sqlServerConnectionString;

  console.info("Intentando conectar…");
  let pool: sql.ConnectionPool;
  try {
    pool = await sql.connect(connStr);
  } catch (err) {
    console.error("No se pudo abrir el pool de conexión:", err);
    process.exit(1);
  }

  try {
    const result = await pool.request().query(`
      SELECT 1 AS ok,
             DB_NAME() AS current_database,
             SUSER_SNAME() AS login_name
    `);
    const row = result.recordset[0] as { ok: number; current_database: string; login_name: string };
    console.info("Conexión OK.");
    console.info("  Base actual:", row.current_database);
    console.info("  Sesión como:", row.login_name);
  } catch (err) {
    console.error("Conectó pero falló la consulta de prueba:", err);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
