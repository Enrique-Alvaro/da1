import { describe, expect, it, vi, beforeEach } from "vitest";
import { createAuction } from "../src/modules/admin/admin-auctions.controller";
import * as adminProductosService from "../src/modules/admin/admin-productos.service";
import * as submissionsRepository from "../src/modules/productos/productos-submissions.repository";
import { getEmpleadoMe } from "../src/modules/empleados/empleados.controller";
import * as empleadosRepository from "../src/modules/empleados/empleados.repository";
import { ForbiddenError } from "../src/shared/errors/httpErrors";
import type { AuthUserContext } from "../src/shared/types/auth";

const sampleRow = {
  identificador: 100,
  descripcionCatalogo: "Rolex",
  descripcionCompleta: "https://example.com/doc.pdf",
  disponible: "no",
  revisor: 1,
  duenio: 7,
  seguro: "POL-1",
  fecha: new Date("2026-06-01"),
  isScheduled: false,
  isSold: false,
  catalogItemId: null,
  auctionId: null,
  imageCount: 6,
  precioBaseAsignado: null,
  comisionAsignada: null,
  auctionFecha: null,
  auctionHora: null,
  auctionUbicacion: null,
  catalogId: null,
  depositoUbicacion: "Depósito Central",
  declaracionesJson: null,
  seguroCompania: "Sancor",
  motivoRechazo: null,
  notasRevision: null,
  numeroPieza: null,
  artistaODisenador: null,
  fechaOrigen: null,
  historia: null,
  componentes: null,
};

const authEmpleado: AuthUserContext = {
  id: "2",
  email: "admin@crownbid.local",
  tokenType: "access",
  role: "empleado",
  employeeId: 2,
  jti: "j1",
  exp: 9999999999,
  expiresAt: new Date(),
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/admin/subastas", () => {
  const validBody = {
    fecha: "2020-01-01",
    hora: "18:00",
    horaFin: "22:00",
    ubicacion: "Salón Principal CrownBid",
    capacidadAsistentes: 120,
    tieneDeposito: "si",
    seguridadPropia: "si",
    categoria: "platino",
    moneda: "ARS",
  };

  it("forwards schedule validation errors to error middleware instead of crashing", async () => {
    const res = { status: vi.fn(() => ({ json: vi.fn() })) };
    const next = vi.fn();
    createAuction({ body: validBody } as never, res as never, next);
    await new Promise((resolve) => setImmediate(resolve));
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: "AUCTION_START_IN_PAST", statusCode: 400 })
    );
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("admin productos operational endpoints", () => {
  it("updateProductDeposito returns mapped detail", async () => {
    vi.spyOn(submissionsRepository, "updateProductDepositoUbicacion").mockResolvedValue(sampleRow);
    vi.spyOn(submissionsRepository, "listPhotoIdsByProduct").mockResolvedValue([]);

    const result = await adminProductosService.updateProductDeposito(100, {
      depositoUbicacion: "Depósito Central",
    });
    expect(result.depositLocation).toBe("Depósito Central");
  });

  it("updateProductSeguro returns insurance fields", async () => {
    vi.spyOn(submissionsRepository, "upsertProductInsurance").mockResolvedValue(sampleRow);
    vi.spyOn(submissionsRepository, "listPhotoIdsByProduct").mockResolvedValue([]);

    const result = await adminProductosService.updateProductSeguro(100, {
      seguro: "POL-1",
      compania: "Sancor",
    });
    expect(result.insurancePolicyNumber).toBe("POL-1");
    expect(result.insuranceCompany).toBe("Sancor");
  });
});

describe("GET /api/empleados/me", () => {
  it("returns employee profile from JWT", async () => {
    vi.spyOn(empleadosRepository, "requireEmpleadoById").mockResolvedValue({
      identificador: 2,
      cargo: "Operador",
      sector: 1,
    });

    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    await getEmpleadoMe(
      { authUser: authEmpleado } as never,
      { status } as never,
      vi.fn()
    );

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      employeeId: 2,
      email: "admin@crownbid.local",
      role: "empleado",
      cargo: "Operador",
      sector: 1,
    });
  });

  it("forbids client token", async () => {
    const cliente: AuthUserContext = { ...authEmpleado, role: "cliente", employeeId: undefined };
    const next = vi.fn();
    await getEmpleadoMe({ authUser: cliente } as never, {} as never, next);
    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});
