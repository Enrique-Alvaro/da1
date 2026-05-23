import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  acceptSolicitudApi,
  assignSolicitudApi,
  createSolicitud,
  getMySolicitudApi,
  listAdminSolicitudesApi,
  listMySolicitudesApi,
  rejectSolicitudApi,
  acceptTermsApi,
} from "../src/modules/productos/productos-submissions-api.service";
import * as submissionsService from "../src/modules/productos/productos-submissions.service";
import * as submissionsRepository from "../src/modules/productos/productos-submissions.repository";
import * as dueniosRepository from "../src/modules/duenios/duenios.repository";
import { ConflictError, NotFoundError } from "../src/shared/errors/httpErrors";
import type { AuthUserContext } from "../src/shared/types/auth";
import { MIN_PRODUCT_IMAGES } from "../src/shared/validation/productImages";
import {
  createSolicitudBodySchema,
  adminRejectSubmissionBodySchema,
} from "../src/modules/productos/productos-submissions.schema";
import { toApiSubmissionStatus } from "../src/modules/productos/submission-api-status";

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

const baseImage = {
  filename: "a.jpg",
  mimeType: "image/jpeg",
  base64:
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
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

describe("createSolicitudBodySchema", () => {
  it("rejects fewer than 6 fotos", () => {
    const parsed = createSolicitudBodySchema.safeParse({
      nombre: "Reloj",
      descripcion: "Excelente estado",
      declaracionPropiedad: true,
      declaracionSinImpedimentos: true,
      origenLicitoDeclarado: true,
      fotos: Array.from({ length: MIN_PRODUCT_IMAGES - 1 }, () => baseImage.base64),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects without ownership declaration", () => {
    const parsed = createSolicitudBodySchema.safeParse({
      nombre: "Reloj",
      descripcion: "Excelente estado",
      declaracionPropiedad: false,
      declaracionSinImpedimentos: true,
      origenLicitoDeclarado: true,
      fotos: Array.from({ length: MIN_PRODUCT_IMAGES }, () => baseImage.base64),
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts valid solicitud with 6 fotos", () => {
    const parsed = createSolicitudBodySchema.safeParse({
      nombre: "Reloj",
      descripcion: "Excelente estado",
      declaracionPropiedad: true,
      declaracionSinImpedimentos: true,
      origenLicitoDeclarado: true,
      fullDescriptionUrl: "https://example.com/doc.pdf",
      fotos: Array.from({ length: MIN_PRODUCT_IMAGES }, () => baseImage.base64),
    });
    expect(parsed.success).toBe(true);
  });
});

describe("Item submission API service", () => {
  it("createSolicitud returns PENDING_REVIEW shape", async () => {
    vi.spyOn(submissionsService, "createSubmission").mockResolvedValue({
      id: 100,
      catalogDescription: "Rolex",
      fullDescriptionUrl: "https://example.com/doc.pdf",
      status: "pending_review",
      statusLabel: "Pendiente de revisión",
      available: "no",
      submittedAt: "2026-06-01",
      imageCount: 6,
      isScheduled: false,
      reviewerEmployeeId: 1,
      ownerId: 7,
      photos: [],
      isSold: false,
      catalogItemId: null,
      auctionId: null,
    });

    const result = await createSolicitud(authCliente, {
      catalogDescription: "Rolex",
      fullDescriptionUrl: "https://example.com/doc.pdf",
      images: Array.from({ length: 6 }, () => baseImage),
      declarations: {
        legitimateOwner: true,
        noLegalRestrictions: true,
        acceptsDocumentationRequest: true,
        acceptsReturnCostsIfRejected: true,
      },
    });

    expect(result.submissionId).toBe(100);
    expect(result.status).toBe("PENDING_REVIEW");
    expect(result.photoCount).toBe(6);
  });

  it("listMySolicitudes returns only owner rows", async () => {
    vi.spyOn(dueniosRepository, "findDuenioIdByPersona").mockResolvedValue(7);
    vi.spyOn(submissionsRepository, "listSubmissionsByDuenio").mockResolvedValue([sampleRow]);

    const items = await listMySolicitudesApi(authCliente);
    expect(items).toHaveLength(1);
    expect(items[0]?.status).toBe("PENDING_REVIEW");
  });

  it("getMySolicitud throws when not owner", async () => {
    vi.spyOn(submissionsService, "getMySubmission").mockRejectedValue(
      new NotFoundError("Envío no encontrado.")
    );
    await expect(getMySolicitudApi(authCliente, 999)).rejects.toThrow(NotFoundError);
  });

  it("listAdminSolicitudes returns pending items", async () => {
    vi.spyOn(submissionsRepository, "listAdminSubmissions").mockResolvedValue([sampleRow]);
    const items = await listAdminSolicitudesApi({ status: "pending" });
    expect(items[0]?.submissionId).toBe(100);
  });

  it("acceptSolicitud requires 6 photos", async () => {
    vi.spyOn(submissionsRepository, "findSubmissionById").mockResolvedValue(sampleRow);
    vi.spyOn(submissionsRepository, "countPhotosByProduct").mockResolvedValue(3);

    await expect(
      acceptSolicitudApi(2, 100, { basePrice: 500, commissionPercent: 10 })
    ).rejects.toMatchObject({ code: "INSUFFICIENT_PHOTOS" });
  });

  it("acceptSolicitud approves when valid", async () => {
    vi.spyOn(submissionsRepository, "findSubmissionById").mockResolvedValue(sampleRow);
    vi.spyOn(submissionsRepository, "countPhotosByProduct").mockResolvedValue(6);
    vi.spyOn(submissionsRepository, "applyAdminDecision").mockResolvedValue({
      ...sampleRow,
      disponible: "si",
    });

    const result = await acceptSolicitudApi(2, 100, {
      basePrice: 500,
      commissionPercent: 10,
    });
    expect(result.status).toBe("ACCEPTED");
    expect(result.basePrice).toBe(500);
  });

  it("rejectSolicitud returns REJECTION_NOT_SUPPORTED_BY_SCHEMA", async () => {
    const body = adminRejectSubmissionBodySchema.parse({
      reason: "No cumple requisitos",
      returnChargeAmount: 50,
    });
    await expect(rejectSolicitudApi(2, 100, body)).rejects.toMatchObject({
      code: "REJECTION_NOT_SUPPORTED_BY_SCHEMA",
    });
  });

  it("assignSolicitud returns ASSIGNED_TO_AUCTION", async () => {
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
      auctionId: 1,
    });
    vi.spyOn(submissionsRepository, "findSubmissionById").mockResolvedValue({
      ...sampleRow,
      disponible: "si",
      isScheduled: true,
      catalogItemId: 20,
      auctionId: 1,
      catalogId: 2,
      precioBaseAsignado: 500,
    });

    const result = await assignSolicitudApi(2, 100, {
      catalogId: 2,
      precioBase: 500,
      comision: 50,
    });
    expect(result.status).toBe("ASSIGNED_TO_AUCTION");
    expect(result.catalogItemId).toBe(20);
  });

  it("acceptTerms returns TERMS_ACCEPTANCE_NOT_SUPPORTED_BY_SCHEMA", async () => {
    await expect(acceptTermsApi()).rejects.toMatchObject({
      code: "TERMS_ACCEPTANCE_NOT_SUPPORTED_BY_SCHEMA",
    });
  });
});

describe("toApiSubmissionStatus", () => {
  it("maps pending_review to PENDING_REVIEW", () => {
    expect(toApiSubmissionStatus("pending_review")).toBe("PENDING_REVIEW");
  });
});
