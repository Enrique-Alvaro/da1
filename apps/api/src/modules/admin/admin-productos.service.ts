import * as submissionsRepository from "../productos/productos-submissions.repository";
import { mapRowToApiDetail } from "../productos/submission-api.mapper";
import { notifySubmissionCustodyUpdated } from "../notifications/notifications.events";
import { NotFoundError } from "../../shared/errors/httpErrors";
import type { ProductSubmissionRow } from "../productos/productos-submissions.repository";
import type { UpdateDepositoBody, UpdateSeguroBody } from "./admin-productos.schema";

function trimOrEmpty(value: string | null | undefined): string {
  return (value ?? "").trim();
}

async function emitCustodyNotificationIfNeeded(
  row: ProductSubmissionRow,
  kind: "deposit" | "insurance",
  details: {
    depositLocation?: string | null;
    insurancePolicy?: string | null;
    insuranceCompany?: string | null;
  }
): Promise<void> {
  await notifySubmissionCustodyUpdated({
    ownerDuenioId: row.duenio,
    submissionId: row.identificador,
    itemTitle: row.descripcionCatalogo ?? `Artículo #${row.identificador}`,
    auctionId: row.auctionId,
    catalogItemId: row.catalogItemId,
    kind,
    depositLocation: details.depositLocation,
    insurancePolicy: details.insurancePolicy,
    insuranceCompany: details.insuranceCompany,
  });
}

export async function updateProductDeposito(productId: number, body: UpdateDepositoBody) {
  const before = await submissionsRepository.findSubmissionById(productId);
  if (!before) {
    throw new NotFoundError("Producto no encontrado.", "PRODUCT_NOT_FOUND");
  }

  const nextLocation = body.depositoUbicacion.trim();
  const previousLocation = trimOrEmpty(before.depositoUbicacion);
  const changed = nextLocation !== previousLocation;

  const updated = await submissionsRepository.updateProductDepositoUbicacion(
    productId,
    nextLocation
  );
  const photos = await submissionsRepository.listPhotoIdsByProduct(productId);

  if (changed) {
    await emitCustodyNotificationIfNeeded(updated, "deposit", {
      depositLocation: nextLocation,
    });
  }

  return mapRowToApiDetail(
    updated,
    photos.map((p) => p.identificador)
  );
}

export async function updateProductSeguro(productId: number, body: UpdateSeguroBody) {
  const before = await submissionsRepository.findSubmissionById(productId);
  if (!before) {
    throw new NotFoundError("Producto no encontrado.", "PRODUCT_NOT_FOUND");
  }

  const nextPolicy = body.seguro.trim();
  const nextCompany = body.compania.trim();
  const policyChanged =
    nextPolicy !== trimOrEmpty(before.seguro) ||
    nextCompany !== trimOrEmpty(before.seguroCompania);

  const updated = await submissionsRepository.upsertProductInsurance({
    productId,
    nroPoliza: nextPolicy,
    compania: nextCompany,
    importe: body.importe,
    polizaCombinada: body.polizaCombinada,
  });
  const photos = await submissionsRepository.listPhotoIdsByProduct(productId);
  const detail = mapRowToApiDetail(
    updated,
    photos.map((p) => p.identificador)
  );

  if (policyChanged) {
    await emitCustodyNotificationIfNeeded(updated, "insurance", {
      insurancePolicy: nextPolicy,
      insuranceCompany: nextCompany,
    });
  }

  return {
    ...detail,
    schemaLimitations: [
      ...detail.schemaLimitations,
      ...(body.descripcion || body.vigenciaDesde || body.vigenciaHasta
        ? ["INSURANCE_METADATA_NOT_PERSISTED"]
        : []),
    ],
  };
}
