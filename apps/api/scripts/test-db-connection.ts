/**
 * Prueba rápida de conectividad a SQL Server.
 * Uso: desde apps/api → npm run db:test
 */
import "dotenv/config";
import sql from "mssql";

async function main(): Promise<void> {
  const connStr = process.env.DATABASE_URL?.trim();
  if (!connStr) {
    console.error(
      "Falta DATABASE_URL en .env. Ejemplo:\n" +
        '  DATABASE_URL=Server=localhost,1433;Database=CrownBid;User Id=sa;Password=tu_clave;Encrypt=true;TrustServerCertificate=true'
    );
    process.exit(1);
  }

  if (connStr.includes("jdbc:")) {
    console.error(
      "DATABASE_URL parece formato JDBC. En Node.js usá cadena estilo ADO, por ejemplo:\n" +
        "  Server=localhost,1433;Database=CrownBid;User Id=...;Password=...;Encrypt=true;TrustServerCertificate=true"
    );
    process.exit(1);
  }

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
