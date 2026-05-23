import { describe, it, expect, vi, beforeEach } from "vitest";
import * as usersRepository from "../src/modules/users/users.repository";
import * as subastasRepository from "../src/modules/subastas/subastas.repository";
import * as itemsRepository from "../src/modules/subastas/subastas-items.repository";
import * as liveRepo from "../src/modules/subastas/subastas-live.repository";
import * as closingRepository from "../src/modules/subastas/subastas-closing.repository";
import * as paymentMethodsRepository from "../src/modules/payment-methods/payment-methods.repository";
import * as pujosRepository from "../src/modules/pujos/pujos.repository";
import {
  listAuctions,
  enterLiveSession,
  leaveLiveSession,
  pickCurrentItemId,
  getLiveAuctionState,
  getBidHistory,
} from "../src/modules/subastas/subastas.service";
import { assertCategoryAllowed, assertCanBid } from "../src/modules/pujos/pujos.service";
import { assertPaymentMethodForBid } from "../src/modules/pujos/pujos-payment-validation";
import * as liveSessionStore from "../src/modules/subastas/live-session.store";
import { getMyMetrics } from "../src/modules/users/users-metrics.service";
import type { AuthUserContext } from "../src/shared/types/auth";
import { ConflictError, ForbiddenError } from "../src/shared/errors/httpErrors";
import type { CatalogItemRow } from "../src/modules/subastas/subastas-items.repository";

const authCliente: AuthUserContext = {
  id: "7",
  email: "juan@example.com",
  tokenType: "access",
  role: "cliente",
  jti: "j1",
  exp: 9999999999,
  expiresAt: new Date(),
};

const subastaAbierta = {
  identificador: 10,
  fecha: "2026-06-10",
  hora: "18:00:00",
  estado: "abierta",
  subastador: 1,
  ubicacion: "CABA",
  capacidadAsistentes: 50,
  tieneDeposito: "si",
  seguridadPropia: "no",
  categoria: "comun",
  moneda: "ARS",
};

beforeEach(() => {
  liveSessionStore.clearAllLiveSessions();
  vi.restoreAllMocks();
});

describe("Live auction flow", () => {
  it("featured list uses open auctions (derived)", async () => {
    vi.spyOn(subastasRepository, "listSubastas").mockResolvedValue([subastaAbierta]);
    vi.spyOn(liveRepo, "getMaxBidForAuction").mockResolvedValue(1500);
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "plata",
    });
    vi.spyOn(paymentMethodsRepository, "listByCliente").mockResolvedValue([]);

    const result = await listAuctions({ featured: true }, authCliente);
    expect(subastasRepository.listSubastas).toHaveBeenCalledWith(
      expect.objectContaining({ featured: true, limit: 6 })
    );
    expect(result.items).toHaveLength(1);
    expect(result.meta?.derived).toBe(true);
  });

  it("pickCurrentItemId selects first unsold item", () => {
    const items: CatalogItemRow[] = [
      {
        identificador: 1,
        catalogo: 1,
        producto: 1,
        precioBase: 100,
        comision: 10,
        subastado: "si",
        descripcionCatalogo: "A",
        descripcionCompleta: "url",
        subastaId: 10,
        catalogDescription: null,
        isSoldInRegistro: 0,
      },
      {
        identificador: 2,
        catalogo: 1,
        producto: 2,
        precioBase: 200,
        comision: 20,
        subastado: "no",
        descripcionCatalogo: "B",
        descripcionCompleta: "url",
        subastaId: 10,
        catalogDescription: null,
        isSoldInRegistro: 0,
      },
    ];
    expect(pickCurrentItemId(items, "live")).toBe(2);
  });

  it("assertCategoryAllowed blocks lower category", () => {
    expect(() => assertCategoryAllowed("comun", "oro")).toThrow(ForbiddenError);
  });

  it("live session: enter then block second auction", async () => {
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
    vi.spyOn(pujosRepository, "findAsistenteByClienteAndSubasta").mockResolvedValue(null);
    vi.spyOn(pujosRepository, "countAsistentesBySubasta").mockResolvedValue(0);
    vi.spyOn(pujosRepository, "insertAsistenteInTransaction").mockResolvedValue({
      identificador: 50,
      numeroPostor: 1,
      cliente: 7,
      subasta: 10,
    });

    await enterLiveSession(10, authCliente);
    await expect(enterLiveSession(11, authCliente)).rejects.toMatchObject({
      code: "LIVE_SESSION_OTHER_AUCTION",
    });
  });

  it("leave live session clears in-memory state", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "comun",
    });
    liveSessionStore.enterSession(7, 10);
    const result = await leaveLiveSession(10, authCliente);
    expect(result.active).toBe(false);
    expect(liveSessionStore.getActiveAuctionId(7)).toBeNull();
  });

  it("assertCanBid requires live session", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "plata",
    });
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(subastaAbierta);
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
    });
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
        amount: 10100,
        paymentMethodId: 3,
      })
    ).rejects.toMatchObject({ code: "LIVE_SESSION_REQUIRED" });
  });

  it("guarantee exceeded uses GUARANTEE_LIMIT_EXCEEDED", () => {
    expect(() =>
      assertPaymentMethodForBid(
        {
          identificador: 1,
          cliente: 7,
          tipo: "cheque_certificado",
          estado: "verificado",
          moneda: "ARS",
          montoDisponible: 100,
        },
        "ARS",
        500
      )
    ).toThrow(
      expect.objectContaining({ code: "GUARANTEE_LIMIT_EXCEEDED" })
    );
  });

  it("live state returns bid limits", async () => {
    liveSessionStore.enterSession(7, 10);
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(subastaAbierta);
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "plata",
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
        precioBase: 10000,
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
      identificador: 1,
      importe: 12000,
      cliente: 8,
      numeroPostor: 2,
    });
    vi.spyOn(liveRepo, "listBidHistoryBySubasta").mockResolvedValue([]);
    vi.spyOn(closingRepository, "findRegistroByProductoAndSubasta").mockResolvedValue(null);

    const state = await getLiveAuctionState(10, authCliente);
    expect(state.currentBid).toBe(12000);
    expect(state.minNextBid).toBeGreaterThan(12000);
    expect(state.maxNextBid).toBeGreaterThan(state.minNextBid!);
  });

  it("bid history newest first", async () => {
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(subastaAbierta);
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "plata",
    });
    vi.spyOn(paymentMethodsRepository, "listByCliente").mockResolvedValue([]);
    vi.spyOn(liveRepo, "listBidHistoryBySubasta").mockResolvedValue([
      {
        identificador: 2,
        item: 100,
        importe: 11000,
        ganador: "no",
        numeroPostor: 2,
        cliente: 8,
        personaNombre: null,
      },
      {
        identificador: 1,
        item: 100,
        importe: 10500,
        ganador: "no",
        numeroPostor: 1,
        cliente: 7,
        personaNombre: null,
      },
    ]);

    const history = await getBidHistory(10, authCliente);
    expect(history.order).toBe("newest_first");
    expect(history.bids[0].id).toBe(2);
    expect(history.bids[0].isWinning).toBe(true);
  });

  it("metrics return zeros for unknown cliente", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(null);
    const m = await getMyMetrics(authCliente);
    expect(m.totalBidsPlaced).toBe(0);
    expect(m.totalAuctionsAttended).toBe(0);
  });
});
