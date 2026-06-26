import type { AuthUserContext } from "../../shared/types/auth";
import { categoryMeetsMinimum, parseCategoryRank } from "../../shared/domain/auction-categories";
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "../../shared/errors/httpErrors";
import { findByIdAndCliente } from "../payment-methods/payment-methods.repository";
import type { MedioPagoRow } from "../payment-methods/payment-methods.repository";
import {
  requireSubastaById,
  type SubastaRow,
} from "../subastas/subastas.repository";
import { findClienteByPersonId } from "../users/users.repository";
import { MAX_BID_AMOUNT, type CreateBidBody } from "./pujos.schema";
import { assertPaymentMethodForBid } from "./pujos-payment-validation";
import * as liveSessionStore from "../subastas/live-session.store";
import { computeBidLimits } from "../subastas/subastas-bid-limits";
import { pickCurrentItemId } from "../subastas/subastas-current-item";
import { mapSubastaStatus, isDbEstadoAbierta } from "../subastas/subastas-access.service";
import { listCatalogItemsBySubasta, type CatalogItemRow } from "../subastas/subastas-items.repository";
import * as liveRepo from "../subastas/subastas-live.repository";
import * as closingRepository from "../subastas/subastas-closing.repository";
import { notifyOutbid, notifyLeadingBid } from "../notifications/notifications.events";
import {
  countAsistentesBySubasta,
  findAsistenteByClienteAndSubasta,
  findItemInSubasta,
  getMaxBidForItem,
  insertAsistenteInTransaction,
  insertBidInTransaction,
  sumLeadingBidExposureForCliente,
  type AsistenteRow,
  type ItemEnSubastaRow,
} from "./pujos.repository";

export type AssertCanBidResult = {
  clienteId: number;
  subasta: SubastaRow;
  asistente: AsistenteRow;
  item: ItemEnSubastaRow;
  medioPago: MedioPagoRow;
  currentBest: number;
  auctionCurrency: string;
};

function requireClienteAuthUser(authUser: AuthUserContext | undefined): number {
  if (!authUser?.id) {
    throw new UnauthorizedError("No autenticado.", "UNAUTHENTICATED");
  }
  if (authUser.role === "empleado") {
    throw new ForbiddenError(
      "Esta acción no está disponible para empleados.",
      "CLIENT_AUTH_REQUIRED"
    );
  }
  const personId = Number.parseInt(authUser.id, 10);
  if (!Number.isFinite(personId) || personId <= 0) {
    throw new UnauthorizedError("Token inválido.", "UNAUTHENTICATED");
  }
  return personId;
}

function assertClienteAdmitted(admitido: string): void {
  if (admitido.trim().toLowerCase() !== "si") {
    throw new ForbiddenError(
      "El cliente no está admitido por la empresa para participar en subastas.",
      "USER_NOT_ADMITTED"
    );
  }
}

function assertSubastaAbierta(subasta: SubastaRow, items?: CatalogItemRow[]): void {
  if (mapSubastaStatus(subasta, items) !== "live") {
    throw new ConflictError("La subasta no está abierta.", "AUCTION_NOT_OPEN");
  }
  if (!isDbEstadoAbierta(subasta)) {
    throw new ConflictError("La subasta no está abierta.", "AUCTION_NOT_OPEN");
  }
}

function assertNotItemOwner(clienteId: number, ownerPersonId: number | null | undefined): void {
  if (ownerPersonId != null && clienteId === ownerPersonId) {
    throw new ForbiddenError(
      "No podés pujar sobre un artículo propio.",
      "OWNER_CANNOT_BID"
    );
  }
}

function assertBidAmountFinite(amount: number): void {
  if (!Number.isFinite(amount) || Number.isNaN(amount) || amount <= 0) {
    throw new ConflictError("El importe de la puja no es válido.", "BID_AMOUNT_INVALID");
  }
  if (amount > MAX_BID_AMOUNT) {
    throw new ConflictError("El importe supera el máximo permitido.", "BID_TOO_HIGH");
  }
}

function assertSubastaMoneda(subasta: SubastaRow): string {
  const moneda = subasta.moneda?.trim().toUpperCase();
  if (!moneda || (moneda !== "ARS" && moneda !== "USD")) {
    throw new InternalServerError(
      "La subasta no tiene moneda configurada. Aplique la migración 001."
    );
  }
  return moneda;
}

export function assertCategoryAllowed(clientCategory: string | null, auctionCategory: string | null): void {
  if (!auctionCategory) {
    throw new ConflictError("La subasta no tiene categoría válida.", "AUCTION_CATEGORY_INVALID");
  }
  if (!parseCategoryRank(clientCategory)) {
    throw new ConflictError("Categoría de cliente inválida.", "CLIENT_CATEGORY_INVALID");
  }
  if (!parseCategoryRank(auctionCategory)) {
    throw new ConflictError("Categoría de subasta inválida.", "AUCTION_CATEGORY_INVALID");
  }
  if (!categoryMeetsMinimum(clientCategory, auctionCategory)) {
    throw new ForbiddenError(
      "La categoría del cliente no permite participar en esta subasta.",
      "CATEGORY_NOT_ALLOWED"
    );
  }
}

function assertLiveSessionForBid(clienteId: number, auctionId: number): void {
  const active = liveSessionStore.getActiveAuctionId(clienteId);
  if (active === null) {
    throw new ForbiddenError(
      "Debés ingresar a la sala en vivo antes de pujar.",
      "LIVE_SESSION_REQUIRED"
    );
  }
  if (active !== auctionId) {
    throw new ConflictError(
      "Tenés una sesión activa en otra subasta.",
      "LIVE_SESSION_OTHER_AUCTION"
    );
  }
}

export function validateBidAmountRules(
  amount: number,
  currentBest: number,
  basePrice: number,
  auctionCategory: string
): void {
  assertBidAmountFinite(amount);
  if (!Number.isFinite(currentBest) || !Number.isFinite(basePrice) || basePrice <= 0) {
    throw new ConflictError("No se pudo validar los límites de puja.", "BID_VALIDATION_ERROR");
  }
  const limits = computeBidLimits(currentBest, basePrice, auctionCategory);
  if (amount <= limits.currentBest) {
    throw new ConflictError(
      "Otra oferta superó tu monto antes de registrar la puja.",
      "BID_NOT_HIGHEST"
    );
  }
  if (limits.maxNextBid === null) {
    if (amount < limits.minNextBid) {
      throw new ConflictError(
        "El importe está por debajo del mínimo permitido para esta subasta.",
        "BID_BELOW_MIN"
      );
    }
    return;
  }
  if (amount < limits.minNextBid) {
    throw new ConflictError(
      "El importe está por debajo del mínimo permitido para esta subasta.",
      "BID_BELOW_MIN"
    );
  }
  if (amount > limits.maxNextBid) {
    throw new ConflictError(
      "El importe supera el máximo permitido para esta subasta.",
      "BID_TOO_HIGH"
    );
  }
}

export async function resolveCurrentBestForItem(
  itemId: number,
  basePrice: number
): Promise<number> {
  const max = await getMaxBidForItem(itemId);
  return max != null ? max : Number(basePrice);
}

export async function assertCanBid(params: {
  authUser: AuthUserContext | undefined;
  auctionId: number;
  itemId: number;
  amount: number;
  paymentMethodId: number;
}): Promise<AssertCanBidResult> {
  const personId = requireClienteAuthUser(params.authUser);

  const cliente = await findClienteByPersonId(personId);
  if (!cliente) {
    throw new ForbiddenError("Cliente no encontrado.", "CLIENT_NOT_FOUND");
  }
  assertClienteAdmitted(cliente.admitido);
  assertLiveSessionForBid(cliente.identificador, params.auctionId);

  const subasta = await requireSubastaById(params.auctionId);
  const catalogItems = await listCatalogItemsBySubasta(params.auctionId);
  assertSubastaAbierta(subasta, catalogItems);
  const auctionCurrency = assertSubastaMoneda(subasta);
  assertCategoryAllowed(cliente.categoria, subasta.categoria);

  const asistente = await findAsistenteByClienteAndSubasta(cliente.identificador, params.auctionId);
  if (!asistente) {
    throw new ForbiddenError(
      "Debe inscribirse como asistente de la subasta antes de pujar.",
      "AUCTION_ATTENDANCE_REQUIRED"
    );
  }

  const item = await findItemInSubasta(params.itemId, params.auctionId);
  if (!item) {
    throw new NotFoundError("Ítem no encontrado en esta subasta.", "ITEM_NOT_FOUND");
  }
  assertNotItemOwner(cliente.identificador, item.ownerPersonId);

  const auctionLiveStatus = mapSubastaStatus(subasta, catalogItems);
  const currentItemId = pickCurrentItemId(catalogItems, auctionLiveStatus);
  if (currentItemId !== null && params.itemId !== currentItemId) {
    throw new ConflictError(
      "Solo se puede pujar por el ítem en curso de la subasta.",
      "ITEM_NOT_CURRENT"
    );
  }

  const medioPagoRow = await findByIdAndCliente(params.paymentMethodId, cliente.identificador);
  const committedExposure = await sumLeadingBidExposureForCliente(
    cliente.identificador,
    params.itemId
  );
  assertPaymentMethodForBid(medioPagoRow, auctionCurrency, params.amount, {
    committedExposure,
  });
  if (!medioPagoRow) {
    throw new NotFoundError("Medio de pago no encontrado.", "PAYMENT_METHOD_NOT_FOUND");
  }

  const basePrice = Number(item.precioBase);
  const currentBest = await resolveCurrentBestForItem(params.itemId, basePrice);
  validateBidAmountRules(
    params.amount,
    currentBest,
    basePrice,
    subasta.categoria ?? ""
  );

  return {
    clienteId: cliente.identificador,
    subasta,
    asistente,
    item,
    medioPago: medioPagoRow,
    currentBest,
    auctionCurrency,
  };
}

export async function registerAsistenteForAuction(
  authUser: AuthUserContext | undefined,
  auctionId: number
): Promise<AsistenteRow> {
  const personId = requireClienteAuthUser(authUser);

  const cliente = await findClienteByPersonId(personId);
  if (!cliente) {
    throw new ForbiddenError("Cliente no encontrado.", "CLIENT_NOT_FOUND");
  }
  assertClienteAdmitted(cliente.admitido);

  const subasta = await requireSubastaById(auctionId);
  assertSubastaAbierta(subasta);
  assertCategoryAllowed(cliente.categoria, subasta.categoria);

  const existing = await findAsistenteByClienteAndSubasta(cliente.identificador, auctionId);
  if (existing) {
    return existing;
  }

  if (subasta.capacidadAsistentes != null && subasta.capacidadAsistentes > 0) {
    const count = await countAsistentesBySubasta(auctionId);
    if (count >= subasta.capacidadAsistentes) {
      throw new ConflictError(
        "La subasta alcanzó la capacidad máxima de asistentes.",
        "AUCTION_CAPACITY_FULL"
      );
    }
  }

  return insertAsistenteInTransaction(cliente.identificador, auctionId);
}

export async function createBid(
  authUser: AuthUserContext | undefined,
  auctionId: number,
  body: CreateBidBody
) {
  const ctx = await assertCanBid({
    authUser,
    auctionId,
    itemId: body.itemId,
    amount: body.amount,
    paymentMethodId: body.paymentMethodId,
  });

  const basePrice = Number(ctx.item.precioBase);

  const previousWinning = await liveRepo.findWinningBidForItem(body.itemId);

  const row = await insertBidInTransaction({
    asistenteId: ctx.asistente.identificador,
    itemId: body.itemId,
    importe: body.amount,
    basePrice,
    auctionCategory: ctx.subasta.categoria ?? "",
    clienteId: ctx.clienteId,
    paymentMethodId: body.paymentMethodId,
    auctionCurrency: ctx.auctionCurrency,
    validateAmount: validateBidAmountRules,
  });

  const currentBest = Number(row.importe);
  const limits = computeBidLimits(
    currentBest,
    basePrice,
    ctx.subasta.categoria ?? "comun"
  );

  const itemCtx = await closingRepository.findItemCloseContext(auctionId, body.itemId);
  const itemTitle = itemCtx?.descripcionCatalogo?.trim() || `Artículo #${body.itemId}`;

  if (
    previousWinning &&
    previousWinning.cliente !== ctx.clienteId &&
    Number(previousWinning.importe) < body.amount
  ) {
    void notifyOutbid({
      outbidClienteId: previousWinning.cliente,
      auctionId,
      itemId: body.itemId,
      itemTitle,
      newAmount: body.amount,
      currency: ctx.auctionCurrency,
      bidId: row.identificador,
    });
  }

  void notifyLeadingBid({
    clienteId: ctx.clienteId,
    auctionId,
    itemId: body.itemId,
    itemTitle,
    amount: body.amount,
    currency: ctx.auctionCurrency,
    bidId: row.identificador,
  });

  return {
    id: row.identificador,
    auctionId,
    itemId: row.item,
    userId: ctx.clienteId,
    amount: currentBest,
    assistantId: row.asistente,
    paymentMethodId: ctx.medioPago.identificador,
    isWinning: true,
    currentHighestBid: currentBest,
    minNextBid: limits.minNextBid,
    maxNextBid: limits.maxNextBid,
    percentLimitsApply: limits.percentLimitsApply,
    serverTime: new Date().toISOString(),
    winner: row.ganador,
  };
}
