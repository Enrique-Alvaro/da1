import sql from "mssql";
import { getEnv } from "../config/env";

let poolPromise: Promise<sql.ConnectionPool> | null = null;

/**
 * Singleton connection pool for SQL Server (mssql driver).
 */
export async function getSqlPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    const connStr = getEnv().sqlServerConnectionString;
    poolPromise = sql.connect(connStr).catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

export async function closeSqlPool(): Promise<void> {
  if (!poolPromise) {
    return;
  }
  try {
    const pool = await poolPromise;
    await pool.close();
  } finally {
    poolPromise = null;
  }
}

/** Read-only connectivity check for health probes */
export async function testSqlConnection(): Promise<{ ok: true }> {
  const pool = await getSqlPool();
  const result = await pool.request().query("SELECT 1 AS ok");
  const row = result.recordset[0] as { ok: number } | undefined;
  if (row?.ok !== 1) {
    throw new Error("Unexpected result from database health check");
  }
  return { ok: true };
}
