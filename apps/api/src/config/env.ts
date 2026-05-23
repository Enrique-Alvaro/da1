import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

/**
 * Fase 1: cadena de conexión ADO a SQL Server desde env (primer valor definido gana):
 * SQLSERVER_CONNECTION_STRING → SQL_SERVER_CONNECTION_STRING → DATABASE_URL
 */
const rawSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  SQLSERVER_CONNECTION_STRING: z.string().optional(),
  /** Mismo valor; nombre alternativo habitual (guión bajo antes de SERVER) */
  SQL_SERVER_CONNECTION_STRING: z.string().optional(),
  /** @deprecated Preferir SQLSERVER_CONNECTION_STRING */
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
  /** TTL del enlace de restablecimiento de contraseña; por defecto 30 en código si no está definido. */
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().optional(),

  /** Empleado revisor inicial en alta de producto (FK productos.revisor). */
  DEFAULT_REVIEWER_EMPLOYEE_ID: z.coerce.number().int().positive().optional(),

  /** Login TPO empleado/admin (sin tabla de credenciales de empleado). */
  EMPLOYEE_ADMIN_EMAIL: z.string().optional(),
  EMPLOYEE_ADMIN_PASSWORD: z.string().optional(),
  EMPLOYEE_ADMIN_ID: z.coerce.number().int().positive().optional(),

  /**
   * Cliente (dbo.clientes.identificador = personas.identificador) que representa a la empresa
   * cuando un ítem se adjudica sin pujas. Requerido para persistir registroDeSubasta en ese caso.
   */
  COMPANY_CLIENT_ID: z.coerce.number().int().positive().optional(),
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

  if (data.NODE_ENV === "production" && !data.JWT_SECRET?.trim()) {
    throw new Error("JWT_SECRET is required in production");
  }

  cached = { ...data, sqlServerConnectionString };
  return cached;
}

export function getEnv(): Env {
  if (!cached) {
    return loadEnv();
  }
  return cached;
}

/** Minutos hasta que expire el token de restablecimiento (override en env o 30). */
export function getPasswordResetTtlMinutes(): number {
  return getEnv().PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 30;
}

export function getDefaultReviewerEmployeeId(): number {
  const id = getEnv().DEFAULT_REVIEWER_EMPLOYEE_ID;
  if (id === undefined || !Number.isSafeInteger(id) || id <= 0) {
    throw new Error(
      "DEFAULT_REVIEWER_EMPLOYEE_ID is required for product submissions. Set it in apps/api/.env (must exist in dbo.empleados)."
    );
  }
  return id;
}

export function getCompanyClientId(): number | null {
  const id = getEnv().COMPANY_CLIENT_ID;
  if (id === undefined || !Number.isSafeInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export function getEmployeeAdminCredentials(): {
  email: string;
  password: string;
  employeeId: number;
} | null {
  const env = getEnv();
  const email = env.EMPLOYEE_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.EMPLOYEE_ADMIN_PASSWORD;
  const employeeId = env.EMPLOYEE_ADMIN_ID;
  if (!email || !password || employeeId === undefined) {
    return null;
  }
  return { email, password, employeeId };
}
