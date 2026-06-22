import { BadRequestError } from "../../shared/errors/httpErrors";
import { mapSubastaSummary } from "../subastas/subastas.mapper";
import { validateAuctionSchedule } from "../subastas/subastas-schedule";
import * as subastasRepository from "../subastas/subastas.repository";
import type { CreateAuctionBody, UpdateAuctionBody } from "./admin-auctions.schema";

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

export async function createAdminAuction(body: CreateAuctionBody) {
  validateAuctionSchedule(
    {
      fecha: body.fecha,
      hora: normalizeTime(body.hora),
      horaFin: normalizeTime(body.horaFin),
      estado: body.estado ?? null,
    },
    { isCreate: true, requireFutureEndForOpen: true }
  );

  const row = await subastasRepository.insertSubasta({
    fecha: body.fecha,
    hora: normalizeTime(body.hora),
    horaFin: normalizeTime(body.horaFin),
    estado: body.estado ?? null,
    subastador: body.subastador ?? null,
    ubicacion: body.ubicacion,
    capacidadAsistentes: body.capacidadAsistentes ?? null,
    tieneDeposito: body.tieneDeposito ?? "si",
    seguridadPropia: body.seguridadPropia ?? "si",
    categoria: body.categoria,
    moneda: body.moneda ?? "ARS",
  });

  return mapSubastaSummary(row);
}

export async function updateAdminAuction(auctionId: number, body: UpdateAuctionBody) {
  const existing = await subastasRepository.requireSubastaById(auctionId);
  const merged = {
    fecha: body.fecha ?? formatDate(existing.fecha),
    hora: body.hora ? normalizeTime(body.hora) : formatTime(existing.hora),
    horaFin: body.horaFin
      ? normalizeTime(body.horaFin)
      : formatTime(existing.horaFin ?? existing.hora),
    estado: body.estado !== undefined ? body.estado : existing.estado,
  };

  validateAuctionSchedule(merged, {
    isCreate: false,
    requireFutureEndForOpen: (merged.estado ?? "").trim().toLowerCase() === "abierta",
  });

  const row = await subastasRepository.updateSubasta(auctionId, {
    ...body,
    fecha: merged.fecha,
    hora: merged.hora,
    horaFin: merged.horaFin,
    estado: merged.estado,
  });

  return mapSubastaSummary(row);
}

function formatDate(value: Date | string | null): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value ?? "").slice(0, 10);
}

function formatTime(value: Date | string | null): string {
  if (value instanceof Date) {
    return value.toISOString().slice(11, 19);
  }
  const s = String(value ?? "").trim();
  if (!s) {
    throw new BadRequestError("La subasta no tiene horario configurado.", "AUCTION_TIME_INVALID");
  }
  return s.length >= 8 ? s.slice(0, 8) : `${s}:00`;
}

export async function updateAdminAuctionEstado(auctionId: number, estado: "abierta" | "carrada") {
  return updateAdminAuction(auctionId, { estado });
}
