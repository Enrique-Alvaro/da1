import { BadRequestError, ConflictError } from "../errors/httpErrors";

/**
 * Números de error de SQL Server expuestos por el driver `mssql`.
 * @see https://learn.microsoft.com/en-us/sql/relational-databases/errors-events/database-engine-events-and-errors
 */
export function getSqlErrorNumber(err: unknown): number | undefined {
  const e = err as {
    number?: number;
    originalError?: { number?: number; info?: { number?: number } };
  };
  return e.number ?? e.originalError?.number ?? e.originalError?.info?.number;
}

/** Clave duplicada / índice único */
export function isSqlDuplicateKey(err: unknown): boolean {
  const n = getSqlErrorNumber(err);
  return n === 2601 || n === 2627;
}

export function isSqlForeignKeyViolation(err: unknown): boolean {
  return getSqlErrorNumber(err) === 547;
}

/**
 * Relanza errores de restricción conocidos como errores HTTP operacionales.
 * Llamar desde bloques `catch` del repositorio; si no aplica, relanzar `err`.
 */
export function throwIfSqlConstraintViolation(err: unknown, context: string): void {
  if (isSqlDuplicateKey(err)) {
    throw new ConflictError(`${context}: ya existe un registro con esos datos únicos.`);
  }
  if (isSqlForeignKeyViolation(err)) {
    throw new BadRequestError(
      `${context}: no se pudo completar la operación por integridad referencial (clave foránea).`
    );
  }
}
