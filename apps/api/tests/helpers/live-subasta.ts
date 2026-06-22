import type { SubastaRow } from "../../src/modules/subastas/subastas.repository";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local wall-clock time string for subasta hora/horaFin fields. */
export function localTimeWithOffset(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
