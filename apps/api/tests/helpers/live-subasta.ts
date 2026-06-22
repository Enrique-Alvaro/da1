import type { SubastaRow } from "../../src/modules/subastas/subastas.repository";

/** UTC wall-clock time string (matches SQL Server GETDATE() / mssql TIME reads). */
export function localTimeWithOffset(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString().slice(11, 19);
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Subasta row that is effectively live at the current instant. */
export function liveSubastaRow(overrides: Partial<SubastaRow> = {}): SubastaRow {
  return {
    identificador: 10,
    fecha: todayDateString(),
    hora: localTimeWithOffset(-20),
    horaFin: localTimeWithOffset(55),
    estado: "abierta",
    subastador: 1,
    ubicacion: "CABA",
    capacidadAsistentes: 50,
    tieneDeposito: "si",
    seguridadPropia: "no",
    categoria: "comun",
    moneda: "ARS",
    ...overrides,
  };
}
