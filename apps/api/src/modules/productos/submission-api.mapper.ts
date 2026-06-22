import { toApiSubmissionStatus } from "./submission-api-status";
import type { ProductSubmissionRow } from "./productos-submissions.repository";
import { toDerivedStatus } from "./productos-submissions.repository";

export type ApiSubmissionListItem = {
  submissionId: number;
  productId: number;
  nombre: string | null;
  descripcion: string | null;
  status: ReturnType<typeof toApiSubmissionStatus>;
  photoCount: number;
  rejectionReason: string | null;
  auctionId: number | null;
  basePrice: number | null;
  commission: number | null;
  createdAt: string | null;
  depositLocation: string | null;
  insurancePolicyNumber: string | null;
  insuranceCompany: string | null;
  artistOrDesigner: string | null;
  originDate: string | null;
  history: string | null;
  components: string | null;
  declarationsStored: boolean;
  schemaLimitations: string[];
};

export type ApiSubmissionDetail = ApiSubmissionListItem & {
  fullDescriptionUrl: string;
  ownerUserId: number;
  photos: { id: number; url: string }[];
  catalogItemId: number | null;
  auctionDate: string | null;
  auctionTime: string | null;
  auctionLocation: string | null;
  commissionPercent: number | null;
  declarationsStored: boolean;
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

function baseLimitations(): string[] {
  return [
    "DERIVED_SUBMISSION_STATUS",
    "NO_REJECTION_REASON_SUPPORT",
    "NO_EXPLICIT_INSPECTION_STATUS",
    "NO_RETURN_CHARGE_SUPPORT",
  ];
}

export function mapRowToApiListItem(row: ProductSubmissionRow): ApiSubmissionListItem {
  const derived = toDerivedStatus(row);
  return {
    submissionId: row.identificador,
    productId: row.identificador,
    nombre: row.descripcionCatalogo,
    descripcion: row.descripcionCatalogo,
    status: toApiSubmissionStatus(derived),
    photoCount: row.imageCount,
    rejectionReason: null,
    auctionId: row.auctionId,
    basePrice: row.precioBaseAsignado ?? null,
    commission: row.comisionAsignada ?? null,
    createdAt: formatDate(row.fecha),
    depositLocation: row.depositoUbicacion ?? null,
    insurancePolicyNumber: row.seguro ?? null,
    insuranceCompany: row.seguroCompania ?? null,
    artistOrDesigner: row.artistaODisenador ?? null,
    originDate: row.fechaOrigen ?? null,
    history: row.historia ?? null,
    components: row.componentes ?? null,
    declarationsStored: Boolean(row.declaracionesJson?.trim()),
    schemaLimitations: baseLimitations(),
  };
}

export function mapRowToApiDetail(
  row: ProductSubmissionRow,
  photoIds: number[]
): ApiSubmissionDetail {
  const base = mapRowToApiListItem(row);
  const commissionPercent =
    base.basePrice != null &&
    base.commission != null &&
    base.basePrice > 0
      ? Math.round((base.commission / base.basePrice) * 10000) / 100
      : null;

  return {
    ...base,
    fullDescriptionUrl: row.descripcionCompleta,
    ownerUserId: row.duenio,
    photos: photoIds.map((id) => ({
      id,
      url: `/api/users/me/item-submissions/${row.identificador}/photos/${id}`,
    })),
    catalogItemId: row.catalogItemId,
    auctionDate: row.auctionFecha ?? null,
    auctionTime: row.auctionHora ?? null,
    auctionLocation: row.auctionUbicacion ?? null,
    commissionPercent,
    declarationsStored: Boolean(row.declaracionesJson?.trim()),
    schemaLimitations: [
      ...base.schemaLimitations,
      "PARTIAL_LEGAL_ORIGIN_SUPPORT",
      "NO_OWNER_TERMS_ACCEPTANCE_SUPPORT",
    ],
  };
}
