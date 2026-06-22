import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/httpErrors";
import type { AuthUserContext } from "../../shared/types/auth";
import {
  mapRowToApiDetail,
  mapRowToApiListItem,
  type ApiSubmissionDetail,
  type ApiSubmissionListItem,
} from "./submission-api.mapper";
import { toApiSubmissionStatus } from "./submission-api-status";
import type {
  AdminAcceptSubmissionBody,
  AdminRejectSubmissionBody,
  AssignSolicitudBody,
} from "./productos-submissions.schema";
import * as dueniosRepository from "../duenios/duenios.repository";
import { MIN_PRODUCT_IMAGES } from "../../shared/validation/productImages";
import * as submissionsRepository from "./productos-submissions.repository";
import { toDerivedStatus } from "./productos-submissions.repository";
import * as submissionsService from "./productos-submissions.service";
import type { CreateProductSubmissionBody } from "./productos-submissions.schema";
import type { ListAdminSubmissionsQuery } from "./productos-submissions.repository";

export type CreateSolicitudResponse = {
  submissionId: number;
  productId: number;
  status: ReturnType<typeof toApiSubmissionStatus>;
  photoCount: number;
  ownerUserId: number;
  createdAt: string | null;
  schemaLimitations: string[];
};

function formatDate(value: Date | string | null): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

async function mapDetail(row: import("./productos-submissions.repository").ProductSubmissionRow) {
  const photos = await submissionsRepository.listPhotoIdsByProduct(row.identificador);
  return mapRowToApiDetail(
    row,
    photos.map((p) => p.identificador)
  );
}

export async function createSolicitud(
  authUser: AuthUserContext,
  body: CreateProductSubmissionBody
): Promise<CreateSolicitudResponse> {
  if (authUser.role === "empleado") {
    throw new ForbiddenError(
      "Los empleados no pueden crear solicitudes de cliente.",
      "CLIENT_AUTH_REQUIRED"
    );
  }
  const detail = await submissionsService.createSubmission(authUser, body);
  return {
    submissionId: detail.id,
    productId: detail.id,
    status: toApiSubmissionStatus(detail.status),
    photoCount: detail.imageCount,
    ownerUserId: detail.ownerId,
    createdAt: detail.submittedAt,
    schemaLimitations: [
      "DERIVED_SUBMISSION_STATUS",
      "PARTIAL_LEGAL_ORIGIN_SUPPORT",
    ],
  };
}

async function resolveDuenioId(authUser: AuthUserContext): Promise<number | null> {
  const n = Number.parseInt(authUser.id, 10);
  if (!Number.isSafeInteger(n) || n <= 0) {
    return null;
  }
  return dueniosRepository.findDuenioIdByPersona(n);
}

export async function listMySolicitudesApi(
  authUser: AuthUserContext
): Promise<ApiSubmissionListItem[]> {
  const duenioId = await resolveDuenioId(authUser);
  if (duenioId === null) {
    return [];
  }
  const rows = await submissionsRepository.listSubmissionsByDuenio(duenioId);
  return rows.map(mapRowToApiListItem);
}

export async function getMySolicitudApi(
  authUser: AuthUserContext,
  productId: number
): Promise<ApiSubmissionDetail> {
  await submissionsService.getMySubmission(authUser, productId);
  const row = await submissionsRepository.findSubmissionById(productId);
  if (!row) {
    throw new NotFoundError("Solicitud no encontrada.", "SUBMISSION_NOT_FOUND");
  }
  return mapDetail(row);
}

export async function listAdminSolicitudesApi(
  query: ListAdminSubmissionsQuery
): Promise<ApiSubmissionListItem[]> {
  const rows = await submissionsRepository.listAdminSubmissions(query);
  return rows.map(mapRowToApiListItem);
}

export async function getAdminSolicitudApi(productId: number): Promise<ApiSubmissionDetail> {
  const row = await submissionsRepository.findSubmissionById(productId);
  if (!row) {
    throw new NotFoundError("Solicitud no encontrada.", "SUBMISSION_NOT_FOUND");
  }
  return mapDetail(row);
}

export async function acceptSolicitudApi(
  employeeId: number,
  productId: number,
  body: AdminAcceptSubmissionBody
) {
  const row = await submissionsRepository.findSubmissionById(productId);
  if (!row) {
    throw new NotFoundError("Solicitud no encontrada.", "SUBMISSION_NOT_FOUND");
  }
  if (row.isScheduled) {
    throw new ConflictError(
      "El producto ya está asignado a una subasta.",
      "ITEM_ALREADY_ASSIGNED"
    );
  }
  const photoCount = await submissionsRepository.countPhotosByProduct(productId);
  if (photoCount < MIN_PRODUCT_IMAGES) {
    throw new BadRequestError(
      `Se requieren al menos ${MIN_PRODUCT_IMAGES} fotos para aceptar.`,
      "INSUFFICIENT_PHOTOS"
    );
  }

  await submissionsRepository.applyAdminDecision({
    productId,
    employeeId,
    approve: true,
  });

  const commission =
    body.commissionPercent != null
      ? Math.round((body.basePrice * body.commissionPercent) / 10000) / 100
      : null;

  return {
    productId,
    status: "ACCEPTED" as const,
    basePrice: body.basePrice,
    commissionPercent: body.commissionPercent ?? null,
    commission,
    notes: body.notes ?? null,
    schemaLimitations: [
      "DERIVED_SUBMISSION_STATUS",
      "NO_OWNER_TERMS_ACCEPTANCE_SUPPORT",
      "NO_COMMISSION_SCHEMA_SUPPORT",
    ],
  };
}

export async function rejectSolicitudApi(
  employeeId: number,
  productId: number,
  body: AdminRejectSubmissionBody
): Promise<ApiSubmissionDetail> {
  const row = await submissionsRepository.findSubmissionById(productId);
  if (!row) {
    throw new NotFoundError("Solicitud no encontrada.", "SUBMISSION_NOT_FOUND");
  }

  const updated = await submissionsRepository.applyAdminRejection({
    productId,
    employeeId,
    reason: body.reason,
    notes: body.notes ?? null,
  });

  const photos = await submissionsRepository.listPhotoIdsByProduct(productId);
  return mapRowToApiDetail(
    updated,
    photos.map((p) => p.identificador)
  );
}

export async function assignSolicitudApi(
  employeeId: number,
  productId: number,
  body: AssignSolicitudBody
) {
  const existing = await submissionsRepository.findSubmissionById(productId);
  if (!existing) {
    throw new NotFoundError("Solicitud no encontrada.", "SUBMISSION_NOT_FOUND");
  }
  if (existing.isScheduled) {
    throw new ConflictError(
      "El producto ya está asignado a un catálogo.",
      "ITEM_ALREADY_ASSIGNED"
    );
  }

  await submissionsService.assignToAuction(employeeId, productId, body);
  const row = await submissionsRepository.findSubmissionById(productId);
  if (!row) {
    throw new NotFoundError("Solicitud no encontrada.", "SUBMISSION_NOT_FOUND");
  }
  return {
    productId: row.identificador,
    auctionId: row.auctionId,
    catalogId: row.catalogId,
    catalogItemId: row.catalogItemId,
    status: "ASSIGNED_TO_AUCTION" as const,
    basePrice: row.precioBaseAsignado,
    schemaLimitations: ["NO_COMMISSION_SCHEMA_SUPPORT"],
  };
}

export async function acceptTermsApi(): Promise<never> {
  throw new ConflictError(
    "El esquema no incluye campos para aceptación de condiciones por el dueño.",
    "TERMS_ACCEPTANCE_NOT_SUPPORTED_BY_SCHEMA"
  );
}

export async function rejectTermsApi(): Promise<never> {
  throw new ConflictError(
    "El esquema no incluye campos para rechazo de condiciones por el dueño.",
    "TERMS_ACCEPTANCE_NOT_SUPPORTED_BY_SCHEMA"
  );
}

export function mapAdminListItemFromRow(
  row: import("./productos-submissions.repository").ProductSubmissionRow
) {
  const derived = toDerivedStatus(row);
  return {
    productId: row.identificador,
    submissionId: row.identificador,
    title: row.descripcionCatalogo,
    ownerId: row.duenio,
    photoCount: row.imageCount,
    estimatedValue: null,
    basePrice: row.precioBaseAsignado,
    status: toApiSubmissionStatus(derived),
    createdAt: formatDate(row.fecha),
  };
}
