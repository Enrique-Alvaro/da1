import { getCompanyClientId } from "../../config/env";
import type { AuthUserContext } from "../../shared/types/auth";
import { ConflictError, ForbiddenError, UnauthorizedError } from "../../shared/errors/httpErrors";
import { registerAsistenteForAuction } from "../pujos/pujos.service";
import * as usersRepository from "../users/users.repository";
import { evaluateAuctionAccess, mapSubastaStatus } from "./subastas-access.service";
import { computeBidLimits } from "./subastas-bid-limits";
import * as itemsRepository from "./subastas-items.repository";
import { mapCatalogItem, mapSubastaDetail, mapSubastaSummary, resolveItemStatus } from "./subastas.mapper";
import * as closingRepository from "./subastas-closing.repository";
import * as liveRepo from "./subastas-live.repository";
import * as subastasRepository from "./subastas.repository";
import type { ListSubastasFilters } from "./subastas.repository";
import * as liveSessionStore from "./live-session.store";

const FEATURED_DEFAULT_LIMIT = 6;

export type ListSubastasQuery = {
  featured?: boolean;
  status?: "scheduled" | "live" | "closed";
  category?: string;
};

function canShowBasePrice(authUser: AuthUserContext | undefined): boolean {
  return Boolean(authUser && authUser.tokenType === "access" && authUser.role !== "empleado");
}

/**
 * Ítem actual determinista (`NO_CURRENT_ITEM_FIELD`):
 * primer ítem del catálogo de la subasta con subastado = 'no' y sin registroDeSubasta, por identificador ASC.
 */
export function pickCurrentItemId(
  items: itemsRepository.CatalogItemRow[],
  auctionStatus: "scheduled" | "live" | "closed"
): number | null {
  if (auctionStatus !== "live") {
    return null;
  }
  const candidate = items.find((it) => {
    const sub = (it.subastado ?? "no").trim().toLowerCase();
    return sub !== "si" && it.isSoldInRegistro === 0;
  });
  return candidate?.identificador ?? null;
}

export async function listAuctions(
  query: ListSubastasQuery,
  authUser?: AuthUserContext
) {
  const filters: ListSubastasFilters = {
    featured: query.featured,
    status: query.status,
    category: query.category,
    limit: query.featured ? FEATURED_DEFAULT_LIMIT : undefined,
  };
  const rows = await subastasRepository.listSubastas(filters);
  const summaries = await Promise.all(
    rows.map(async (row) => {
      const [access, currentHighestBid] = await Promise.all([
        evaluateAuctionAccess({ subasta: row, authUser }),
        liveRepo.getMaxBidForAuction(row.identificador),
      ]);
      return mapSubastaSummary(row, { access, currentHighestBid });
    })
  );
  return {
    items: summaries,
    meta: query.featured
      ? { featured: true, derived: true, limit: FEATURED_DEFAULT_LIMIT }
      : undefined,
  };
}

export async function getAuctionDetail(auctionId: number, authUser?: AuthUserContext) {
  const row = await subastasRepository.requireSubastaDetailById(auctionId);
  const currentHighestBid = await liveRepo.getMaxBidForAuction(auctionId);
  return mapSubastaDetail(row, authUser, { currentHighestBid });
}

export async function listAuctionItems(auctionId: number, authUser?: AuthUserContext) {
  const subasta = await subastasRepository.requireSubastaById(auctionId);
  const auctionStatus = mapSubastaStatus(subasta);
  const items = await itemsRepository.listCatalogItemsBySubasta(auctionId);
  const bidSummaries = await itemsRepository.listBidSummariesForSubasta(auctionId);
  const bidMap = new Map(bidSummaries.map((b) => [b.itemId, b]));
  const showBasePrice = canShowBasePrice(authUser);
  const currentItemId = pickCurrentItemId(items, auctionStatus);

  const mapped = await Promise.all(
    items.map(async (row) => {
      const summary = bidMap.get(row.identificador);
      const photoIds = await itemsRepository.listPhotoIdsByProduct(row.producto);
      return mapCatalogItem(row, {
        showBasePrice,
        currentHighestBid: summary?.maxBid ?? null,
        itemStatus: resolveItemStatus(row, currentItemId, auctionStatus),
        auctionId,
        currency: subasta.moneda ?? "ARS",
        auctionCategory: subasta.categoria ?? "comun",
        photoIds,
      });
    })
  );

  return { items: mapped };
}

export async function getCatalogItemDetail(itemId: number, authUser?: AuthUserContext) {
  const row = await itemsRepository.requireCatalogItemById(itemId);
  if (row.subastaId == null) {
    throw new ConflictError("El ítem no está asociado a una subasta.", "ITEM_NOT_IN_AUCTION");
  }
  const subasta = await subastasRepository.requireSubastaById(row.subastaId);
  const auctionStatus = mapSubastaStatus(subasta);
  const items = await itemsRepository.listCatalogItemsBySubasta(row.subastaId);
  const currentItemId = pickCurrentItemId(items, auctionStatus);
  const winning = await liveRepo.findWinningBidForItem(itemId);
  const showBasePrice = canShowBasePrice(authUser);
  const photoIds = await itemsRepository.listPhotoIdsByProduct(row.producto);
  const access = await evaluateAuctionAccess({ subasta, authUser });

  const base = mapCatalogItem(row, {
    showBasePrice,
    currentHighestBid: winning?.importe ?? null,
    itemStatus: resolveItemStatus(row, currentItemId, auctionStatus),
    auctionId: row.subastaId,
    currency: subasta.moneda ?? "ARS",
    auctionCategory: subasta.categoria ?? "comun",
    photoIds,
  });

  return {
    ...base,
    auctionStatus,
    canAccess: access.canAccess,
    canBid: access.canBid,
    canEnterLive: access.canAccess && auctionStatus === "live",
    cannotAccessReason: access.cannotAccessReason,
    cannotBidReason: access.cannotBidReason,
    highestBidderDisplay: winning
      ? { bidderNumber: winning.numeroPostor, clientId: winning.cliente }
      : null,
  };
}

async function resolveClienteId(authUser: AuthUserContext): Promise<number> {
  const personId = Number.parseInt(authUser.id, 10);
  const cliente = await usersRepository.findClienteByPersonId(personId);
  if (!cliente) {
    throw new ForbiddenError("Cliente no encontrado.", "CLIENT_NOT_FOUND");
  }
  return cliente.identificador;
}

export async function enterLiveSession(auctionId: number, authUser: AuthUserContext) {
  const subasta = await subastasRepository.requireSubastaById(auctionId);
  const access = await evaluateAuctionAccess({ subasta, authUser });
  if (!access.canAccess) {
    throw new ForbiddenError(
      "No tenés acceso a esta subasta en vivo.",
      access.cannotAccessReason ?? "CATEGORY_NOT_ALLOWED"
    );
  }
  if (mapSubastaStatus(subasta) !== "live") {
    throw new ConflictError("La subasta no está abierta.", "AUCTION_NOT_OPEN");
  }

  const clienteId = await resolveClienteId(authUser);
  const { entered, previousAuctionId } = liveSessionStore.enterSession(clienteId, auctionId);
  if (!entered && previousAuctionId !== null) {
    throw new ConflictError(
      "Ya tenés una sesión activa en otra subasta. Salí de la sesión anterior primero.",
      "LIVE_SESSION_OTHER_AUCTION"
    );
  }

  await registerAsistenteForAuction(authUser, auctionId);

  return {
    active: true,
    auctionId,
    persisted: false,
    limitation: "NO_PERSISTED_LIVE_SESSION",
  };
}

export async function leaveLiveSession(auctionId: number, authUser: AuthUserContext) {
  const clienteId = await resolveClienteId(authUser);
  const left = liveSessionStore.leaveSession(clienteId, auctionId);
  return {
    active: !left ? liveSessionStore.getActiveAuctionId(clienteId) !== null : false,
    auctionId: left ? null : liveSessionStore.getActiveAuctionId(clienteId),
    persisted: false,
    limitation: "NO_PERSISTED_LIVE_SESSION",
  };
}

export async function getLiveAuctionState(auctionId: number, authUser: AuthUserContext) {
  const subasta = await subastasRepository.requireSubastaById(auctionId);
  const access = await evaluateAuctionAccess({
    subasta,
    authUser,
    requireLiveSession: false,
  });
  if (!access.canAccess) {
    throw new ForbiddenError(
      "No tenés acceso a esta subasta en vivo.",
      access.cannotAccessReason ?? "CATEGORY_NOT_ALLOWED"
    );
  }

  const auctionStatus = mapSubastaStatus(subasta);
  const items = await itemsRepository.listCatalogItemsBySubasta(auctionId);
  const currentItemId = pickCurrentItemId(items, auctionStatus);
  const currentItem = currentItemId
    ? items.find((i) => i.identificador === currentItemId) ?? null
    : null;

  let currentBid: number | null = null;
  let highestBidderId: number | null = null;
  let highestBidderNumber: number | null = null;
  let minNextBid: number | null = null;
  let maxNextBid: number | null = null;
  let percentLimitsApply = true;

  if (currentItem) {
    const winning = await liveRepo.findWinningBidForItem(currentItem.identificador);
    const basePrice = Number(currentItem.precioBase);
    currentBid = winning?.importe ?? basePrice;
    highestBidderId = winning?.cliente ?? null;
    highestBidderNumber = winning?.numeroPostor ?? null;
    const limits = computeBidLimits(
      currentBid,
      basePrice,
      subasta.categoria ?? "comun"
    );
    minNextBid = limits.minNextBid;
    maxNextBid = limits.maxNextBid;
    percentLimitsApply = limits.percentLimitsApply;
  }

  const history = await liveRepo.listBidHistoryBySubasta(
    auctionId,
    currentItemId ?? undefined
  );
  const personId = Number.parseInt(authUser.id, 10);
  const cliente = await usersRepository.findClienteByPersonId(personId);
  const isHighestBidder =
    cliente != null && highestBidderId !== null && cliente.identificador === highestBidderId;

  const bidAccess = await evaluateAuctionAccess({
    subasta,
    authUser,
    requireLiveSession: true,
  });

  let isFinalized = false;
  let resultType: string | null = null;
  let winnerDisplayName: string | null = null;
  let finalAmount: number | null = null;
  let soldItemId: number | null = null;
  let shouldRedirectToResult = false;

  if (currentItem) {
    const registro = await closingRepository.findRegistroByProductoAndSubasta(
      currentItem.producto,
      auctionId
    );
    const sold = (currentItem.subastado ?? "no").trim().toLowerCase() === "si";
    if (registro || sold) {
      isFinalized = true;
      soldItemId = currentItem.identificador;
      shouldRedirectToResult = true;
      if (registro) {
        finalAmount = Number(registro.importe);
        const companyId = getCompanyClientId();
        resultType =
          companyId !== null && registro.cliente === companyId
            ? "COMPANY_PURCHASED"
            : "BIDDER_WON";
        winnerDisplayName =
          resultType === "COMPANY_PURCHASED" ? "Empresa" : `Postor ${highestBidderNumber ?? ""}`;
      } else {
        resultType = "NOT_FINALIZED";
      }
    }
  }

  return {
    auctionId,
    status: auctionStatus,
    currentItem: currentItem
      ? {
          id: currentItem.identificador,
          productId: currentItem.producto,
          catalogDescription: currentItem.descripcionCatalogo,
          basePrice: Number(currentItem.precioBase),
        }
      : null,
    currentBid,
    highestBidderId,
    highestBidderNumber,
    minNextBid,
    maxNextBid,
    percentLimitsApply,
    bidCount: history.length,
    lastBids: history.slice(0, 10).map((b) => ({
      id: b.identificador,
      itemId: b.item,
      amount: Number(b.importe),
      bidderNumber: b.numeroPostor,
      isWinning: b.identificador === history[0]?.identificador,
    })),
    isHighestBidder,
    liveSessionActive: bidAccess.liveSessionActive,
    serverTime: new Date().toISOString(),
    limitation: currentItemId === null ? "NO_CURRENT_ITEM_FIELD" : undefined,
    isFinalized,
    resultType,
    winnerDisplayName,
    finalAmount,
    soldItemId,
    shouldRedirectToResult,
    canBid: isFinalized ? false : bidAccess.canBid,
    cannotBidReason: isFinalized ? "AUCTION_NOT_CLOSABLE" : bidAccess.cannotBidReason,
  };
}

export async function getBidHistory(
  auctionId: number,
  authUser: AuthUserContext,
  itemId?: number
) {
  const subasta = await subastasRepository.requireSubastaById(auctionId);
  const access = await evaluateAuctionAccess({ subasta, authUser });
  if (!access.canAccess) {
    throw new ForbiddenError(
      "No tenés acceso al historial de esta subasta.",
      access.cannotAccessReason ?? "CATEGORY_NOT_ALLOWED"
    );
  }

  const rows = await liveRepo.listBidHistoryBySubasta(auctionId, itemId);
  const topAmount =
    rows.length > 0 ? Math.max(...rows.map((r) => Number(r.importe))) : null;

  return {
    totalBids: rows.length,
    order: "newest_first",
    bids: rows.map((b) => ({
      id: b.identificador,
      itemId: b.item,
      amount: Number(b.importe),
      bidderNumber: b.numeroPostor,
      bidderClientId: b.cliente,
      isWinning: topAmount !== null && Number(b.importe) === topAmount,
    })),
  };
}
