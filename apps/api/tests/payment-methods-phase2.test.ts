import { describe, it, expect, vi, beforeEach } from "vitest";
import * as usersRepository from "../src/modules/users/users.repository";
import * as paymentMethodsRepository from "../src/modules/payment-methods/payment-methods.repository";
import {
  createPaymentMethod,
  disablePaymentMethod,
  listMyPaymentMethods,
  resolveClienteId,
} from "../src/modules/payment-methods/payment-methods.service";
import type { AuthUserContext } from "../src/shared/types/auth";
import { BadRequestError, NotFoundError } from "../src/shared/errors/httpErrors";

const authCliente: AuthUserContext = {
  id: "7",
  email: "juan@example.com",
  tokenType: "access",
  role: "cliente",
  jti: "jti-1",
  exp: 9999999999,
  expiresAt: new Date(),
};

function mockMedio(overrides: Partial<paymentMethodsRepository.MedioPagoRow> = {}) {
  const now = new Date("2026-01-15T12:00:00.000Z");
  return {
    identificador: 1,
    cliente: 7,
    tipo: "tarjeta_credito",
    estado: "pendiente",
    moneda: "ARS",
    titular: "Juan Pérez",
    entidad: "Visa",
    ultimosDigitos: "3456",
    aliasOCbu: null,
    montoGarantia: null,
    montoDisponible: null,
    motivoRechazo: null,
    verificador: null,
    creadoEn: now,
    actualizadoEn: now,
    verificadoEn: null,
    ...overrides,
  };
}

const clienteIdentity = {
  identificador: 7,
  admitido: "si",
  categoria: "comun",
};

describe("Payment methods — Phase 2 service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(clienteIdentity);
  });

  it("resolveClienteId usa findClienteByPersonId (fila real en dbo.clientes)", async () => {
    const id = await resolveClienteId(authCliente);
    expect(id).toBe(7);
    expect(usersRepository.findClienteByPersonId).toHaveBeenCalledWith(7);
  });

  it("resolveClienteId sin fila en clientes → CLIENT_NOT_FOUND", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(null);
    await expect(resolveClienteId(authCliente)).rejects.toMatchObject({
      statusCode: 403,
      code: "CLIENT_NOT_FOUND",
    });
  });

  it("listMyPaymentMethods devuelve lista vacía", async () => {
    vi.spyOn(paymentMethodsRepository, "listByCliente").mockResolvedValue([]);
    const r = await listMyPaymentMethods(authCliente);
    expect(r.items).toEqual([]);
    expect(paymentMethodsRepository.listByCliente).toHaveBeenCalledWith(7);
  });

  it("createPaymentMethod tarjeta con últimos 4 → pendiente", async () => {
    vi.spyOn(paymentMethodsRepository, "insertMedioPago").mockResolvedValue(
      mockMedio({ tipo: "tarjeta_credito", ultimosDigitos: "3456" })
    );
    const r = await createPaymentMethod(authCliente, {
      tipo: "tarjeta_credito",
      moneda: "ARS",
      titular: "Juan Pérez",
      entidad: "Visa",
      ultimosDigitos: "3456",
    });
    expect(r.status).toBe("pendiente");
    expect(r.type).toBe("tarjeta_credito");
    expect(paymentMethodsRepository.insertMedioPago).toHaveBeenCalled();
  });

  it("createPaymentMethod rechaza CVV con CVV_NOT_ALLOWED", async () => {
    await expect(
      createPaymentMethod(authCliente, {
        tipo: "tarjeta_credito",
        moneda: "ARS",
        titular: "Juan",
        entidad: "Visa",
        ultimosDigitos: "3456",
        cvv: "123",
      })
    ).rejects.toMatchObject({
      code: "CVV_NOT_ALLOWED",
    });
  });

  it("createPaymentMethod rechaza número de tarjeta completo", async () => {
    await expect(
      createPaymentMethod(authCliente, {
        tipo: "tarjeta_credito",
        moneda: "ARS",
        titular: "Juan",
        entidad: "Visa",
        cardNumber: "4111111111111111",
      })
    ).rejects.toMatchObject({
      code: "FULL_CARD_NUMBER_NOT_ALLOWED",
    });
  });

  it("createPaymentMethod cheque inicializa montos", async () => {
    vi.spyOn(paymentMethodsRepository, "insertMedioPago").mockImplementation(async (input) => {
      expect(input.body.montoGarantia).toBe(100000);
      return mockMedio({
        tipo: "cheque_certificado",
        montoGarantia: 100000,
        montoDisponible: 100000,
      });
    });
    await createPaymentMethod(authCliente, {
      tipo: "cheque_certificado",
      moneda: "USD",
      titular: "Juan Pérez",
      entidad: "Banco Nacional",
      montoGarantia: 100000,
    });
    expect(paymentMethodsRepository.insertMedioPago).toHaveBeenCalled();
  });

  it("createPaymentMethod cheque sin montoGarantia → error", async () => {
    await expect(
      createPaymentMethod(authCliente, {
        tipo: "cheque_certificado",
        moneda: "USD",
        titular: "Juan",
        entidad: "Banco",
      })
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("createPaymentMethod no acepta estado verificado en body", async () => {
    await expect(
      createPaymentMethod(authCliente, {
        tipo: "tarjeta_credito",
        moneda: "ARS",
        titular: "Juan",
        entidad: "Visa",
        ultimosDigitos: "3456",
        estado: "verificado",
      })
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("disablePaymentMethod idempotente si ya deshabilitado", async () => {
    vi.spyOn(paymentMethodsRepository, "disableMedioPago").mockResolvedValue(
      mockMedio({ estado: "deshabilitado" })
    );
    const r = await disablePaymentMethod(authCliente, 1);
    expect(r.status).toBe("deshabilitado");
  });

  it("disablePaymentMethod en rechazado conserva estado rechazado", async () => {
    vi.spyOn(paymentMethodsRepository, "disableMedioPago").mockResolvedValue(
      mockMedio({
        estado: "rechazado",
        motivoRechazo: "Datos inválidos",
      })
    );
    const r = await disablePaymentMethod(authCliente, 1);
    expect(r.status).toBe("rechazado");
  });

  it("disablePaymentMethod ajeno → 404", async () => {
    vi.spyOn(paymentMethodsRepository, "disableMedioPago").mockResolvedValue(null);
    await expect(disablePaymentMethod(authCliente, 999)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("usersRepository — contrato cliente", () => {
  it("expone findClienteByPersonId para validación explícita de dbo.clientes", () => {
    expect(typeof usersRepository.findClienteByPersonId).toBe("function");
    expect(typeof usersRepository.findProfileByPersonId).toBe("function");
    // findProfileByPersonId: INNER JOIN dbo.clientes — sin fila de cliente no hay perfil.
    // Medios de pago usan findClienteByPersonId por contrato explícito del flujo de pagos.
  });
});

describe("Payment methods — schema", () => {
  it("ultimosDigitos inválidos fallan validación", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue(clienteIdentity);
    await expect(
      createPaymentMethod(authCliente, {
        tipo: "tarjeta_credito",
        moneda: "ARS",
        titular: "Juan",
        entidad: "Visa",
        ultimosDigitos: "12",
      })
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});
