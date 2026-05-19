import { derivedStatusLabel } from "./producto-status";
import type { ProductSubmissionRow } from "./productos-submissions.repository";
import { toDerivedStatus } from "./productos-submissions.repository";

export type ItemSubmissionListItem = {
  id: number;
  catalogDescription: string | null;
  fullDescriptionUrl: string;
  status: ReturnType<typeof toDerivedStatus>;
  statusLabel: string;
  available: string | null;
  submittedAt: string | null;
  imageCount: number;
  isScheduled: boolean;
  limitations?: {
    rejectionNotPersisted: boolean;
    declarationsNotStored: boolean;
  };
};

export type ItemSubmissionDetail = ItemSubmissionListItem & {
  reviewerEmployeeId: number;
  ownerId: number;
  photos: { id: number }[];
  isSold: boolean;
  catalogItemId: number | null;
  auctionId: number | null;
};

function formatDate(value: Date | string | null): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function mapToListItem(row: ProductSubmissionRow): ItemSubmissionListItem {
  const status = toDerivedStatus(row);
  return {
    id: row.identificador,
    catalogDescription: row.descripcionCatalogo,
    fullDescriptionUrl: row.descripcionCompleta,
    status,
    statusLabel: derivedStatusLabel(status),
    available: row.disponible,
    submittedAt: formatDate(row.fecha),
    imageCount: row.imageCount,
    isScheduled: row.isScheduled,
    limitations: {
      rejectionNotPersisted: true,
      declarationsNotStored: true,
    },
  };
}

export function mapToDetail(row: ProductSubmissionRow, photoIds: number[]): ItemSubmissionDetail {
  return {
    ...mapToListItem(row),
    reviewerEmployeeId: row.revisor,
    ownerId: row.duenio,
    photos: photoIds.map((id) => ({ id })),
    isSold: row.isSold,
    catalogItemId: row.catalogItemId,
    auctionId: row.auctionId,
  };
}
