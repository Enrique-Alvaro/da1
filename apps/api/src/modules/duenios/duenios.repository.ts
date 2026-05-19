import sql from "mssql";
import { getSqlPool } from "../../db/sqlServer";
import { getDefaultReviewerEmployeeId } from "../../config/env";
import { InternalServerError } from "../../shared/errors/httpErrors";

export type DuenioRow = {
  identificador: number;
  numeroPais: number | null;
};

/**
 * Resuelve dbo.duenios para la misma persona que el cliente autenticado.
 * Crea la fila en duenios si no existe (mismo identificador que personas).
 */
export async function findOrCreateDuenioForPersona(
  personaId: number,
  numeroPais: number | null
): Promise<number> {
  const pool = await getSqlPool();
  const existing = await pool
    .request()
    .input("id", sql.Int, personaId)
    .query<DuenioRow>(`
      SELECT TOP (1) identificador, numeroPais
      FROM dbo.duenios
      WHERE identificador = @id
    `);
  if (existing.recordset[0]) {
    return existing.recordset[0].identificador;
  }

  const verificador = getDefaultReviewerEmployeeId();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const checkPersona = new sql.Request(tx);
    checkPersona.input("id", sql.Int, personaId);
    const pRes = await checkPersona.query<{ n: number }>(`
      SELECT COUNT_BIG(1) AS n FROM dbo.personas WHERE identificador = @id
    `);
    if ((pRes.recordset[0]?.n ?? 0) < 1) {
      throw new InternalServerError("Persona no encontrada para alta de dueño.");
    }

    const checkEmp = new sql.Request(tx);
    checkEmp.input("verificador", sql.Int, verificador);
    const eRes = await checkEmp.query<{ n: number }>(`
      SELECT COUNT_BIG(1) AS n FROM dbo.empleados WHERE identificador = @verificador
    `);
    if ((eRes.recordset[0]?.n ?? 0) < 1) {
      throw new InternalServerError(
        "DEFAULT_REVIEWER_EMPLOYEE_ID no existe en dbo.empleados."
      );
    }

    const ins = new sql.Request(tx);
    ins.input("identificador", sql.Int, personaId);
    ins.input("numeroPais", sql.Int, numeroPais);
    ins.input("verificador", sql.Int, verificador);
    await ins.query(`
      INSERT INTO dbo.duenios (
        identificador,
        numeroPais,
        verificacionFinanciera,
        verificacionJudicial,
        calificacionRiesgo,
        verificador
      )
      VALUES (
        @identificador,
        @numeroPais,
        N'no',
        N'no',
        1,
        @verificador
      )
    `);
    await tx.commit();
    return personaId;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function findDuenioIdByPersona(personaId: number): Promise<number | null> {
  const pool = await getSqlPool();
  const result = await pool
    .request()
    .input("id", sql.Int, personaId)
    .query<{ identificador: number }>(`
      SELECT TOP (1) identificador
      FROM dbo.duenios
      WHERE identificador = @id
    `);
  return result.recordset[0]?.identificador ?? null;
}
