import { describe, it, expect, vi, beforeEach } from "vitest";
import * as subastasRepository from "../src/modules/subastas/subastas.repository";
import * as usersRepository from "../src/modules/users/users.repository";
import * as paymentMethodsRepository from "../src/modules/payment-methods/payment-methods.repository";
import * as pujosRepository from "../src/modules/pujos/pujos.repository";
import * as itemsRepository from "../src/modules/subastas/subastas-items.repository";
import * as liveRepo from "../src/modules/subastas/subastas-live.repository";
import * as liveSessionStore from "../src/modules/subastas/live-session.store";
import { createAdminAuction } from "../src/modules/admin/admin-auctions.service";
import { listAuctions } from "../src/modules/subastas/subastas.service";
import {
  assertCanBid,
  validateBidAmountRules,
} from "../src/modules/pujos/pujos.service";
import {
  createPaymentMethod,
  resolveClienteId,
} from "../src/modules/payment-methods/payment-methods.service";
import { registerUser } from "../src/modules/auth/auth.service";
import * as authRepository from "../src/modules/auth/auth.repository";
import * as emailService from "../src/shared/email/email.service";
import {
  getEffectiveAuctionStatus,
  validateAuctionSchedule,
} from "../src/modules/subastas/subastas-schedule";
import { liveSubastaRow, localTimeWithOffset, todayDateString } from "./helpers/live-subasta";
import type { AuthUserContext } from "../src/shared/types/auth";

const authCliente: AuthUserContext = {
  id: "7",
  email: "buyer@example.com",
  tokenType: "access",
  role: "cliente",
  jti: "j1",
  exp: 9999999999,
  expiresAt: new Date(),
};

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function timeFromNow(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000);
  return d.toISOString().slice(11, 19);
}

beforeEach(() => {
  liveSessionStore.clearAllLiveSessions();
  vi.restoreAllMocks();
});

describe("P0 — auction schedule validation", () => {
  const base = {
    fecha: futureDate(15),
    hora: "18:00:00",
    horaFin: "19:15:00",
    estado: null as string | null,
  };

  it("rejects past start date", () => {
    expect(() =>
      validateAuctionSchedule(
        { ...base, fecha: "2020-01-01", hora: "10:00:00", horaFin: "11:15:00" },
        { isCreate: true, now: new Date("2026-06-22T12:00:00") }
      )
    ).toThrow(expect.objectContaining({ code: "AUCTION_START_IN_PAST" }));
  });

  it("rejects past end date for new/open auction", () => {
    const auctionDay = futureDate(15);
    expect(() =>
      validateAuctionSchedule(
        {
          fecha: auctionDay,
          hora: "10:00:00",
          horaFin: "11:15:00",
          estado: "abierta",
        },
        { isCreate: false, now: new Date(`${auctionDay}T12:00:00`), requireFutureEndForOpen: true }
      )
    ).toThrow(expect.objectContaining({ code: "AUCTION_END_IN_PAST" }));
  });

  it("rejects end before start", () => {
    expect(() =>
      validateAuctionSchedule(
        { ...base, hora: "18:00:00", horaFin: "17:00:00" },
        { isCreate: true }
      )
    ).toThrow(expect.objectContaining({ code: "AUCTION_END_BEFORE_START" }));
  });

  it("rejects duration below 60 minutes", () => {
    expect(() =>
      validateAuctionSchedule(
        { ...base, hora: "18:00:00", horaFin: "18:30:00" },
        { isCreate: true }
      )
    ).toThrow(expect.objectContaining({ code: "AUCTION_DURATION_TOO_SHORT" }));
  });

  it("rejects duration above 90 minutes", () => {
    expect(() =>
      validateAuctionSchedule(
        { ...base, hora: "18:00:00", horaFin: "20:00:00" },
        { isCreate: true }
      )
    ).toThrow(expect.objectContaining({ code: "AUCTION_DURATION_TOO_LONG" }));
  });

  it("open auction with past end is not returned as live", () => {
    const row = {
      identificador: 1,
      fecha: "2026-06-22",
      hora: "08:00:00",
      horaFin: "09:15:00",
      estado: "abierta",
      subastador: 1,
      ubicacion: "Test",
      capacidadAsistentes: 50,
      tieneDeposito: "si",
      seguridadPropia: "si",
      categoria: "comun",
      moneda: "ARS",
    };
    const now = new Date("2026-06-22T12:00:00");
    expect(getEffectiveAuctionStatus(row, now)).toBe("closed");
  });
});

describe("P0 — admin auction create", () => {
  it("createAdminAuction validates and persists", async () => {
    vi.spyOn(subastasRepository, "insertSubasta").mockResolvedValue({
      identificador: 99,
      fecha: futureDate(15),
      hora: "18:00:00",
      horaFin: "19:15:00",
      estado: null,
      subastador: 1,
      ubicacion: "Demo",
      capacidadAsistentes: 100,
      tieneDeposito: "si",
      seguridadPropia: "si",
      categoria: "comun",
      moneda: "ARS",
    });

    const result = await createAdminAuction({
      fecha: futureDate(15),
      hora: "18:00:00",
      horaFin: "19:15:00",
      ubicacion: "Demo",
      categoria: "comun",
      moneda: "ARS",
      tieneDeposito: "si",
      seguridadPropia: "si",
    });

    expect(result.id).toBe(99);
    expect(subastasRepository.insertSubasta).toHaveBeenCalled();
  });
});

describe("P0 — bidding hardening", () => {
  const subastaLive = liveSubastaRow();

  it("excessive bid returns BID_TOO_HIGH without throwing generic error", () => {
    expect(() => validateBidAmountRules(9_999_999_999, 12000, 10000, "comun")).toThrow(
      expect.objectContaining({ code: "BID_TOO_HIGH" })
    );
  });

  it("user cannot bid on own item", async () => {
    liveSessionStore.enterSession(7, 10);
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "platino",
    });
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(subastaLive);
    vi.spyOn(pujosRepository, "findAsistenteByClienteAndSubasta").mockResolvedValue({
      identificador: 50,
      numeroPostor: 1,
      cliente: 7,
      subasta: 10,
    });
    vi.spyOn(pujosRepository, "findItemInSubasta").mockResolvedValue({
      identificador: 100,
      precioBase: 10000,
      subastaId: 10,
      ownerPersonId: 7,
    });
    vi.spyOn(itemsRepository, "listCatalogItemsBySubasta").mockResolvedValue([
      {
        identificador: 100,
        catalogo: 1,
        producto: 1,
        precioBase: 10000,
        comision: 1000,
        subastado: "no",
        descripcionCatalogo: "Reloj propio",
        descripcionCompleta: "http://x",
        subastaId: 10,
        catalogDescription: null,
        isSoldInRegistro: 0,
        duenio: 7,
      },
    ]);

    vi.spyOn(paymentMethodsRepository, "findByIdAndCliente").mockResolvedValue({
      identificador: 3,
      cliente: 7,
      tipo: "tarjeta_credito",
      estado: "verificado",
      moneda: "ARS",
      titular: "J",
      entidad: null,
      ultimosDigitos: "1234",
      aliasOCbu: null,
      montoGarantia: null,
      montoDisponible: null,
      motivoRechazo: null,
      verificador: 1,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
      verificadoEn: new Date(),
    });
    vi.spyOn(pujosRepository, "getMaxBidForItem").mockResolvedValue(null);

    await expect(
      assertCanBid({
        authUser: authCliente,
        auctionId: 10,
        itemId: 100,
        amount: 11000,
        paymentMethodId: 3,
      })
    ).rejects.toMatchObject({ code: "OWNER_CANNOT_BID" });
  });
});

describe("P0 — payment methods and registration", () => {
  it("unvalidated user cannot add payment method", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "no",
      categoria: null,
    });
    await expect(resolveClienteId(authCliente)).rejects.toMatchObject({
      code: "USER_NOT_ADMITTED",
    });
    await expect(
      createPaymentMethod(authCliente, {
        tipo: "tarjeta_credito",
        moneda: "ARS",
        titular: "Test",
        entidad: "Visa",
        ultimosDigitos: "1234",
      })
    ).rejects.toMatchObject({ code: "USER_NOT_ADMITTED" });
  });

  it("registration does not assign category", async () => {
    vi.spyOn(authRepository, "createPersonaClienteCredential").mockResolvedValue({
      id: 99,
      documentNumber: "P0-REG-001",
      fullName: "Registro P0",
      status: "activo",
      admitted: "no",
      category: null,
    });
    vi.spyOn(emailService, "sendTemporaryPasswordEmail").mockResolvedValue(undefined);

    const result = await registerUser({
      firstName: "Registro",
      lastName: "P0",
      email: "p0-reg@example.com",
      documentNumber: "P0-REG-001",
      address: "CABA",
      countryId: 1,
      documentFrontImageBase64: null,
      documentBackImageBase64: null,
    });

    expect(result.user.category).toBeNull();
    expect(result.user.admitted).toBe("no");
  });
});

describe("P0 — auction list filters by effective status", () => {
  it("status=live excludes auctions whose end already passed", async () => {
    vi.spyOn(subastasRepository, "listSubastas").mockResolvedValue([
      liveSubastaRow({
        identificador: 1,
        ubicacion: "Expired live",
        hora: localTimeWithOffset(-180),
        horaFin: localTimeWithOffset(-90),
      }),
      liveSubastaRow({
        identificador: 2,
        ubicacion: "Valid live",
      }),
    ]);
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(null);
    vi.spyOn(paymentMethodsRepository, "listByCliente").mockResolvedValue([]);
    vi.spyOn(liveRepo, "getMaxBidForAuction").mockResolvedValue(null);
    vi.spyOn(itemsRepository, "countCatalogItemsBySubasta").mockResolvedValue(1);

    const result = await listAuctions({ status: "live" }, undefined);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.location).toBe("Valid live");
  });
});
