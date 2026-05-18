import { getDefaultReviewerEmployeeId } from "../../config/env";
import { NotFoundError, UnauthorizedError } from "../../shared/errors/httpErrors";
import { parseProductImages } from "../../shared/validation/productImages";
import type { AuthUserContext } from "../../shared/types/auth";
import type { UserPublic } from "../users/user.mapper";
import * as dueniosRepository from "../duenios/duenios.repository";
import * as usersRepository from "../users/users.repository";
import {
  mapToDetail,
  mapToListItem,
  type ItemSubmissionDetail,
  type ItemSubmissionListItem,
} from "./productos-submissions.mapper";
import type {
  AdminDecisionBody,
  AuctionAssignmentBody,
  CreateProductSubmissionBody,
} from "./productos-submissions.schema";
import * as submissionsRepository from "./productos-submissions.repository";

const SUBMISSION_LIMITATIONS = {
  rejectionNotPersisted: true,
  declarationsNotStored: true,
} as const;

const REJECT_DECISION_LIMITATIONS = {
  rejectionNotPersisted: true,
  rejectionIsIndistinguishableFromPending: true,
  rejectionReasonNotPersisted: true,
  declarationsNotStored: true,
} as const;

/**
 * JWT `sub` es `personas.identificador` (ver `buildLoginTokenPayload` en auth).
 * `clientes.identificador` y `duenios.identificador` usan la misma PK de persona.
 */
function parsePersonaId(authUser: AuthUserContext): number {
  const n = Number.parseInt(authUser.id, 10);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new UnauthorizedError("No autorizado.");
  }
  return n;
}

async function resolveDuenioForCliente(personaId: number): Promise<number> {
  const profile = await usersRepository.findProfileByPersonId(personaId);
  if (!profile) {
    throw new UnauthorizedError("No autorizado.");
  }
  return dueniosRepository.findOrCreateDuenioForPersona(personaId, profile.country_id);
}

async function requireOwnedSubmission(
  productId: number,
  duenioId: number
): Promise<import("./productos-submissions.repository").ProductSubmissionRow> {
  const row = await submissionsRepository.findSubmissionById(productId);
  if (!row || row.duenio !== duenioId) {
    throw new NotFoundError("Envío no encontrado.");
  }
  return row;
}

async function mapRowWithPhotos(
  row: import("./productos-submissions.repository").ProductSubmissionRow
): Promise<ItemSubmissionDetail> {
  const photos = await submissionsRepository.listPhotoIdsByProduct(row.identificador);
  return mapToDetail(row, photos.map((p) => p.identificador));
}

export async function createSubmission(
  authUser: AuthUserContext,
  body: CreateProductSubmissionBody
): Promise<ItemSubmissionDetail> {
  const personaId = parsePersonaId(authUser);
  const duenioId = await resolveDuenioForCliente(personaId);
  const imageBuffers = parseProductImages(body.images);
  const revisorId = getDefaultReviewerEmployeeId();
  await submissionsRepository.assertEmployeeExists(revisorId);

  const productId = await submissionsRepository.insertProductWithPhotos({
    duenioId,
    revisorId,
    catalogDescription: body.catalogDescription,
    fullDescriptionUrl: body.fullDescriptionUrl,
    imageBuffers,
  });

  const row = await submissionsRepository.findSubmissionById(productId);
  if (!row) {
    throw new NotFoundError("Producto no encontrado.");
  }
  return mapRowWithPhotos(row);
}

export async function listMySubmissions(authUser: AuthUserContext): Promise<{ items: ItemSubmissionListItem[] }> {
  const personaId = parsePersonaId(authUser);
  const duenioId = await dueniosRepository.findDuenioIdByPersona(personaId);
  if (duenioId === null) {
    return { items: [] };
  }

  const rows = await submissionsRepository.listSubmissionsByDuenio(duenioId);
  return { items: rows.map(mapToListItem) };
}

export async function getMySubmission(
  authUser: AuthUserContext,
  productId: number
): Promise<ItemSubmissionDetail> {
  const personaId = parsePersonaId(authUser);
  const duenioId = await dueniosRepository.findDuenioIdByPersona(personaId);
  if (duenioId === null) {
    throw new NotFoundError("Envío no encontrado.");
  }
  const row = await requireOwnedSubmission(productId, duenioId);
  return mapRowWithPhotos(row);
}

export async function getMySubmissionPhoto(
  authUser: AuthUserContext,
  productId: number,
  photoId: number
): Promise<Buffer> {
  const personaId = parsePersonaId(authUser);
  const duenioId = await dueniosRepository.findDuenioIdByPersona(personaId);
  if (duenioId === null) {
    throw new NotFoundError("Foto no encontrada.");
  }
  await requireOwnedSubmission(productId, duenioId);
  const buffer = await submissionsRepository.findOwnedPhotoBuffer({
    productId,
    photoId,
    duenioId,
  });
  if (!buffer) {
    throw new NotFoundError("Foto no encontrada.");
  }
  return buffer;
}

export async function cancelMySubmission(authUser: AuthUserContext, productId: number): Promise<void> {
  const personaId = parsePersonaId(authUser);
  const duenioId = await dueniosRepository.findDuenioIdByPersona(personaId);
  if (duenioId === null) {
    throw new NotFoundError("Envío no encontrado.");
  }
  await requireOwnedSubmission(productId, duenioId);
  await submissionsRepository.deleteProductSubmission(productId);
}

export async function listPendingForReview(): Promise<{ items: ItemSubmissionListItem[] }> {
  const rows = await submissionsRepository.listPendingReviewProducts();
  return { items: rows.map(mapToListItem) };
}

export type AdminDecisionResult = {
  detail: ItemSubmissionDetail;
  decisionApplied: "approved" | "not_approved";
  limitations?: typeof REJECT_DECISION_LIMITATIONS;
};

export async function applyDecision(
  employeeId: number,
  productId: number,
  body: AdminDecisionBody
): Promise<AdminDecisionResult> {
  const updated = await submissionsRepository.applyAdminDecision({
    productId,
    employeeId,
    approve: body.decision === "approve",
  });
  const detail = await mapRowWithPhotos(updated);
  if (body.decision === "approve") {
    return { detail, decisionApplied: "approved" };
  }
  return {
    detail,
    decisionApplied: "not_approved",
    limitations: { ...REJECT_DECISION_LIMITATIONS },
  };
}

export async function assignToAuction(
  employeeId: number,
  productId: number,
  body: AuctionAssignmentBody
): Promise<ItemSubmissionDetail> {
  const updated = await submissionsRepository.assignProductToAuction({
    productId,
    employeeId,
    catalogId: body.catalogId,
    subastaId: body.subastaId,
    catalogDescription: body.catalogDescription,
    precioBase: body.precioBase,
    comision: body.comision,
  });
  return mapRowWithPhotos(updated);
}

export function assertEmployeeId(authUser: AuthUserContext): number {
  const id = authUser.employeeId;
  if (id === undefined || !Number.isSafeInteger(id) || id <= 0) {
    throw new UnauthorizedError("No autorizado.");
  }
  return id;
}

/** @internal for tests */
export async function resolveDuenioForUser(user: UserPublic): Promise<number> {
  return dueniosRepository.findOrCreateDuenioForPersona(user.id, user.country.id);
}

/** @internal for tests */
export { SUBMISSION_LIMITATIONS, REJECT_DECISION_LIMITATIONS };
