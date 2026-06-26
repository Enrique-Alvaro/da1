import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotFoundError, UnauthorizedError } from "../src/shared/errors/httpErrors";
import * as usersRepository from "../src/modules/users/users.repository";
import * as paymentMethodsRepository from "../src/modules/payment-methods/payment-methods.repository";
import * as subastasRepository from "../src/modules/subastas/subastas.repository";
import {
  admitCliente,
  getAdminClientDetail,
  listAdminClients,
} from "../src/modules/admin/admin-clients.service";
import { getMyOperationalStatus } from "../src/modules/users/users-me-status.service";
import { assertCanBid } from "../src/modules/pujos/pujos.service";
import { forgotPassword, logout, resetPassword } from "../src/modules/auth/auth.service";
import * as authRepository from "../src/modules/auth/auth.repository";
import * as passwordResetRepository from "../src/modules/auth/auth-password-reset.repository";
import type { AuthUserContext } from "../src/shared/types/auth";
import { liveSubastaRow } from "./helpers/live-subasta";

const authCliente: AuthUserContext = {
  id: "7",
  email: "juan@example.com",
  tokenType: "access",
  role: "cliente",
  jti: "j1",
  exp: 9999999999,
  expiresAt: new Date(),
};

const authEmpleado: AuthUserContext = {
  id: "2",
  email: "emp@example.com",
  tokenType: "access",
  role: "empleado",
  employeeId: 2,
  jti: "j2",
  exp: 9999999999,
  expiresAt: new Date(),
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("admin client admission", () => {
  it("employee can admit client and set category", async () => {
    vi.spyOn(usersRepository, "updateClienteAdmission").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "plata",
    });

    const result = await admitCliente(7, { admitido: "si", categoria: "plata" });
    expect(result.admitido).toBe("si");
    expect(result.categoria).toBe("plata");
  });

  it("returns 404 for non-existing client", async () => {
    vi.spyOn(usersRepository, "updateClienteAdmission").mockRejectedValue(
      new NotFoundError("Cliente no encontrado.", "CLIENT_NOT_FOUND")
    );
    await expect(admitCliente(999, { admitido: "si" })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists clients with admission filter", async () => {
    vi.spyOn(usersRepository, "listAdminClients").mockResolvedValue([
      {
        identificador: 7,
        full_name: "Juan",
        email: "juan@example.com",
        admitido: "no",
        categoria: "comun",
        document_number: "40123456",
        country_name: "Argentina",
        registered_at: new Date("2026-01-01"),
        payment_method_count: 1,
        verified_payment_method_count: 0,
      },
    ]);

    const result = await listAdminClients({ admitido: "no", limit: 50, offset: 0 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.admitido).toBe("no");
    expect(result.items[0]?.clienteId).toBe(7);
  });

  it("admin detail includes admission and payment summary", async () => {
    vi.spyOn(usersRepository, "findAdminClientDetail").mockResolvedValue({
      identificador: 7,
      full_name: "Juan",
      email: "juan@example.com",
      admitido: "no",
      categoria: "comun",
      document_number: "40123456",
      status: "activo",
      country_name: "Argentina",
      registered_at: new Date("2026-01-01"),
      payment_method_count: 2,
      verified_payment_method_count: 1,
    });

    const detail = await getAdminClientDetail(7);
    expect(detail.admitido).toBe("no");
    expect(detail.paymentMethods.verified).toBe(1);
  });
});

describe("client operational status", () => {
  it("reports USER_NOT_ADMITTED when admitido is no", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "no",
      categoria: "comun",
    });
    vi.spyOn(paymentMethodsRepository, "listByCliente").mockResolvedValue([]);

    const status = await getMyOperationalStatus(authCliente);
    expect(status.canBid).toBe(false);
    expect(status.cannotBidReason).toBe("USER_NOT_ADMITTED");
  });

  it("reports canBid when admitted and verified payment method exists", async () => {
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
        titular: "Juan",
        entidad: "Visa",
        ultimosDigitos: "1234",
        montoGarantia: null,
        montoDisponible: null,
        verificador: 1,
        motivoRechazo: null,
      },
    ]);

    const status = await getMyOperationalStatus(authCliente);
    expect(status.canBid).toBe(true);
    expect(status.cannotBidReason).toBeNull();
  });

  it("employee cannot use client status endpoint", async () => {
    await expect(getMyOperationalStatus(authEmpleado)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("admission enables bidding guard", () => {
  it("assertCanBid passes admission when cliente is admitted", async () => {
    vi.spyOn(usersRepository, "findClienteByPersonId").mockResolvedValue({
      identificador: 7,
      admitido: "si",
      categoria: "comun",
    });
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue(liveSubastaRow());
    vi.spyOn(paymentMethodsRepository, "findByIdAndCliente").mockResolvedValue({
      identificador: 3,
      cliente: 7,
      tipo: "tarjeta_credito",
      estado: "verificado",
      moneda: "ARS",
      titular: "Juan",
      entidad: "Visa",
      ultimosDigitos: "1234",
      montoGarantia: 50000,
      montoDisponible: 50000,
      verificador: 1,
      motivoRechazo: null,
    });

    const pujosRepo = await import("../src/modules/pujos/pujos.repository");
    vi.spyOn(pujosRepo, "findAsistenteByClienteAndSubasta").mockResolvedValue({
      identificador: 1,
      numeroPostor: 1,
      cliente: 7,
      subasta: 10,
    });
    vi.spyOn(pujosRepo, "findItemInSubasta").mockResolvedValue({
      identificador: 20,
      precioBase: 1000,
      subastaId: 10,
      ownerPersonId: 99,
    });
    vi.spyOn(pujosRepo, "getMaxBidForItem").mockResolvedValue(null);
    vi.spyOn(pujosRepo, "sumLeadingBidExposureForCliente").mockResolvedValue(0);

    const itemsRepo = await import("../src/modules/subastas/subastas-items.repository");
    vi.spyOn(itemsRepo, "listCatalogItemsBySubasta").mockResolvedValue([
      {
        identificador: 20,
        catalogo: 1,
        producto: 1,
        precioBase: 1000,
        comision: 100,
        subastado: "no",
        descripcionCatalogo: "Ítem",
        descripcionCompleta: "http://x",
        subastaId: 10,
        catalogDescription: null,
        isSoldInRegistro: 0,
        duenio: 99,
      },
    ]);

    const liveSessionStore = await import("../src/modules/subastas/live-session.store");
    liveSessionStore.enterSession(7, 10);

    await expect(
      assertCanBid({
        authUser: authCliente,
        auctionId: 10,
        itemId: 20,
        amount: 1100,
        paymentMethodId: 3,
      })
    ).resolves.toBeDefined();
  });
});

describe("auth alignment", () => {
  it("forgotPassword returns generic message for unknown email", async () => {
    vi.spyOn(authRepository, "findCredentialByEmailWithPassword").mockResolvedValue(null);
    const result = await forgotPassword({ email: "a@b.com" });
    expect(result.message).toContain("correo");
  });

  it("resetPassword rejects invalid token", async () => {
    vi.spyOn(passwordResetRepository, "findValidPasswordResetToken").mockResolvedValue(null);
    await expect(
      resetPassword({ token: "some-valid-length-token-here", password: "NewStrong789" })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("logout returns client-side discard message", async () => {
    const result = await logout(authCliente);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Descartar");
  });
});
