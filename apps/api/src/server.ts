import "dotenv/config";
import { createApp } from "./app";
import { loadEnv, getEnv } from "./config/env";
import { getSqlPool, closeSqlPool } from "./db/sqlServer";

async function bootstrap(): Promise<void> {
  loadEnv();
  const env = getEnv();

  let dbWarmup = "skipped";
  try {
    await getSqlPool();
    dbWarmup = "connected";
  } catch (err) {
    console.warn(
      "[startup] SQL Server pool could not be opened — server will run; GET /api/health/db may return 503."
    );
    if (env.NODE_ENV !== "production" && err instanceof Error) {
      console.warn("[startup] DB error:", err.message);
    }
  }
  console.info(`[startup] DB warmup: ${dbWarmup}`);

  if (env.NODE_ENV !== "production" && !env.JWT_SECRET?.trim()) {
    console.warn(
      "[startup] JWT_SECRET not set — POST /api/auth/login will fail until you configure it."
    );
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.info(`crownbid-api listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    console.info(`[shutdown] ${signal}`);
    server.close(() => {
      void closeSqlPool().finally(() => process.exit(0));
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
