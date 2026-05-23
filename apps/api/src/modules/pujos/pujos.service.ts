import type { AuthUserContext } from "../../shared/types/auth";
import {
  categoryMeetsMinimum,
  isPremiumAuctionCategory,
  parseCategoryRank,
} from "../../shared/domain/auction-categories";
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
  SUBASTA_ESTADO_ABIERTA,
  type SubastaRow,
} from "../subastas/subastas.repository";
import { findClienteByPersonId } from "../users/users.repository";
import type { CreateBidBody } from "./pujos.schema";
import { assertPaymentMethodForBid } from "./pujos-payment-validation";
import * as liveSessionStore from "../subastas/live-session.store";
import { computeBidLimits } from "../subastas/subastas-bid-limits";
import {
  countAsistentesBySubasta,
  findAsistenteByClienteAndSubasta,
  findItemInSubasta,
  getMaxBidForItem,
  insertAsistenteInTransaction,
  insertBidInTransaction,
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
      "CLIENT_NOT_APPROVED"
    );
  }
}

function assertSubastaAbierta(subasta: SubastaRow): void {
  const estado = (subasta.estado ?? "").trim().toLowerCase();
  if (estado !== SUBASTA_ESTADO_ABIERTA) {
    throw new ConflictError("La subasta no está abierta.", "AUCTION_NOT_OPEN");
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

export function assertCategoryAllowed(clientCategory: string, auctionCategory: string | null): void {
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
  if (amount <= currentBest) {
    throw new ConflictError(
      "El importe debe superar la mejor oferta actual.",
      "BID_TOO_LOW"
    );
  }
  if (isPremiumAuctionCategory(auctionCategory)) {
    return;
  }
  const minAllowed = currentBest + basePrice * 0.01;
  const maxAllowed = currentBest + basePrice * 0.2;
  if (amount < minAllowed) {
    throw new ConflictError(
      "El importe está por debajo del mínimo permitido para esta subasta.",
      "BID_TOO_LOW"
    );
  }
  if (amount > maxAllowed) {
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
  assertSubastaAbierta(subasta);
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

  const medioPagoRow = await findByIdAndCliente(params.paymentMethodId, cliente.identificador);
  assertPaymentMethodForBid(medioPagoRow, auctionCurrency, params.amount);
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
