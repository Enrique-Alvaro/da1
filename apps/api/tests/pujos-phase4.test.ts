import { describe, it, expect, vi, beforeEach } from "vitest";
import * as usersRepository from "../src/modules/users/users.repository";
import * as paymentMethodsRepository from "../src/modules/payment-methods/payment-methods.repository";
import * as subastasRepository from "../src/modules/subastas/subastas.repository";
import * as pujosRepository from "../src/modules/pujos/pujos.repository";
import * as itemsRepository from "../src/modules/subastas/subastas-items.repository";
import {
  assertCanBid,
  assertCategoryAllowed,
  createBid,
  registerAsistenteForAuction,
  validateBidAmountRules,
} from "../src/modules/pujos/pujos.service";
import { assertPaymentMethodForBid } from "../src/modules/pujos/pujos-payment-validation";
import type { AuthUserContext } from "../src/shared/types/auth";
import * as liveSessionStore from "../src/modules/subastas/live-session.store";
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
    liveSessionStore.clearAllLiveSessions();
    liveSessionStore.enterSession(7, 10);
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(clienteAdmitido);
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(subastaAbierta);
    vi.spyOn(pujosRepository, "findAsistenteByClienteAndSubasta").mockResolvedValue(asistente);
    vi.spyOn(pujosRepository, "findItemInSubasta").mockResolvedValue(item);
    vi.spyOn(paymentMethodsRepository, "findByIdAndCliente").mockResolvedValue(mockMedio());
    vi.spyOn(pujosRepository, "getMaxBidForItem").mockResolvedValue(null);
    vi.spyOn(itemsRepository, "listCatalogItemsBySubasta").mockResolvedValue([
      {
        identificador: 100,
        catalogo: 1,
        producto: 1,
        precioBase: 10000,
        comision: 1000,
        subastado: "no",
        descripcionCatalogo: "Ítem",
        descripcionCompleta: "http://x",
        subastaId: 10,
        catalogDescription: null,
        isSoldInRegistro: 0,
      },
    ]);
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

  it("empleado → CLIENT_AUTH_REQUIRED", async () => {
    await expect(
      assertCanBid({
        authUser: authEmpleado,
        auctionId: 10,
        itemId: 100,
        amount: 10100,
        paymentMethodId: 3,
      })
    ).rejects.toMatchObject({ code: "CLIENT_AUTH_REQUIRED", statusCode: 403 });
  });

  it("sin fila cliente → CLIENT_NOT_FOUND", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(null);
    await expect(callBid()).rejects.toMatchObject({ code: "CLIENT_NOT_FOUND" });
  });

  it("admitido != si → USER_NOT_ADMITTED", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      ...clienteAdmitido,
      admitido: "no",
    });
    await expect(callBid()).rejects.toMatchObject({ code: "USER_NOT_ADMITTED" });
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
    await expect(callBid()).rejects.toMatchObject({ code: "CATEGORY_NOT_ALLOWED" });
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
      code: "PAYMENT_METHOD_CURRENCY_MISMATCH",
    });
  });

  it("cheque sin fondos → GUARANTEE_LIMIT_EXCEEDED", async () => {
    vi.spyOn(paymentMethodsRepository, "findByIdAndCliente").mockResolvedValue(
      mockMedio({
        tipo: "cheque_certificado",
        montoDisponible: 5000,
      })
    );
    await expect(callBid(20000)).rejects.toMatchObject({
      code: "GUARANTEE_LIMIT_EXCEEDED",
    });
  });

  it("importe bajo → BID_TOO_LOW", async () => {
    await expect(callBid(10000)).rejects.toMatchObject({ code: "BID_TOO_LOW" });
  });

  it("importe alto (comun) → BID_TOO_HIGH", async () => {
    await expect(callBid(50000)).rejects.toMatchObject({ code: "BID_TOO_HIGH" });
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

describe("Pujas — revalidación de medio en transacción", () => {
  it("assertPaymentMethodForBid rechaza deshabilitado (misma lógica que UPDLOCK en insert)", () => {
    try {
      assertPaymentMethodForBid(
        {
          identificador: 3,
          cliente: 7,
          tipo: "tarjeta_credito",
          estado: "deshabilitado",
          moneda: "ARS",
          montoDisponible: null,
        },
        "ARS",
        10100
      );
      expect.fail("debía lanzar PAYMENT_METHOD_DISABLED");
    } catch (e) {
      expect(e).toMatchObject({ code: "PAYMENT_METHOD_DISABLED" });
    }
  });

  it("assertPaymentMethodForBid rechaza rechazado", () => {
    try {
      assertPaymentMethodForBid(
        {
          identificador: 3,
          cliente: 7,
          tipo: "tarjeta_credito",
          estado: "rechazado",
          moneda: "ARS",
          montoDisponible: null,
        },
        "ARS",
        10100
      );
      expect.fail("debía lanzar PAYMENT_METHOD_REJECTED");
    } catch (e) {
      expect(e).toMatchObject({ code: "PAYMENT_METHOD_REJECTED" });
    }
  });
});

describe("Pujas — registro asistente", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(clienteAdmitido);
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(subastaAbierta);
    vi.spyOn(pujosRepository, "findAsistenteByClienteAndSubasta").mockResolvedValue(null);
    vi.spyOn(pujosRepository, "countAsistentesBySubasta").mockResolvedValue(0);
    vi.spyOn(pujosRepository, "insertAsistenteInTransaction").mockResolvedValue(asistente);
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
    await expect(registerAsistenteForAuction(authCliente, 10)).rejects.toMatchObject({
      code: "CATEGORY_NOT_ALLOWED",
    });
    expect(pujosRepository.insertAsistenteInTransaction).not.toHaveBeenCalled();
  });

  it("inscripción usa insertAsistenteInTransaction", async () => {
    const row = await registerAsistenteForAuction(authCliente, 10);
    expect(row.identificador).toBe(50);
    expect(pujosRepository.insertAsistenteInTransaction).toHaveBeenCalledWith(7, 10);
  });

  it("idempotente si ya existe asistente", async () => {
    vi.spyOn(pujosRepository, "findAsistenteByClienteAndSubasta").mockResolvedValue(asistente);
    const row = await registerAsistenteForAuction(authCliente, 10);
    expect(row).toEqual(asistente);
    expect(pujosRepository.insertAsistenteInTransaction).not.toHaveBeenCalled();
  });
});

describe("Pujas — createBid pasa revalidación de medio a transacción", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    liveSessionStore.clearAllLiveSessions();
    liveSessionStore.enterSession(7, 10);
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(clienteAdmitido);
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(subastaAbierta);
    vi.spyOn(pujosRepository, "findAsistenteByClienteAndSubasta").mockResolvedValue(asistente);
    vi.spyOn(pujosRepository, "findItemInSubasta").mockResolvedValue(item);
    vi.spyOn(paymentMethodsRepository, "findByIdAndCliente").mockResolvedValue(mockMedio());
    vi.spyOn(pujosRepository, "getMaxBidForItem").mockResolvedValue(null);
    vi.spyOn(itemsRepository, "listCatalogItemsBySubasta").mockResolvedValue([
      {
        identificador: 100,
        catalogo: 1,
        producto: 1,
        precioBase: 10000,
        comision: 1000,
        subastado: "no",
        descripcionCatalogo: "Ítem",
        descripcionCompleta: "http://x",
        subastaId: 10,
        catalogDescription: null,
        isSoldInRegistro: 0,
      },
    ]);
    vi.spyOn(pujosRepository, "insertBidInTransaction").mockResolvedValue({
      identificador: 1,
      asistente: 50,
      item: 100,
      importe: 10100,
      ganador: "no",
    });
  });

  it("insertBidInTransaction recibe clienteId, paymentMethodId y auctionCurrency", async () => {
    await createBid(authCliente, 10, {
      itemId: 100,
      amount: 10100,
      paymentMethodId: 3,
    });
    expect(pujosRepository.insertBidInTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: 7,
        paymentMethodId: 3,
        auctionCurrency: "ARS",
        importe: 10100,
      })
    );
  });
});

describe("Pujas — assertCategoryAllowed", () => {
  it("comun no puede oro", () => {
    expect(() => assertCategoryAllowed("comun", "oro")).toThrow(ForbiddenError);
  });
});

describe("Pujas — validateBidAmountRules", () => {
  it("comun: mínimo currentBest + 1% base", () => {
    expect(() => validateBidAmountRules(10050, 10000, 10000, "comun")).toThrow(ConflictError);
    expect(() => validateBidAmountRules(10100, 10000, 10000, "comun")).not.toThrow();
    expect(() => validateBidAmountRules(13000, 10000, 10000, "comun")).toThrow(ConflictError);
  });
});
