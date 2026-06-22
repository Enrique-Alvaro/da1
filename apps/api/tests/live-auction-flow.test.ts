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
  getCatalogItemDetail,
} from "../src/modules/subastas/subastas.service";
import { mapSubastaStatus } from "../src/modules/subastas/subastas-access.service";
import { areAllCatalogItemsSold } from "../src/modules/subastas/subastas-current-item";
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

import { liveSubastaRow } from "./helpers/live-subasta";

const subastaAbierta = liveSubastaRow();

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
    vi.spyOn(itemsRepository, "countCatalogItemsBySubasta").mockResolvedValue(2);

    const result = await listAuctions({ featured: true }, authCliente);
    expect(subastasRepository.listSubastas).toHaveBeenCalledWith(
      expect.objectContaining({ featured: true, limit: 6 })
    );
    expect(result.items).toHaveLength(1);
    expect(result.meta?.derived).toBe(true);
    expect(result.meta?.limitation).toBe("DERIVED_FEATURED_AUCTIONS");
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

  it("areAllCatalogItemsSold is true only when every item is sold", () => {
    const sold: CatalogItemRow = {
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
      duenio: 1,
      numeroPieza: "1",
      artistaODisenador: null,
      fechaOrigen: null,
      historia: null,
      componentes: null,
      depositoUbicacion: null,
      seguroPoliza: null,
    };
    const pending: CatalogItemRow = { ...sold, identificador: 2, subastado: "no" };
    expect(areAllCatalogItemsSold([sold, pending])).toBe(false);
    expect(areAllCatalogItemsSold([sold, { ...sold, identificador: 2 }])).toBe(true);
  });

  it("mapSubastaStatus returns closed when all catalog items are sold", () => {
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
        isSoldInRegistro: 1,
        duenio: 1,
        numeroPieza: "1",
        artistaODisenador: null,
        fechaOrigen: null,
        historia: null,
        componentes: null,
        depositoUbicacion: null,
        seguroPoliza: null,
      },
    ];
    expect(mapSubastaStatus(subastaAbierta, items)).toBe("closed");
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

  it("sold catalog item cannot enter live room", async () => {
    const soldItem: CatalogItemRow = {
      identificador: 100,
      catalogo: 1,
      producto: 1,
      precioBase: 10000,
      comision: 1000,
      subastado: "si",
      descripcionCatalogo: "Reloj vendido",
      descripcionCompleta: "http://x",
      subastaId: 10,
      catalogDescription: null,
      isSoldInRegistro: 1,
      duenio: 99,
      numeroPieza: 1,
      artistaODisenador: null,
      fechaOrigen: null,
      historia: null,
      componentes: null,
    };
    const liveItem: CatalogItemRow = {
      identificador: 101,
      catalogo: 1,
      producto: 2,
      precioBase: 20000,
      comision: 2000,
      subastado: "no",
      descripcionCatalogo: "Siguiente",
      descripcionCompleta: "http://y",
      subastaId: 10,
      catalogDescription: null,
      isSoldInRegistro: 0,
      duenio: 99,
      numeroPieza: 2,
      artistaODisenador: null,
      fechaOrigen: null,
      historia: null,
      componentes: null,
    };

    vi.spyOn(itemsRepository, "requireCatalogItemById").mockResolvedValue(soldItem);
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(subastaAbierta);
    vi.spyOn(itemsRepository, "listCatalogItemsBySubasta").mockResolvedValue([soldItem, liveItem]);
    vi.spyOn(liveRepo, "findWinningBidForItem").mockResolvedValue({
      identificador: 1,
      importe: 12000,
      cliente: 8,
      numeroPostor: 2,
    });
    vi.spyOn(itemsRepository, "listPhotoIdsByProduct").mockResolvedValue([1]);
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

    const detail = await getCatalogItemDetail(100, authCliente);
    expect(detail.status).toBe("sold");
    expect(detail.canEnterLive).toBe(false);
  });

  it("watched sold item is finalized even when another item is live", async () => {
    liveSessionStore.enterSession(7, 10);
    const soldItem: CatalogItemRow = {
      identificador: 100,
      catalogo: 1,
      producto: 1,
      precioBase: 10000,
      comision: 1000,
      subastado: "si",
      descripcionCatalogo: "Reloj vendido",
      descripcionCompleta: "http://x",
      subastaId: 10,
      catalogDescription: null,
      isSoldInRegistro: 1,
      duenio: 99,
      numeroPieza: 1,
      artistaODisenador: null,
      fechaOrigen: null,
      historia: null,
      componentes: null,
    };
    const liveItem: CatalogItemRow = {
      identificador: 101,
      catalogo: 1,
      producto: 2,
      precioBase: 20000,
      comision: 2000,
      subastado: "no",
      descripcionCatalogo: "Siguiente",
      descripcionCompleta: "http://y",
      subastaId: 10,
      catalogDescription: null,
      isSoldInRegistro: 0,
      duenio: 99,
      numeroPieza: 2,
      artistaODisenador: null,
      fechaOrigen: null,
      historia: null,
      componentes: null,
    };

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
    vi.spyOn(itemsRepository, "listCatalogItemsBySubasta").mockResolvedValue([soldItem, liveItem]);
    vi.spyOn(liveRepo, "findWinningBidForItem").mockResolvedValue({
      identificador: 1,
      importe: 12000,
      cliente: 8,
      numeroPostor: 2,
    });
    vi.spyOn(liveRepo, "listBidHistoryBySubasta").mockResolvedValue([]);
    vi.spyOn(closingRepository, "findRegistroByProductoAndSubasta").mockImplementation(
      async (productId: number) =>
        productId === 1
          ? {
              identificador: 500,
              subasta: 10,
              producto: 1,
              cliente: 8,
              importe: 12000,
              comision: 1000,
              duenio: 99,
            }
          : null
    );
    vi.spyOn(usersRepository, "findProfileByPersonId").mockResolvedValue({
      full_name: "Ganador Demo",
    } as never);

    const state = await getLiveAuctionState(10, authCliente, 100);
    expect(state.isFinalized).toBe(true);
    expect(state.soldItemId).toBe(100);
    expect(state.currentItem?.id).toBe(101);
    expect(state.watchedItem?.isCurrentItem).toBe(false);
  });

  it("metrics return zeros for unknown cliente", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(null);
    const m = await getMyMetrics(authCliente);
    expect(m.totalBidsPlaced).toBe(0);
    expect(m.totalAuctionsAttended).toBe(0);
  });
});
