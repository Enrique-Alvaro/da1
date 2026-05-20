import { describe, it, expect, vi, beforeEach } from "vitest";
import * as usersRepository from "../src/modules/users/users.repository";
import * as paymentMethodsRepository from "../src/modules/payment-methods/payment-methods.repository";
import * as subastasRepository from "../src/modules/subastas/subastas.repository";
import * as pujosRepository from "../src/modules/pujos/pujos.repository";
import {
  assertCanBid,
  validateBidAmountRules,
} from "../src/modules/pujos/pujos.service";
import type { AuthUserContext } from "../src/shared/types/auth";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../src/shared/errors/httpErrors";

const authCliente: AuthUserContext = {
  id: "7",
  email: "juan@example.com",
  tokenType: "access",
  role: "cliente",
  jti: "jti-1",
  exp: 9999999999,
  expiresAt: new Date(),
};

const authEmpleado: AuthUserContext = {
  id: "1",
  email: "admin@crownbid.local",
  tokenType: "access",
  role: "empleado",
  employeeId: 1,
  jti: "jti-2",
  exp: 9999999999,
  expiresAt: new Date(),
};

const clienteAdmitido = {
  identificador: 7,
  admitido: "si",
  categoria: "plata",
};

const subastaAbierta = {
  identificador: 10,
  fecha: null,
  hora: null,
  estado: "abierta",
  subastador: 1,
  ubicacion: null,
  capacidadAsistentes: 100,
  tieneDeposito: "no",
  seguridadPropia: "no",
  categoria: "comun",
  moneda: "ARS",
};

const asistente = {
  identificador: 50,
  numeroPostor: 1,
  cliente: 7,
  subasta: 10,
};

const item = {
  identificador: 100,
  precioBase: 10000,
  subastaId: 10,
};

function mockMedio(
  overrides: Partial<paymentMethodsRepository.MedioPagoRow> = {}
): paymentMethodsRepository.MedioPagoRow {
  const now = new Date("2026-01-15T12:00:00.000Z");
  return {
    identificador: 3,
    cliente: 7,
    tipo: "tarjeta_credito",
    estado: "verificado",
    moneda: "ARS",
    titular: "Juan",
    entidad: "Visa",
    ultimosDigitos: "3456",
    aliasOCbu: null,
    montoGarantia: null,
    montoDisponible: null,
    motivoRechazo: null,
    verificador: 1,
    creadoEn: now,
    actualizadoEn: now,
    verificadoEn: now,
    ...overrides,
  };
}

describe("Pujas — Fase 4 assertCanBid", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(clienteAdmitido);
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(subastaAbierta);
    vi.spyOn(pujosRepository, "findAsistenteByClienteAndSubasta").mockResolvedValue(asistente);
    vi.spyOn(pujosRepository, "findItemInSubasta").mockResolvedValue(item);
    vi.spyOn(paymentMethodsRepository, "findByIdAndCliente").mockResolvedValue(mockMedio());
    vi.spyOn(pujosRepository, "getMaxBidForItem").mockResolvedValue(null);
  });

  async function callBid(amount = 10100, paymentMethodId = 3) {
    return assertCanBid({
      authUser: authCliente,
      auctionId: 10,
      itemId: 100,
      amount,
      paymentMethodId,
    });
  }

  it("sin auth → UNAUTHENTICATED", async () => {
    await expect(
      assertCanBid({
        authUser: undefined,
        auctionId: 10,
        itemId: 100,
        amount: 10100,
        paymentMethodId: 3,
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("empleado → Forbidden", async () => {
    await expect(
      assertCanBid({
        authUser: authEmpleado,
        auctionId: 10,
        itemId: 100,
        amount: 10100,
        paymentMethodId: 3,
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("sin fila cliente → CLIENT_NOT_FOUND", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(null);
    await expect(callBid()).rejects.toMatchObject({ code: "CLIENT_NOT_FOUND" });
  });

  it("admitido != si → CLIENT_NOT_APPROVED", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      ...clienteAdmitido,
      admitido: "no",
    });
    await expect(callBid()).rejects.toMatchObject({ code: "CLIENT_NOT_APPROVED" });
  });

  it("sin asistente → AUCTION_ATTENDANCE_REQUIRED", async () => {
    vi.spyOn(pujosRepository, "findAsistenteByClienteAndSubasta").mockResolvedValue(null);
    await expect(callBid()).rejects.toMatchObject({ code: "AUCTION_ATTENDANCE_REQUIRED" });
  });

  it("categoría insuficiente → CLIENT_CATEGORY_NOT_ALLOWED", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      ...clienteAdmitido,
      categoria: "comun",
    });
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue({
      ...subastaAbierta,
      categoria: "oro",
    });
    await expect(callBid()).rejects.toMatchObject({ code: "CLIENT_CATEGORY_NOT_ALLOWED" });
  });

  it("subasta cerrada → AUCTION_NOT_OPEN", async () => {
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue({
      ...subastaAbierta,
      estado: "carrada",
    });
    await expect(callBid()).rejects.toMatchObject({ code: "AUCTION_NOT_OPEN" });
  });

  it("medio pendiente → PAYMENT_METHOD_PENDING_VERIFICATION", async () => {
    vi.spyOn(paymentMethodsRepository, "findByIdAndCliente").mockResolvedValue(
      mockMedio({ estado: "pendiente" })
    );
    await expect(callBid()).rejects.toMatchObject({
      code: "PAYMENT_METHOD_PENDING_VERIFICATION",
    });
  });

  it("medio rechazado → PAYMENT_METHOD_REJECTED", async () => {
    vi.spyOn(paymentMethodsRepository, "findByIdAndCliente").mockResolvedValue(
      mockMedio({ estado: "rechazado" })
    );
    await expect(callBid()).rejects.toMatchObject({ code: "PAYMENT_METHOD_REJECTED" });
  });

  it("medio deshabilitado → PAYMENT_METHOD_DISABLED", async () => {
    vi.spyOn(paymentMethodsRepository, "findByIdAndCliente").mockResolvedValue(
      mockMedio({ estado: "deshabilitado" })
    );
    await expect(callBid()).rejects.toMatchObject({ code: "PAYMENT_METHOD_DISABLED" });
  });

  it("medio no encontrado → PAYMENT_METHOD_NOT_FOUND", async () => {
    vi.spyOn(paymentMethodsRepository, "findByIdAndCliente").mockResolvedValue(null);
    await expect(callBid()).rejects.toBeInstanceOf(NotFoundError);
    await expect(callBid()).rejects.toMatchObject({ code: "PAYMENT_METHOD_NOT_FOUND" });
  });

  it("moneda incompatible → PAYMENT_METHOD_CURRENCY_NOT_ALLOWED", async () => {
    vi.spyOn(paymentMethodsRepository, "findByIdAndCliente").mockResolvedValue(
      mockMedio({ moneda: "USD" })
    );
    await expect(callBid()).rejects.toMatchObject({
      code: "PAYMENT_METHOD_CURRENCY_NOT_ALLOWED",
    });
  });

  it("cheque sin fondos → PAYMENT_METHOD_INSUFFICIENT_FUNDS", async () => {
    vi.spyOn(paymentMethodsRepository, "findByIdAndCliente").mockResolvedValue(
      mockMedio({
        tipo: "cheque_certificado",
        montoDisponible: 5000,
      })
    );
    await expect(callBid(20000)).rejects.toMatchObject({
      code: "PAYMENT_METHOD_INSUFFICIENT_FUNDS",
    });
  });

  it("importe bajo → BID_AMOUNT_TOO_LOW", async () => {
    await expect(callBid(10000)).rejects.toMatchObject({ code: "BID_AMOUNT_TOO_LOW" });
  });

  it("importe alto (comun) → BID_AMOUNT_TOO_HIGH", async () => {
    await expect(callBid(50000)).rejects.toMatchObject({ code: "BID_AMOUNT_TOO_HIGH" });
  });

  it("oro: sin tope 20% pero debe superar mejor oferta", () => {
    expect(() => validateBidAmountRules(500000, 10000, 10000, "oro")).not.toThrow();
    expect(() => validateBidAmountRules(10000, 10000, 10000, "oro")).toThrow(ConflictError);
  });

  it("puja válida con medio verificado", async () => {
    const ctx = await callBid(10100);
    expect(ctx.medioPago.estado).toBe("verificado");
  });
});

describe("Pujas — validateBidAmountRules", () => {
  it("comun: mínimo currentBest + 1% base", () => {
    expect(() => validateBidAmountRules(10050, 10000, 10000, "comun")).toThrow(ConflictError);
    expect(() => validateBidAmountRules(10100, 10000, 10000, "comun")).not.toThrow();
    expect(() => validateBidAmountRules(13000, 10000, 10000, "comun")).toThrow(ConflictError);
  });
});
