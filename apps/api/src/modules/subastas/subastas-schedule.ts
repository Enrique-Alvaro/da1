import { BadRequestError } from "../../shared/errors/httpErrors";
import type { SubastaRow } from "./subastas.repository";

export type AuctionApiStatus = "scheduled" | "live" | "closed";

export const MIN_AUCTION_DURATION_MINUTES = 60;
export const MAX_AUCTION_DURATION_MINUTES = 90;
export const DEFAULT_AUCTION_DURATION_MINUTES = 75;
export const MIN_ADVANCE_DAYS = 10;

export type AuctionScheduleInput = {
  fecha: string;
  hora: string;
  horaFin: string;
  estado?: string | null;
};

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDatePart(value: Date | string | null): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function formatTimePart(value: Date | string | null): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return `${padDatePart(value.getUTCHours())}:${padDatePart(value.getUTCMinutes())}:${padDatePart(value.getUTCSeconds())}`;
  }
  const s = String(value).trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    return s.length === 5 ? `${s}:00` : s;
  }
  return s.length >= 8 ? s.slice(0, 8) : s;
}

export function combineSubastaDateTime(
  fecha: Date | string | null,
  hora: Date | string | null
): Date | null {
  const dateStr = formatDatePart(fecha);
  const timeStr = formatTimePart(hora);
  if (!dateStr || !timeStr) {
    return null;
  }
  // SQL TIME/DATE values are read as UTC wall-clock via formatTimePart/formatDatePart.
  const parsed = new Date(`${dateStr}T${timeStr}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveHoraFin(subasta: Pick<SubastaRow, "hora" | "horaFin">): string {
  const explicit = formatTimePart(subasta.horaFin);
  if (explicit) {
    return explicit;
  }
  const start = combineSubastaDateTime("1970-01-01", subasta.hora);
  if (!start) {
    return "19:00:00";
  }
  const end = new Date(start.getTime() + DEFAULT_AUCTION_DURATION_MINUTES * 60_000);
  return formatTimePart(end) ?? "19:00:00";
}

export function getSubastaEndDateTime(
  subasta: Pick<SubastaRow, "fecha" | "hora" | "horaFin">
): Date | null {
  return combineSubastaDateTime(subasta.fecha, resolveHoraFin(subasta));
}

export function getAuctionDurationMinutes(
  fecha: string,
  hora: string,
  horaFin: string
): number | null {
  const start = combineSubastaDateTime(fecha, hora);
  const end = combineSubastaDateTime(fecha, horaFin);
  if (!start || !end) {
    return null;
  }
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

export function getEffectiveAuctionStatus(
  subasta: Pick<SubastaRow, "estado" | "fecha" | "hora" | "horaFin">,
  now: Date = new Date()
): AuctionApiStatus {
  const dbEstado = (subasta.estado ?? "").trim().toLowerCase();
  if (dbEstado === "carrada") {
    return "closed";
  }

  const start = combineSubastaDateTime(subasta.fecha, subasta.hora);
  const end = getSubastaEndDateTime(subasta);
  if (!start || !end) {
    return dbEstado === "abierta" ? "live" : "scheduled";
  }

  const nowMs = now.getTime();
  if (end.getTime() < nowMs) {
    return "closed";
  }
  if (start.getTime() > nowMs) {
    return "scheduled";
  }
  if (dbEstado === "abierta" && nowMs >= start.getTime() && nowMs <= end.getTime()) {
    return "live";
  }
  return "scheduled";
}

export function validateAuctionSchedule(
  input: AuctionScheduleInput,
  options: {
    now?: Date;
    isCreate?: boolean;
    requireFutureEndForOpen?: boolean;
  } = {}
): { start: Date; end: Date; durationMinutes: number } {
  const now = options.now ?? new Date();
  const fecha = input.fecha.trim();
  const hora = formatTimePart(input.hora);
  const horaFin = formatTimePart(input.horaFin);
  if (!hora || !horaFin) {
    throw new BadRequestError("La hora de inicio y cierre son obligatorias.", "AUCTION_TIME_INVALID");
  }

  const start = combineSubastaDateTime(fecha, hora);
  const end = combineSubastaDateTime(fecha, horaFin);
  if (!start || !end) {
    throw new BadRequestError("Fecha u hora de subasta inválida.", "AUCTION_DATETIME_INVALID");
  }

  if (options.isCreate !== false && start.getTime() < now.getTime()) {
    throw new BadRequestError(
      "La fecha y hora de inicio no pueden estar en el pasado.",
      "AUCTION_START_IN_PAST"
    );
  }

  if (end.getTime() <= start.getTime()) {
    throw new BadRequestError(
      "La hora de cierre debe ser posterior al inicio.",
      "AUCTION_END_BEFORE_START"
    );
  }

  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (durationMinutes < MIN_AUCTION_DURATION_MINUTES) {
    throw new BadRequestError(
      `La duración mínima de la subasta es ${MIN_AUCTION_DURATION_MINUTES} minutos.`,
      "AUCTION_DURATION_TOO_SHORT"
    );
  }
  if (durationMinutes > MAX_AUCTION_DURATION_MINUTES) {
    throw new BadRequestError(
      `La duración máxima de la subasta es ${MAX_AUCTION_DURATION_MINUTES} minutos.`,
      "AUCTION_DURATION_TOO_LONG"
    );
  }

  const estado = (input.estado ?? "").trim().toLowerCase();
  const isOpenState = estado === "abierta";
  const requireFutureEnd =
    options.requireFutureEndForOpen ?? (options.isCreate === true || isOpenState);

  if (requireFutureEnd && end.getTime() < now.getTime()) {
    throw new BadRequestError(
      "La fecha y hora de cierre no pueden estar en el pasado.",
      "AUCTION_END_IN_PAST"
    );
  }

  if (options.isCreate) {
    const minStart = new Date(now);
    minStart.setDate(minStart.getDate() + MIN_ADVANCE_DAYS);
    minStart.setHours(0, 0, 0, 0);
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    if (startDay.getTime() <= minStart.getTime()) {
      throw new BadRequestError(
        `La subasta debe programarse con al menos ${MIN_ADVANCE_DAYS} días de anticipación.`,
        "AUCTION_START_TOO_SOON"
      );
    }
  }

  return { start, end, durationMinutes };
}
