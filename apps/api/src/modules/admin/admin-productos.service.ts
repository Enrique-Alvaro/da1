import * as submissionsRepository from "../productos/productos-submissions.repository";
import { mapRowToApiDetail } from "../productos/submission-api.mapper";
import type { UpdateDepositoBody, UpdateSeguroBody } from "./admin-productos.schema";

export async function updateProductDeposito(productId: number, body: UpdateDepositoBody) {
  const updated = await submissionsRepository.updateProductDepositoUbicacion(
    productId,
    body.depositoUbicacion
  );
  const photos = await submissionsRepository.listPhotoIdsByProduct(productId);
  return mapRowToApiDetail(
    updated,
    photos.map((p) => p.identificador)
  );
}

export async function updateProductSeguro(productId: number, body: UpdateSeguroBody) {
  const updated = await submissionsRepository.upsertProductInsurance({
    productId,
    nroPoliza: body.seguro,
    compania: body.compania,
    importe: body.importe,
    polizaCombinada: body.polizaCombinada,
  });
  const photos = await submissionsRepository.listPhotoIdsByProduct(productId);
  const detail = mapRowToApiDetail(
    updated,
    photos.map((p) => p.identificador)
  );
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
