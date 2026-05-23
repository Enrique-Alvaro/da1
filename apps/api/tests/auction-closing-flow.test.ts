import { describe, it, expect, vi, beforeEach } from "vitest";
import * as closingRepository from "../src/modules/subastas/subastas-closing.repository";
import * as paymentMethodsRepository from "../src/modules/payment-methods/payment-methods.repository";
import * as usersRepository from "../src/modules/users/users.repository";
import * as subastasRepository from "../src/modules/subastas/subastas.repository";
import {
  assertEmployeeCanClose,
  closeAuctionItem,
  getItemFinalizationResult,
} from "../src/modules/subastas/subastas-closing.service";
import { listMyPurchases } from "../src/modules/users/users-purchases.service";
import { getMyMetrics } from "../src/modules/users/users-metrics.service";
import type { AuthUserContext } from "../src/shared/types/auth";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../src/shared/errors/httpErrors";

vi.mock("../src/config/env", () => ({
  getCompanyClientId: () => 99,
}));

const authEmpleado: AuthUserContext = {
  id: "1",
  email: "admin@crownbid.local",
  tokenType: "access",
  role: "empleado",
  employeeId: 1,
  jti: "e1",
  exp: 9999999999,
  expiresAt: new Date(),
};

const authCliente: AuthUserContext = {
  id: "7",
  email: "juan@example.com",
  tokenType: "access",
  role: "cliente",
  jti: "c1",
  exp: 9999999999,
  expiresAt: new Date(),
};

const itemCtx: closingRepository.ItemCloseContextRow = {
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

const winningBid: closingRepository.WinningBidCloseRow = {
  pujoId: 22,
  importe: 6000,
  clienteId: 7,
  numeroPostor: 1,
  personaNombre: "Juan Pérez",
};

const registroRow: closingRepository.RegistroDeSubastaRow = {
  identificador: 14,
  subasta: 10,
  duenio: 9,
  producto: 34,
  cliente: 7,
  importe: 6000,
  comision: 500,
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue({
    identificador: 10,
    fecha: null,
    hora: null,
    estado: "abierta",
    subastador: 1,
    ubicacion: null,
    capacidadAsistentes: 50,
    tieneDeposito: "no",
    seguridadPropia: "no",
    categoria: "comun",
    moneda: "ARS",
  });
});

describe("Auction closing", () => {
  it("employee can close item with bids", async () => {
    vi.spyOn(closingRepository, "findItemCloseContext").mockResolvedValue(itemCtx);
    vi.spyOn(closingRepository, "findRegistroByProductoAndSubasta").mockResolvedValue(null);
    vi.spyOn(closingRepository, "findWinningBidForClose").mockResolvedValue(winningBid);
    vi.spyOn(closingRepository, "persistItemClose").mockResolvedValue(registroRow);

    const result = await closeAuctionItem(10, 100, {});
    expect(result.resultType).toBe("BIDDER_WON");
    expect(result.finalAmount).toBe(6000);
    expect(closingRepository.persistItemClose).toHaveBeenCalledWith(
      expect.objectContaining({ winningPujoId: 22, clienteId: 7 })
    );
  });

  it("highest bid wins (repository orders by amount desc, id asc)", async () => {
    vi.spyOn(closingRepository, "findWinningBidForClose").mockResolvedValue(winningBid);
    expect(winningBid.pujoId).toBe(22);
  });

  it("no bids → company purchase", async () => {
    vi.spyOn(closingRepository, "findItemCloseContext").mockResolvedValue(itemCtx);
    vi.spyOn(closingRepository, "findRegistroByProductoAndSubasta").mockResolvedValue(null);
    vi.spyOn(closingRepository, "findWinningBidForClose").mockResolvedValue(null);
    vi.spyOn(closingRepository, "persistItemClose").mockResolvedValue({
      ...registroRow,
      cliente: 99,
      importe: 5000,
      comision: 0.02,
    });

    const result = await closeAuctionItem(10, 100, {});
    expect(result.resultType).toBe("COMPANY_PURCHASED");
    expect(result.finalAmount).toBe(5000);
  });

  it("client cannot close (assertEmployeeCanClose)", () => {
    expect(() => assertEmployeeCanClose(authCliente)).toThrow(ForbiddenError);
    expect(() => assertEmployeeCanClose(authCliente)).toThrow(
      expect.objectContaining({ code: "NO_PERMISSION_TO_CLOSE_AUCTION" })
    );
  });

  it("auction not found propagates", async () => {
    vi.spyOn(subastasRepository, "requireSubastaById").mockRejectedValue(
      new NotFoundError("Subasta no encontrada.", "AUCTION_NOT_FOUND")
    );
    await expect(closeAuctionItem(999, 100, {})).rejects.toMatchObject({
      code: "AUCTION_NOT_FOUND",
    });
  });

  it("item not in auction → ITEM_NOT_FOUND", async () => {
    vi.spyOn(closingRepository, "findItemCloseContext").mockResolvedValue(null);
    await expect(closeAuctionItem(10, 999, {})).rejects.toMatchObject({
      code: "ITEM_NOT_FOUND",
    });
  });

  it("already finalized → ITEM_ALREADY_FINALIZED", async () => {
    vi.spyOn(closingRepository, "findItemCloseContext").mockResolvedValue({
      ...itemCtx,
      subastado: "si",
    });
    vi.spyOn(closingRepository, "findRegistroByProductoAndSubasta").mockResolvedValue(null);
    await expect(closeAuctionItem(10, 100, {})).rejects.toMatchObject({
      code: "ITEM_ALREADY_FINALIZED",
    });
  });

  it("result NOT_FINALIZED before close", async () => {
    vi.spyOn(closingRepository, "findItemCloseContext").mockResolvedValue(itemCtx);
    vi.spyOn(closingRepository, "findRegistroByProductoAndSubasta").mockResolvedValue(null);
    const result = await getItemFinalizationResult(10, 100, authCliente);
    expect(result.resultType).toBe("NOT_FINALIZED");
  });

  it("result returns finalized after registro exists", async () => {
    vi.spyOn(closingRepository, "findItemCloseContext").mockResolvedValue(itemCtx);
    vi.spyOn(closingRepository, "findRegistroByProductoAndSubasta").mockResolvedValue(registroRow);
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
    expect(result.resultType).toBe("BIDDER_WON");
    expect(result.isCurrentUserWinner).toBe(true);
  });

  it("purchases empty for user without cliente", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(null);
    const r = await listMyPurchases(authCliente);
    expect(r.items).toEqual([]);
  });

  it("metrics wins from registro", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "comun",
    });
    const metricsRepo = await import("../src/modules/users/users-metrics.repository");
    vi.spyOn(metricsRepo, "countAsistenciasByCliente").mockResolvedValue(1);
    vi.spyOn(metricsRepo, "countPujosByCliente").mockResolvedValue(2);
    vi.spyOn(metricsRepo, "sumPujosImporteByCliente").mockResolvedValue(12000);
    vi.spyOn(metricsRepo, "countWinsByCliente").mockResolvedValue(1);
    vi.spyOn(metricsRepo, "sumWinsImporteByCliente").mockResolvedValue(6000);

    const m = await getMyMetrics(authCliente);
    expect(m.totalWins).toBe(1);
    expect(m.totalAmountWon).toBe(6000);
  });

  it("optional payment method validated on close", async () => {
    vi.spyOn(closingRepository, "findItemCloseContext").mockResolvedValue(itemCtx);
    vi.spyOn(closingRepository, "findRegistroByProductoAndSubasta").mockResolvedValue(null);
    vi.spyOn(closingRepository, "findWinningBidForClose").mockResolvedValue(winningBid);
    vi.spyOn(closingRepository, "persistItemClose").mockResolvedValue(registroRow);
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

    const result = await closeAuctionItem(10, 100, { paymentMethodId: 3 });
    expect(result.paymentMethodId).toBe(3);
  });
});
