import type { AuthUserContext } from "../../shared/types/auth";
import type { CatalogItemRow } from "./subastas-items.repository";
import { evaluateAuctionAccess, mapSubastaStatus } from "./subastas-access.service";
import { computeBidLimits } from "./subastas-bid-limits";
import type { SubastaDetailRow, SubastaRow } from "./subastas.repository";

function formatDate(value: Date | string | null): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function formatTime(value: Date | string | null): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(11, 19);
  }
  return String(value);
}

export type ItemLifecycleStatus = "pending" | "live" | "sold" | "closed";

export function resolveItemStatus(
  row: CatalogItemRow,
  currentItemId: number | null,
  auctionStatus: "scheduled" | "live" | "closed"
): ItemLifecycleStatus {
  const subastado = (row.subastado ?? "no").trim().toLowerCase();
  if (subastado === "si" || row.isSoldInRegistro > 0) {
    return "sold";
  }
  if (auctionStatus === "closed") {
    return "closed";
  }
  if (currentItemId !== null && row.identificador === currentItemId && auctionStatus === "live") {
    return "live";
  }
  return "pending";
}

export function mapSubastaSummary(
  row: SubastaRow,
  extras?: {
    currentHighestBid?: number | null;
    access?: Awaited<ReturnType<typeof evaluateAuctionAccess>>;
  }
) {
  const status = mapSubastaStatus(row);
  return {
    id: row.identificador,
    date: formatDate(row.fecha),
    time: formatTime(row.hora),
    status,
    category: row.categoria,
    currency: row.moneda ?? "ARS",
    location: row.ubicacion,
    capacity: row.capacidadAsistentes,
    hasDeposit: row.tieneDeposito,
    hasOwnSecurity: row.seguridadPropia,
    currentHighestBid: extras?.currentHighestBid ?? null,
    canAccess: extras?.access?.canAccess ?? false,
    canBid: extras?.access?.canBid ?? false,
    cannotAccessReason: extras?.access?.cannotAccessReason ?? null,
    cannotBidReason: extras?.access?.cannotBidReason ?? null,
  };
}

export async function mapSubastaDetail(
  row: SubastaDetailRow,
  authUser: AuthUserContext | undefined,
  extras?: { currentHighestBid?: number | null }
) {
  const access = await evaluateAuctionAccess({ subasta: row, authUser });
  return {
    ...mapSubastaSummary(row, { currentHighestBid: extras?.currentHighestBid, access }),
    auctioneer: row.subastador
      ? {
          id: row.subastador,
          fullName: row.subastadorNombre,
          licenseNumber: row.subastadorMatricula,
          region: row.subastadorRegion,
        }
      : null,
    hasVerifiedPaymentMethod: access.hasVerifiedPaymentMethod,
    liveSessionActive: access.liveSessionActive,
  };
}

export function mapCatalogItem(
  row: CatalogItemRow,
  params: {
    showBasePrice: boolean;
    currentHighestBid: number | null;
    itemStatus: ItemLifecycleStatus;
    auctionId: number;
    currency: string;
    auctionCategory: string;
    photoIds: number[];
  }
) {
  const basePrice = Number(row.precioBase);
  const currentBest =
    params.currentHighestBid != null ? params.currentHighestBid : basePrice;
  const limits = computeBidLimits(currentBest, basePrice, params.auctionCategory);

  return {
    id: row.identificador,
    catalogId: row.catalogo,
    productId: row.producto,
    pieceNumber: row.identificador,
    title: row.descripcionCatalogo ?? row.catalogDescription ?? "Ítem",
    catalogDescription: row.descripcionCatalogo,
    fullDescriptionUrl: row.descripcionCompleta,
    basePrice: params.showBasePrice ? basePrice : null,
    commission: params.showBasePrice ? Number(row.comision) : null,
    currentHighestBid: params.currentHighestBid,
    minNextBid: params.showBasePrice ? limits.minNextBid : null,
    maxNextBid: params.showBasePrice ? limits.maxNextBid : null,
    currency: params.currency,
    auctionId: params.auctionId,
    status: params.itemStatus,
    auctioned: row.subastado,
    imageUrls: params.photoIds.map((pid) => `/api/products/${row.producto}/photos/${pid}`),
  };
}
