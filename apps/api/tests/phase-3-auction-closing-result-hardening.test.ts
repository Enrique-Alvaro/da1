import { describe, it, expect, vi, beforeEach } from "vitest";
import * as closingRepository from "../src/modules/subastas/subastas-closing.repository";
import * as itemsRepository from "../src/modules/subastas/subastas-items.repository";
import * as liveRepo from "../src/modules/subastas/subastas-live.repository";
import * as usersRepository from "../src/modules/users/users.repository";
import * as paymentMethodsRepository from "../src/modules/payment-methods/payment-methods.repository";
import * as subastasRepository from "../src/modules/subastas/subastas.repository";
import * as purchasesRepository from "../src/modules/users/users-purchases.repository";
import { getLiveAuctionState } from "../src/modules/subastas/subastas.service";
import { closeAuctionItem, getItemFinalizationResult } from "../src/modules/subastas/subastas-closing.service";
import { listMyPurchases } from "../src/modules/users/users-purchases.service";
import { getMyMetrics } from "../src/modules/users/users-metrics.service";
import type { AuthUserContext } from "../src/shared/types/auth";
import * as liveSessionStore from "../src/modules/subastas/live-session.store";
import * as envConfig from "../src/config/env";

const authCliente: AuthUserContext = {
  id: "7",
  email: "juan@example.com",
  tokenType: "access",
  role: "cliente",
  jti: "c1",
  exp: 9999999999,
  expiresAt: new Date(),
};

import { liveSubastaRow } from "./helpers/live-subasta";

const subastaAbierta = liveSubastaRow({ tieneDeposito: "no" });

beforeEach(() => {
  liveSessionStore.clearAllLiveSessions();
  vi.restoreAllMocks();
  vi.spyOn(envConfig, "getCompanyClientId").mockReturnValue(99);
  vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(subastaAbierta);
});

describe("Phase 3 — closing / result / metrics / purchases", () => {
  it("live state exposes finalized fields after registro", async () => {
    liveSessionStore.enterSession(7, 10);
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "plata",
    });
    vi.spyOn(paymentMethodsRepository, "listByCliente").mockResolvedValue([]);
    vi.spyOn(itemsRepository, "listCatalogItemsBySubasta").mockResolvedValue([
      {
        identificador: 100,
        catalogo: 1,
        producto: 34,
        precioBase: 5000,
        comision: 500,
        subastado: "si",
        descripcionCatalogo: "Reloj",
        descripcionCompleta: "http://x",
        subastaId: 10,
        catalogDescription: null,
        isSoldInRegistro: 0,
      },
    ]);
    vi.spyOn(liveRepo, "findWinningBidForItem").mockResolvedValue(null);
    vi.spyOn(liveRepo, "listBidHistoryBySubasta").mockResolvedValue([]);
    vi.spyOn(closingRepository, "findRegistroByProductoAndSubasta").mockResolvedValue({
      identificador: 14,
      subasta: 10,
      duenio: 9,
      producto: 34,
      cliente: 7,
      importe: 6000,
      comision: 500,
    });
    vi.spyOn(usersRepository, "findProfileByPersonId").mockResolvedValue({
      id: 7,
      document_number: "1",
      full_name: "Juan Pérez",
      address: null,
      status: "activo",
      country_id: 1,
      country_name: "AR",
      admitted: "si",
      category: "comun",
      email: "juan@example.com",
    });

    const state = await getLiveAuctionState(10, authCliente);
    expect(state.isFinalized).toBe(true);
    expect(state.shouldRedirectToResult).toBe(true);
    expect(state.resultType).toBe("BIDDER_WON");
    expect(state.finalAmount).toBe(6000);
    expect(state.isCurrentUserWinner).toBe(true);
    expect(state.winnerDisplayName).toBe("Juan Pérez");
  });

  it("purchases return won item from registro", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "comun",
    });
    vi.spyOn(purchasesRepository, "listPurchasesByCliente").mockResolvedValue([
      {
        registroId: 14,
        auctionId: 10,
        productoId: 34,
        itemId: 100,
        title: "Reloj",
        finalAmount: 6000,
        commissionAmount: 500,
        currency: "ARS",
      },
    ]);

    const r = await listMyPurchases(authCliente);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].productTitle).toBe("Reloj");
    expect(r.items[0].finalAmount).toBe(6000);
    expect(r.items[0].paymentMethodSummary).toBeNull();
  });

  it("metrics zeros for new user without cliente row", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(null);
    const m = await getMyMetrics(authCliente);
    expect(m.totalBidsPlaced).toBe(0);
    expect(m.totalWins).toBe(0);
  });

  it("close then result shows FINALIZED with productTitle", async () => {
    const itemCtx = {
      itemId: 100,
      productoId: 34,
      duenioId: 9,
      precioBase: 5000,
      comision: 500,
      subastado: "no",
      subastaId: 10,
      moneda: "ARS",
      descripcionCatalogo: "Reloj",
    };
    vi.spyOn(closingRepository, "findItemCloseContext").mockResolvedValue(itemCtx);
    vi.spyOn(closingRepository, "findRegistroByProductoAndSubasta")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        identificador: 14,
        subasta: 10,
        duenio: 9,
        producto: 34,
        cliente: 7,
        importe: 6000,
        comision: 500,
      });
    vi.spyOn(closingRepository, "findWinningBidForClose").mockResolvedValue({
      pujoId: 22,
      importe: 6000,
      clienteId: 7,
      numeroPostor: 1,
      personaNombre: "Juan",
    });
    vi.spyOn(closingRepository, "persistItemClose").mockResolvedValue({
      identificador: 14,
      subasta: 10,
      duenio: 9,
      producto: 34,
      cliente: 7,
      importe: 6000,
      comision: 500,
    });

    const closed = await closeAuctionItem(10, 100, {});
    expect(closed.resultStatus).toBe("FINALIZED");

    vi.spyOn(usersRepository, "findProfileByPersonId").mockResolvedValue({
      id: 7,
      document_number: "1",
      full_name: "Juan Pérez",
      address: null,
      status: "activo",
      country_id: 1,
      country_name: "AR",
      admitted: "si",
      category: "comun",
      email: "juan@example.com",
    });

    const result = await getItemFinalizationResult(10, 100, authCliente);
    expect(result.resultStatus).toBe("FINALIZED");
    expect(result.productTitle).toBe("Reloj");
  });
});
