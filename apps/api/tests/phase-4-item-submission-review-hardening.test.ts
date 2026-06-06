import { describe, it, expect, vi, beforeEach } from "vitest";
import * as submissionsRepository from "../src/modules/productos/productos-submissions.repository";
import * as itemsRepository from "../src/modules/subastas/subastas-items.repository";
import * as subastasRepository from "../src/modules/subastas/subastas.repository";
import {
  acceptSolicitudApi,
  assignSolicitudApi,
  createSolicitud,
  listAdminSolicitudesApi,
  rejectSolicitudApi,
} from "../src/modules/productos/productos-submissions-api.service";
import { listAuctionItems } from "../src/modules/subastas/subastas.service";
import { ConflictError } from "../src/shared/errors/httpErrors";
import type { AuthUserContext } from "../src/shared/types/auth";
import * as submissionsService from "../src/modules/productos/productos-submissions.service";

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
  id: "1",
  email: "emp@example.com",
  tokenType: "access",
  role: "empleado",
  employeeId: 2,
  jti: "j2",
  exp: 9999999999,
  expiresAt: new Date(),
};

const sampleRow = {
  identificador: 100,
  descripcionCatalogo: "Rolex",
  descripcionCompleta: "https://example.com/doc.pdf",
  disponible: "no",
  revisor: 1,
  duenio: 7,
  seguro: null,
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
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Phase 4 — item submission / review / assignment", () => {
  it("employee cannot create client submission", async () => {
    await expect(
      createSolicitud(authEmpleado, {
        catalogDescription: "X",
        fullDescriptionUrl: "https://example.com/x.pdf",
        images: [],
        declarations: {
          legitimateOwner: true,
          noLegalRestrictions: true,
          acceptsDocumentationRequest: true,
          acceptsReturnCostsIfRejected: true,
        },
      })
    ).rejects.toMatchObject({ code: "CLIENT_AUTH_REQUIRED" });
  });

  it("accept blocks already assigned product", async () => {
    vi.spyOn(submissionsRepository, "findSubmissionById").mockResolvedValue({
      ...sampleRow,
      isScheduled: true,
      catalogItemId: 20,
    });
    await expect(
      acceptSolicitudApi(2, 100, { basePrice: 500, commissionPercent: 10 })
    ).rejects.toMatchObject({ code: "ITEM_ALREADY_ASSIGNED" });
  });

  it("assign blocks duplicate assignment", async () => {
    vi.spyOn(submissionsRepository, "findSubmissionById").mockResolvedValue({
      ...sampleRow,
      isScheduled: true,
      catalogItemId: 20,
    });
    await expect(
      assignSolicitudApi(2, 100, {
        catalogId: 2,
        precioBase: 500,
        comision: 50,
      })
    ).rejects.toMatchObject({ code: "ITEM_ALREADY_ASSIGNED" });
  });

  it("reject returns REJECTION_NOT_SUPPORTED_BY_SCHEMA", async () => {
    await expect(
      rejectSolicitudApi(2, 100, { reason: "No califica" })
    ).rejects.toMatchObject({ code: "REJECTION_NOT_SUPPORTED_BY_SCHEMA" });
  });

  it("assigned catalog item appears in auction items list", async () => {
    vi.spyOn(subastasRepository, "requireSubastaById").mockResolvedValue({
      identificador: 10,
      fecha: "2026-06-10",
      hora: "18:00:00",
      estado: "abierta",
      subastador: 1,
      ubicacion: "CABA",
      capacidadAsistentes: 50,
      tieneDeposito: "no",
      seguridadPropia: "no",
      categoria: "comun",
      moneda: "ARS",
    });
    vi.spyOn(itemsRepository, "listCatalogItemsBySubasta").mockResolvedValue([
      {
        identificador: 20,
        catalogo: 2,
        producto: 100,
        precioBase: 500,
        comision: 50,
        subastado: "no",
        descripcionCatalogo: "Rolex",
        descripcionCompleta: "https://example.com/doc.pdf",
        subastaId: 10,
        catalogDescription: null,
        isSoldInRegistro: 0,
      },
    ]);
    vi.spyOn(itemsRepository, "listBidSummariesForSubasta").mockResolvedValue([
      { itemId: 20, maxBid: null, bidCount: 0 },
    ]);
    vi.spyOn(itemsRepository, "listPhotoIdsByProduct").mockResolvedValue([1, 2, 3, 4, 5, 6]);

    const result = await listAuctionItems(10, undefined);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(20);
    expect(result.items[0].productId).toBe(100);
  });

  it("admin list returns submissions for employee flow", async () => {
    vi.spyOn(submissionsRepository, "listAdminSubmissions").mockResolvedValue([sampleRow]);
    const items = await listAdminSolicitudesApi({ status: "pending" });
    expect(items[0]?.productId).toBe(100);
  });

  it("successful assign delegates to assignToAuction", async () => {
    vi.spyOn(submissionsRepository, "findSubmissionById")
      .mockResolvedValueOnce({ ...sampleRow, disponible: "si" })
      .mockResolvedValueOnce({
        ...sampleRow,
        disponible: "si",
        isScheduled: true,
        catalogItemId: 20,
        auctionId: 10,
        catalogId: 2,
        precioBaseAsignado: 500,
      });
    vi.spyOn(submissionsService, "assignToAuction").mockResolvedValue({
      id: 100,
      catalogDescription: "Rolex",
      fullDescriptionUrl: "https://example.com/doc.pdf",
      status: "scheduled",
      statusLabel: "Programado",
      available: "si",
      submittedAt: "2026-06-01",
      imageCount: 6,
      isScheduled: true,
      reviewerEmployeeId: 1,
      ownerId: 7,
      photos: [],
      isSold: false,
      catalogItemId: 20,
      auctionId: 10,
    });

    const result = await assignSolicitudApi(2, 100, {
      auctionId: 10,
      basePrice: 500,
      commissionPercent: 10,
    });
    expect(result.catalogItemId).toBe(20);
    expect(result.status).toBe("ASSIGNED_TO_AUCTION");
  });
});
