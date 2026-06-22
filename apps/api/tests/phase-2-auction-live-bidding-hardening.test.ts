import { describe, it, expect, vi, beforeEach } from "vitest";
import * as subastasRepository from "../src/modules/subastas/subastas.repository";
import * as itemsRepository from "../src/modules/subastas/subastas-items.repository";
import * as liveRepo from "../src/modules/subastas/subastas-live.repository";
import * as closingRepository from "../src/modules/subastas/subastas-closing.repository";
import * as usersRepository from "../src/modules/users/users.repository";
import * as paymentMethodsRepository from "../src/modules/payment-methods/payment-methods.repository";
import * as pujosRepository from "../src/modules/pujos/pujos.repository";
import * as liveSessionStore from "../src/modules/subastas/live-session.store";
import {
  listAuctions,
  getAuctionDetail,
  listAuctionItems,
  getLiveAuctionState,
} from "../src/modules/subastas/subastas.service";
import { assertCanBid, validateBidAmountRules } from "../src/modules/pujos/pujos.service";
import { computeBidLimits } from "../src/modules/subastas/subastas-bid-limits";
import { toPublicAccessDenialCode } from "../src/modules/subastas/access-denial-codes";
import type { AuthUserContext } from "../src/shared/types/auth";

const authCliente: AuthUserContext = {
  id: "7",
  email: "juan@example.com",
  tokenType: "access",
  role: "cliente",
  jti: "j1",
  exp: 9999999999,
  expiresAt: new Date(),
};

import { liveSubastaRow } from "./helpers/live-subasta";

const subastaAbierta = liveSubastaRow();

beforeEach(() => {
  liveSessionStore.clearAllLiveSessions();
  vi.restoreAllMocks();
});

describe("Phase 2 — auction / live / bidding hardening", () => {
  it("auction listing returns array", async () => {
    vi.spyOn(subastasRepository, "listSubastas").mockResolvedValue([]);
    const result = await listAuctions({}, undefined);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toHaveLength(0);
  });

  it("auction detail exposes public eligibility codes for anonymous user", async () => {
    vi.spyOn(subastasRepository, "requireSubastaDetailById").mockResolvedValue({
      ...subastaAbierta,
      subastadorNombre: "A",
      subastadorMatricula: "1",
      subastadorRegion: "BA",
    });
    vi.spyOn(liveRepo, "getMaxBidForAuction").mockResolvedValue(null);
    vi.spyOn(itemsRepository, "countCatalogItemsBySubasta").mockResolvedValue(3);

    const detail = await getAuctionDetail(10, undefined);
    expect(detail.itemCount).toBe(3);
    expect(detail.cannotBidReason).toBe("USER_NOT_AUTHENTICATED");
    expect(toPublicAccessDenialCode("AUTH_REQUIRED")).toBe("USER_NOT_AUTHENTICATED");
  });

  it("non-admitted client cannot bid (detail eligibility)", async () => {
    vi.spyOn(subastasRepository, "requireSubastaDetailById").mockResolvedValue({
      ...subastaAbierta,
      subastadorNombre: "A",
      subastadorMatricula: "1",
      subastadorRegion: "BA",
    });
    vi.spyOn(liveRepo, "getMaxBidForAuction").mockResolvedValue(null);
    vi.spyOn(itemsRepository, "countCatalogItemsBySubasta").mockResolvedValue(0);
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "no",
      categoria: "plata",
    });
    vi.spyOn(paymentMethodsRepository, "listByCliente").mockResolvedValue([]);

    const detail = await getAuctionDetail(10, authCliente);
    expect(detail.canBid).toBe(false);
    expect(detail.cannotBidReason).toBe("USER_NOT_ADMITTED");
    expect(detail.canAccess).toBe(true);
  });

  it("category restriction blocks bidding on detail", async () => {
    vi.spyOn(subastasRepository, "requireSubastaDetailById").mockResolvedValue({
      ...subastaAbierta,
      categoria: "oro",
      subastadorNombre: "A",
      subastadorMatricula: "1",
      subastadorRegion: "BA",
    });
    vi.spyOn(liveRepo, "getMaxBidForAuction").mockResolvedValue(null);
    vi.spyOn(itemsRepository, "countCatalogItemsBySubasta").mockResolvedValue(0);
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "comun",
    });
    vi.spyOn(paymentMethodsRepository, "listByCliente").mockResolvedValue([
      {
        identificador: 1,
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
      },
    ]);

    const detail = await getAuctionDetail(10, authCliente);
    expect(detail.canBid).toBe(false);
    expect(detail.cannotBidReason).toBe("CATEGORY_NOT_ALLOWED");
  });

  it("auction items returns empty array for empty catalog", async () => {
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(subastaAbierta);
    vi.spyOn(itemsRepository, "listCatalogItemsBySubasta").mockResolvedValue([]);
    vi.spyOn(itemsRepository, "listBidSummariesForSubasta").mockResolvedValue([]);

    const result = await listAuctionItems(10, undefined);
    expect(result.items).toEqual([]);
  });

  it("live state min/max align with bid validation", async () => {
    const basePrice = 10000;
    const currentBest = 12000;
    const limits = computeBidLimits(currentBest, basePrice, "comun");

    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(subastaAbierta);
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "platino",
    });
    vi.spyOn(paymentMethodsRepository, "listByCliente").mockResolvedValue([
      {
        identificador: 1,
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
      },
    ]);
    vi.spyOn(itemsRepository, "listCatalogItemsBySubasta").mockResolvedValue([
      {
        identificador: 100,
        catalogo: 1,
        producto: 1,
        precioBase: basePrice,
        comision: 1000,
        subastado: "no",
        descripcionCatalogo: "Reloj",
        descripcionCompleta: "http://x",
        subastaId: 10,
        catalogDescription: null,
        isSoldInRegistro: 0,
      },
    ]);
    vi.spyOn(liveRepo, "findWinningBidForItem").mockResolvedValue({
      identificador: 5,
      importe: currentBest,
      cliente: 8,
      numeroPostor: 2,
    });
    vi.spyOn(liveRepo, "listBidHistoryBySubasta").mockResolvedValue([]);
    vi.spyOn(closingRepository, "findRegistroByProductoAndSubasta").mockResolvedValue(null);

    const state = await getLiveAuctionState(10, authCliente);
    expect(state.minNextBid).toBe(limits.minNextBid);
    expect(state.maxNextBid).toBe(limits.maxNextBid);

    expect(() =>
      validateBidAmountRules(limits.minNextBid - 0.01, currentBest, basePrice, "comun")
    ).toThrow(expect.objectContaining({ code: "BID_BELOW_MIN" }));
    expect(() =>
      validateBidAmountRules(limits.maxNextBid! + 1, currentBest, basePrice, "comun")
    ).toThrow(expect.objectContaining({ code: "BID_TOO_HIGH" }));
    expect(() =>
      validateBidAmountRules(limits.minNextBid, currentBest, basePrice, "comun")
    ).not.toThrow();
  });

  it("gold/platinum auction has no max bid cap", () => {
    const limits = computeBidLimits(50000, 10000, "oro");
    expect(limits.maxNextBid).toBeNull();
    expect(() => validateBidAmountRules(200000, 50000, 10000, "oro")).not.toThrow();
  });

  it("bid on non-current item is rejected", async () => {
    liveSessionStore.enterSession(7, 10);
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "platino",
    });
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(subastaAbierta);
    vi.spyOn(pujosRepository, "findAsistenteByClienteAndSubasta").mockResolvedValue({
      identificador: 50,
      numeroPostor: 1,
      cliente: 7,
      subasta: 10,
    });
    vi.spyOn(pujosRepository, "findItemInSubasta").mockResolvedValue({
      identificador: 200,
      precioBase: 10000,
      subastaId: 10,
    });
    vi.spyOn(itemsRepository, "listCatalogItemsBySubasta").mockResolvedValue([
      {
        identificador: 100,
        catalogo: 1,
        producto: 1,
        precioBase: 10000,
        comision: 1000,
        subastado: "no",
        descripcionCatalogo: "A",
        descripcionCompleta: "http://a",
        subastaId: 10,
        catalogDescription: null,
        isSoldInRegistro: 0,
      },
      {
        identificador: 200,
        catalogo: 1,
        producto: 2,
        precioBase: 5000,
        comision: 500,
        subastado: "no",
        descripcionCatalogo: "B",
        descripcionCompleta: "http://b",
        subastaId: 10,
        catalogDescription: null,
        isSoldInRegistro: 0,
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
        itemId: 200,
        amount: 6000,
        paymentMethodId: 3,
      })
    ).rejects.toMatchObject({ code: "ITEM_NOT_CURRENT" });
  });
});
