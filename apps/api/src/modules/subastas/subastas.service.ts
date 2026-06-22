import { getCompanyClientId } from "../../config/env";
import type { AuthUserContext } from "../../shared/types/auth";
import { ConflictError, ForbiddenError, UnauthorizedError } from "../../shared/errors/httpErrors";
import { registerAsistenteForAuction } from "../pujos/pujos.service";
import * as usersRepository from "../users/users.repository";
import { evaluateAuctionAccess, employeeOperationalAccessSnapshot, mapSubastaStatus } from "./subastas-access.service";
import { computeBidLimits } from "./subastas-bid-limits";
import { getEffectiveAuctionStatus } from "./subastas-schedule";
import * as itemsRepository from "./subastas-items.repository";
import { mapCatalogItem, mapSubastaDetail, mapSubastaSummary, resolveItemStatus } from "./subastas.mapper";
import * as closingRepository from "./subastas-closing.repository";
import * as liveRepo from "./subastas-live.repository";
import * as subastasRepository from "./subastas.repository";
import type { ListSubastasFilters } from "./subastas.repository";
import * as liveSessionStore from "./live-session.store";
import { toPublicAccessDenialCode } from "./access-denial-codes";
import { pickCurrentItemId } from "./subastas-current-item";

export { pickCurrentItemId } from "./subastas-current-item";

const FEATURED_DEFAULT_LIMIT = 6;

export type ListSubastasQuery = {
  featured?: boolean;
  status?: "scheduled" | "live" | "closed";
  category?: string;
};

function canShowBasePrice(authUser: AuthUserContext | undefined): boolean {
  return Boolean(authUser && authUser.tokenType === "access" && authUser.role !== "empleado");
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
  const effectiveRows = query.status
    ? rows.filter((row) => getEffectiveAuctionStatus(row) === query.status)
    : rows;
  const summaries = await Promise.all(
    effectiveRows.map(async (row) => {
      const [access, currentHighestBid, itemCount] = await Promise.all([
        evaluateAuctionAccess({ subasta: row, authUser }),
        liveRepo.getMaxBidForAuction(row.identificador),
        itemsRepository.countCatalogItemsBySubasta(row.identificador),
      ]);
      return mapSubastaSummary(row, { access, currentHighestBid, itemCount });
    })
  );
  return {
    items: summaries,
    meta: query.featured
      ? {
          featured: true,
          derived: true,
          limitation: "DERIVED_FEATURED_AUCTIONS",
          limit: FEATURED_DEFAULT_LIMIT,
        }
      : undefined,
  };
}

export async function getAuctionDetail(auctionId: number, authUser?: AuthUserContext) {
  const row = await subastasRepository.requireSubastaDetailById(auctionId);
  const [currentHighestBid, itemCount] = await Promise.all([
    liveRepo.getMaxBidForAuction(auctionId),
    itemsRepository.countCatalogItemsBySubasta(auctionId),
  ]);
  return mapSubastaDetail(row, authUser, { currentHighestBid, itemCount });
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
  const personId = authUser?.id ? Number.parseInt(authUser.id, 10) : null;
  const cliente =
    personId != null && Number.isFinite(personId)
      ? await usersRepository.findClienteByPersonId(personId)
      : null;
  const isOwner = cliente != null && row.duenio != null && cliente.identificador === row.duenio;
  let cannotBidReason = toPublicAccessDenialCode(access.cannotBidReason);
  let canBid = access.canBid;
  if (isOwner) {
    canBid = false;
    cannotBidReason = "OWNER_CANNOT_BID";
  }

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
    canBid,
    isOwner,
    canEnterLive: access.canAccess && auctionStatus === "live" && !isOwner,
    cannotAccessReason: toPublicAccessDenialCode(access.cannotAccessReason),
    cannotBidReason,
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

export async function getLiveAuctionState(
  auctionId: number,
  authUser: AuthUserContext,
  watchedItemId?: number
) {
  const subasta = await subastasRepository.requireSubastaById(auctionId);
  const isEmployeeViewer = authUser.role === "empleado";
  const access = isEmployeeViewer
    ? employeeOperationalAccessSnapshot()
    : await evaluateAuctionAccess({
        subasta,
        authUser,
        requireLiveSession: false,
      });
  if (!isEmployeeViewer && !access.canAccess) {
    throw new ForbiddenError(
      "No tenés acceso a esta subasta en vivo.",
      access.cannotAccessReason ?? "CATEGORY_NOT_ALLOWED"
    );
  }

  const auctionStatus = mapSubastaStatus(subasta);
  const items = await itemsRepository.listCatalogItemsBySubasta(auctionId);
  let currentItemId = pickCurrentItemId(items, auctionStatus);
  let currentItem = currentItemId
    ? items.find((i) => i.identificador === currentItemId) ?? null
    : null;

  if (!currentItem && auctionStatus === "live") {
    const lastSold = items
      .filter((it) => (it.subastado ?? "no").trim().toLowerCase() === "si")
      .sort((a, b) => b.identificador - a.identificador)[0];
    if (lastSold) {
      currentItem = lastSold;
      currentItemId = lastSold.identificador;
    }
  }

  let currentBid: number | null = null;
  let highestBidderId: number | null = null;
  let highestBidderNumber: number | null = null;
  let minNextBid: number | null = null;
  let maxNextBid: number | null = null;
  let percentLimitsApply = true;

  let winningBidId: number | null = null;

  if (currentItem) {
    const winning = await liveRepo.findWinningBidForItem(currentItem.identificador);
    const basePrice = Number(currentItem.precioBase);
    const currentBest =
      winning != null ? Number(winning.importe) : basePrice;
    currentBid = currentBest;
    winningBidId = winning?.identificador ?? null;
    highestBidderId = winning?.cliente ?? null;
    highestBidderNumber = winning?.numeroPostor ?? null;
    const limits = computeBidLimits(
      currentBest,
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
  const personId = isEmployeeViewer ? NaN : Number.parseInt(authUser.id, 10);
  const cliente =
    !isEmployeeViewer && Number.isFinite(personId)
      ? await usersRepository.findClienteByPersonId(personId)
      : null;
  const isHighestBidder =
    cliente != null && highestBidderId !== null && cliente.identificador === highestBidderId;

  const bidAccess = isEmployeeViewer
    ? employeeOperationalAccessSnapshot()
    : await evaluateAuctionAccess({
        subasta,
        authUser,
        requireLiveSession: true,
      });

  let ownerBlocksBid = false;
  if (currentItem && cliente != null) {
    const ownerId = items.find((i) => i.identificador === currentItem!.identificador)?.duenio ?? null;
    ownerBlocksBid = ownerId != null && ownerId === cliente.identificador;
  }

  let isFinalized = false;
  let resultType: string | null = null;
  let winnerDisplayName: string | null = null;
  let finalAmount: number | null = null;
  let soldItemId: number | null = null;
  let shouldRedirectToResult = false;
  let isCurrentUserWinner = false;

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
        if (resultType === "COMPANY_PURCHASED") {
          winnerDisplayName = "Empresa";
        } else {
          const profile = await usersRepository.findProfileByPersonId(registro.cliente);
          winnerDisplayName =
            profile?.full_name?.trim() || `Postor ${highestBidderNumber ?? ""}`;
          if (cliente != null && cliente.identificador === registro.cliente) {
            isCurrentUserWinner = true;
          }
        }
      } else {
        resultType = "NOT_FINALIZED";
      }
    }
  }

  const schemaLimitations: string[] = ["NO_PERSISTED_LIVE_SESSION"];
  if (currentItemId === null && auctionStatus === "live") {
    schemaLimitations.push("NO_CURRENT_ITEM_FIELD");
  }

  let watchedItem: {
    id: number;
    productId: number;
    catalogDescription: string | null;
    basePrice: number;
    currentHighestBid: number;
    minNextBid: number;
    maxNextBid: number | null;
    percentLimitsApply: boolean;
    isHighestBidder: boolean;
    isCurrentItem: boolean;
  } | null = null;

  if (watchedItemId != null) {
    const watchedRow =
      items.find((i) => i.identificador === watchedItemId) ??
      (await itemsRepository.findCatalogItemById(watchedItemId));
    if (watchedRow && watchedRow.subastaId === auctionId) {
      const winning = await liveRepo.findWinningBidForItem(watchedItemId);
      const basePrice = Number(watchedRow.precioBase);
      const currentBest = winning != null ? Number(winning.importe) : basePrice;
      const limits = computeBidLimits(
        currentBest,
        basePrice,
        subasta.categoria ?? "comun"
      );
      watchedItem = {
        id: watchedItemId,
        productId: watchedRow.producto,
        catalogDescription: watchedRow.descripcionCatalogo,
        basePrice,
        currentHighestBid: currentBest,
        minNextBid: limits.minNextBid,
        maxNextBid: limits.maxNextBid,
        percentLimitsApply: limits.percentLimitsApply,
        isHighestBidder:
          cliente != null && winning != null && winning.cliente === cliente.identificador,
        isCurrentItem: currentItemId === watchedItemId,
      };
    }
  }

  return {
    auctionId,
    status: auctionStatus,
    canAccess: access.canAccess,
    canBid: isEmployeeViewer ? false : isFinalized ? false : bidAccess.canBid && !ownerBlocksBid,
    cannotAccessReason: toPublicAccessDenialCode(access.cannotAccessReason),
    cannotBidReason: isFinalized
      ? "AUCTION_NOT_OPEN"
      : ownerBlocksBid
        ? "OWNER_CANNOT_BID"
        : toPublicAccessDenialCode(bidAccess.cannotBidReason),
    currentItem: currentItem
      ? {
          id: currentItem.identificador,
          productId: currentItem.producto,
          catalogDescription: currentItem.descripcionCatalogo,
          basePrice: Number(currentItem.precioBase),
        }
      : null,
    currentBid,
    currentHighestBid: currentBid,
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
      bidderDisplay: b.numeroPostor,
      isWinning: winningBidId !== null && b.identificador === winningBidId,
    })),
    isHighestBidder,
    isCurrentUserWinner: isFinalized ? isCurrentUserWinner : isHighestBidder,
    liveSessionActive: bidAccess.liveSessionActive,
    serverTime: new Date().toISOString(),
    schemaLimitations,
    isFinalized,
    resultType,
    winnerDisplayName,
    finalAmount,
    soldItemId,
    shouldRedirectToResult,
    watchedItem,
  };
}

export async function getBidHistory(
  auctionId: number,
  authUser: AuthUserContext,
  itemId?: number
) {
  const subasta = await subastasRepository.requireSubastaById(auctionId);
  if (authUser.role !== "empleado") {
    const access = await evaluateAuctionAccess({ subasta, authUser });
    if (!access.canAccess) {
      throw new ForbiddenError(
        "No tenés acceso al historial de esta subasta.",
        access.cannotAccessReason ?? "CATEGORY_NOT_ALLOWED"
      );
    }
  }

  const rows = await liveRepo.listBidHistoryBySubasta(auctionId, itemId);
  let winningBidId: number | null = null;
  if (itemId !== undefined) {
    const winning = await liveRepo.findWinningBidForItem(itemId);
    winningBidId = winning?.identificador ?? null;
  } else if (rows.length > 0) {
    const topAmount = Math.max(...rows.map((r) => Number(r.importe)));
    const leaders = rows.filter((r) => Number(r.importe) === topAmount);
    winningBidId = leaders.reduce(
      (min, r) => (r.identificador < min ? r.identificador : min),
      leaders[0]!.identificador
    );
  }

  return {
    totalBids: rows.length,
    order: "newest_first",
    bids: rows.map((b) => ({
      id: b.identificador,
      itemId: b.item,
      amount: Number(b.importe),
      bidderNumber: b.numeroPostor,
      bidderClientId: b.cliente,
      isWinning: winningBidId !== null && b.identificador === winningBidId,
    })),
  };
}
