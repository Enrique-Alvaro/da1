import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

/**
 * Phase 1: SQL Server ADO connection string from env (first match wins):
 * SQLSERVER_CONNECTION_STRING → SQL_SERVER_CONNECTION_STRING → DATABASE_URL
 */
const rawSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  SQLSERVER_CONNECTION_STRING: z.string().optional(),
  /** Same value; common alternate name (underscore before SERVER) */
  SQL_SERVER_CONNECTION_STRING: z.string().optional(),
  /** @deprecated Prefer SQLSERVER_CONNECTION_STRING */
  DATABASE_URL: z.string().optional(),

  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().optional(),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().positive().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  FRONTEND_URL: z.string().optional(),
});

export type Env = z.infer<typeof rawSchema> & {
  sqlServerConnectionString: string;
};

let cached: Env | null = null;

function resolveConnectionString(data: z.infer<typeof rawSchema>): string {
  const primary = data.SQLSERVER_CONNECTION_STRING?.trim();
  const sqlServerUnderscore = data.SQL_SERVER_CONNECTION_STRING?.trim();
  const legacy = data.DATABASE_URL?.trim();
  const conn = primary || sqlServerUnderscore || legacy;
  if (!conn) {
    throw new Error(
      "Missing connection string: set SQLSERVER_CONNECTION_STRING, SQL_SERVER_CONNECTION_STRING, or DATABASE_URL."
    );
  }
  if (conn.includes("jdbc:")) {
    throw new Error(
      "Connection string looks like JDBC; use ADO style for Node (Server=...;Database=...;User Id=...;Password=...)."
    );
  }
  return conn;
}

export function loadEnv(): Env {
  if (cached) {
    return cached;
  }
  const parsed = rawSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  const data = parsed.data;
  const sqlServerConnectionString = resolveConnectionString(data);
  cached = { ...data, sqlServerConnectionString };
  return cached;
}

export function getEnv(): Env {
  if (!cached) {
    return loadEnv();
  }
  return cached;
}
