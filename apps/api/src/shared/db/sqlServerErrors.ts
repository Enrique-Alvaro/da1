import { BadRequestError, ConflictError } from "../errors/httpErrors";

/**
 * SQL Server error numbers surfaced by the `mssql` driver.
 * @see https://learn.microsoft.com/en-us/sql/relational-databases/errors-events/database-engine-events-and-errors
 */
export function getSqlErrorNumber(err: unknown): number | undefined {
  const e = err as {
    number?: number;
    originalError?: { number?: number; info?: { number?: number } };
  };
  return e.number ?? e.originalError?.number ?? e.originalError?.info?.number;
}

/** Duplicate key / unique index */
export function isSqlDuplicateKey(err: unknown): boolean {
  const n = getSqlErrorNumber(err);
  return n === 2601 || n === 2627;
}

export function isSqlForeignKeyViolation(err: unknown): boolean {
  return getSqlErrorNumber(err) === 547;
}

/**
 * Re-throws known constraint errors as operational HTTP errors.
 * Call from repository `catch` blocks; otherwise rethrow `err`.
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
