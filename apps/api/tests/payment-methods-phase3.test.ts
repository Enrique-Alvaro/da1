import { describe, it, expect, vi, beforeEach } from "vitest";
import * as adminRepository from "../src/modules/payment-methods/payment-methods-admin.repository";
import {
  listPaymentMethodsForReview,
  rejectPaymentMethod,
  resolveVerifierEmployeeId,
  verifyPaymentMethod,
} from "../src/modules/payment-methods/payment-methods-admin.service";
import type { AuthUserContext } from "../src/shared/types/auth";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../src/shared/errors/httpErrors";

const authEmpleado: AuthUserContext = {
  id: "1",
  email: "admin@crownbid.local",
  tokenType: "access",
  role: "empleado",
  employeeId: 1,
  jti: "jti-emp",
  exp: 9999999999,
  expiresAt: new Date(),
};

const authCliente: AuthUserContext = {
  id: "7",
  email: "juan@example.com",
  tokenType: "access",
  role: "cliente",
  jti: "jti-cli",
  exp: 9999999999,
  expiresAt: new Date(),
};

function mockMedio(
  overrides: Partial<adminRepository.MedioPagoAdminListRow> = {}
): adminRepository.MedioPagoAdminListRow {
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
    client_name: "Juan Pérez",
    client_email: "juan@example.com",
    ...overrides,
  };
}

describe("Payment methods — Phase 3 admin service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("resolveVerifierEmployeeId desde JWT empleado", () => {
    expect(resolveVerifierEmployeeId(authEmpleado)).toBe(1);
  });

  it("cliente no puede actuar como verificador", () => {
    expect(() => resolveVerifierEmployeeId(authCliente)).toThrow(ForbiddenError);
  });

  it("admin lista pendientes", async () => {
    vi.spyOn(adminRepository, "listForAdmin").mockResolvedValue([mockMedio()]);
    const r = await listPaymentMethodsForReview(authEmpleado, { status: "pendiente" });
    expect(r.items).toHaveLength(1);
    expect(r.items[0].clientId).toBe(7);
    expect(r.items[0].clientEmail).toBe("juan@example.com");
    expect(adminRepository.listForAdmin).toHaveBeenCalledWith("pendiente");
  });

  it("verify pendiente → verificado", async () => {
    vi.spyOn(adminRepository, "findById").mockResolvedValue(mockMedio({ estado: "pendiente" }));
    vi.spyOn(adminRepository, "verifyById").mockResolvedValue(
      mockMedio({
        estado: "verificado",
        verificador: 1,
        verificadoEn: new Date(),
        motivoRechazo: null,
      })
    );
    const r = await verifyPaymentMethod(authEmpleado, 1);
    expect(r.status).toBe("verificado");
    expect(r.verifierId).toBe(1);
    expect(adminRepository.verifyById).toHaveBeenCalledWith(1, 1);
  });

  it("verify ya verificado es idempotente", async () => {
    vi.spyOn(adminRepository, "findById").mockResolvedValue(
      mockMedio({
        estado: "verificado",
        verificador: 1,
        verificadoEn: new Date(),
      })
    );
    const verifySpy = vi.spyOn(adminRepository, "verifyById");
    const r = await verifyPaymentMethod(authEmpleado, 1);
    expect(r.status).toBe("verificado");
    expect(verifySpy).not.toHaveBeenCalled();
  });

  it("verify rechazado limpia motivo y verifica", async () => {
    vi.spyOn(adminRepository, "findById").mockResolvedValue(
      mockMedio({ estado: "rechazado", motivoRechazo: "Antes" })
    );
    vi.spyOn(adminRepository, "verifyById").mockResolvedValue(
      mockMedio({
        estado: "verificado",
        motivoRechazo: null,
        verificador: 1,
        verificadoEn: new Date(),
      })
    );
    const r = await verifyPaymentMethod(authEmpleado, 1);
    expect(r.status).toBe("verificado");
    expect(adminRepository.verifyById).toHaveBeenCalled();
  });

  it("verify deshabilitado → 409", async () => {
    vi.spyOn(adminRepository, "findById").mockResolvedValue(
      mockMedio({ estado: "deshabilitado" })
    );
    await expect(verifyPaymentMethod(authEmpleado, 1)).rejects.toMatchObject({
      code: "PAYMENT_METHOD_DISABLED",
      statusCode: 409,
    });
  });

  it("reject pendiente con motivo", async () => {
    vi.spyOn(adminRepository, "findById").mockResolvedValue(mockMedio({ estado: "pendiente" }));
    vi.spyOn(adminRepository, "rejectById").mockResolvedValue(
      mockMedio({
        estado: "rechazado",
        motivoRechazo: "Cuenta inválida",
        verificador: 1,
        verificadoEn: null,
      })
    );
    const r = await rejectPaymentMethod(authEmpleado, 1, {
      reason: "Cuenta inválida",
    });
    expect(r.status).toBe("rechazado");
    expect(r.rejectionReason).toBe("Cuenta inválida");
    expect(adminRepository.rejectById).toHaveBeenCalledWith(1, 1, "Cuenta inválida");
  });

  it("reject verificado revoca verificación", async () => {
    vi.spyOn(adminRepository, "findById").mockResolvedValue(
      mockMedio({
        estado: "verificado",
        verificadoEn: new Date(),
        verificador: 1,
      })
    );
    vi.spyOn(adminRepository, "rejectById").mockResolvedValue(
      mockMedio({
        estado: "rechazado",
        motivoRechazo: "Revocado",
        verificador: 1,
        verificadoEn: null,
      })
    );
    const r = await rejectPaymentMethod(authEmpleado, 1, { reason: "Revocado" });
    expect(r.status).toBe("rechazado");
    expect(r.verifierId).toBe(1);
  });

  it("reject deshabilitado → 409", async () => {
    vi.spyOn(adminRepository, "findById").mockResolvedValue(
      mockMedio({ estado: "deshabilitado" })
    );
    await expect(
      rejectPaymentMethod(authEmpleado, 1, { reason: "x" })
    ).rejects.toMatchObject({ code: "PAYMENT_METHOD_DISABLED" });
  });

  it("verify inexistente → 404", async () => {
    vi.spyOn(adminRepository, "findById").mockResolvedValue(null);
    await expect(verifyPaymentMethod(authEmpleado, 999)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it("cliente no puede listar admin", async () => {
    await expect(
      listPaymentMethodsForReview(authCliente, { status: "pendiente" })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
