import type { AuthUserContext } from "../../shared/types/auth";
import {
  categoryMeetsMinimum,
  isPremiumAuctionCategory,
  parseCategoryRank,
} from "../../shared/domain/auction-categories";
import { isPaymentCurrencyCompatibleWithAuction } from "../../shared/domain/payment-currency";
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "../../shared/errors/httpErrors";
import { findByIdAndCliente } from "../payment-methods/payment-methods.repository";
import {
  requireSubastaById,
  SUBASTA_ESTADO_ABIERTA,
  type SubastaRow,
} from "../subastas/subastas.repository";
import { findClienteByPersonId } from "../users/users.repository";
import type { CreateBidBody } from "./pujos.schema";
import {
  countAsistentesBySubasta,
  findAsistenteByClienteAndSubasta,
  findItemInSubasta,
  getNextNumeroPostor,
  getMaxBidForItem,
  insertAsistente,
  insertBidInTransaction,
  type AsistenteRow,
  type ItemEnSubastaRow,
} from "./pujos.repository";
import type { MedioPagoRow } from "../payment-methods/payment-methods.repository";

export type AssertCanBidResult = {
  clienteId: number;
  subasta: SubastaRow;
  asistente: AsistenteRow;
  item: ItemEnSubastaRow;
  medioPago: MedioPagoRow;
  currentBest: number;
};

function requireClienteAuthUser(authUser: AuthUserContext | undefined): number {
  if (!authUser?.id) {
    throw new UnauthorizedError("No autenticado.", "UNAUTHENTICATED");
  }
  if (authUser.role === "empleado") {
    throw new ForbiddenError("Esta acción no está disponible para empleados.");
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

function assertCategoryAllowed(clientCategory: string, auctionCategory: string | null): void {
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
      "CLIENT_CATEGORY_NOT_ALLOWED"
    );
  }
}

function assertPaymentMethodForBid(
  medio: MedioPagoRow | null,
  auctionCurrency: string,
  bidAmount: number
): MedioPagoRow {
  if (!medio) {
    throw new NotFoundError("Medio de pago no encontrado.", "PAYMENT_METHOD_NOT_FOUND");
  }
  switch (medio.estado) {
    case "pendiente":
      throw new ConflictError(
        "El medio de pago está pendiente de verificación.",
        "PAYMENT_METHOD_PENDING_VERIFICATION"
      );
    case "rechazado":
      throw new ConflictError("El medio de pago fue rechazado.", "PAYMENT_METHOD_REJECTED");
    case "deshabilitado":
      throw new ConflictError("El medio de pago está deshabilitado.", "PAYMENT_METHOD_DISABLED");
    case "verificado":
      break;
    default:
      throw new ConflictError(
        "El medio de pago no está verificado.",
        "PAYMENT_METHOD_NOT_VERIFIED"
      );
  }
  if (!isPaymentCurrencyCompatibleWithAuction(medio, auctionCurrency)) {
    throw new ConflictError(
      "La moneda del medio de pago no coincide con la de la subasta.",
      "PAYMENT_METHOD_CURRENCY_NOT_ALLOWED"
    );
  }
  if (medio.tipo === "cheque_certificado") {
    if (medio.montoDisponible == null) {
      throw new ConflictError(
        "El cheque certificado no tiene monto disponible configurado.",
        "PAYMENT_METHOD_INSUFFICIENT_FUNDS"
      );
    }
    if (Number(medio.montoDisponible) < bidAmount) {
      throw new ConflictError(
        "El monto disponible del cheque certificado es insuficiente para esta puja.",
        "PAYMENT_METHOD_INSUFFICIENT_FUNDS"
      );
    }
  }
  return medio;
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
      "BID_AMOUNT_TOO_LOW"
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
      "BID_AMOUNT_TOO_LOW"
    );
  }
  if (amount > maxAllowed) {
    throw new ConflictError(
      "El importe supera el máximo permitido para esta subasta.",
      "BID_AMOUNT_TOO_HIGH"
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

  const medioPago = await findByIdAndCliente(params.paymentMethodId, cliente.identificador);
  const medio = assertPaymentMethodForBid(medioPago, auctionCurrency, params.amount);

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
    medioPago: medio,
    currentBest,
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

  const numeroPostor = await getNextNumeroPostor(auctionId);
  try {
    return await insertAsistente(cliente.identificador, auctionId, numeroPostor);
  } catch (err) {
    const { number } = err as { number?: number };
    if (number === 2627 || number === 2601) {
      const again = await findAsistenteByClienteAndSubasta(cliente.identificador, auctionId);
      if (again) {
        return again;
      }
      throw new ConflictError(
        "No se pudo registrar el asistente por conflicto.",
        "ASSISTANT_REGISTRATION_CONFLICT"
      );
    }
    throw err;
  }
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
    validateAmount: validateBidAmountRules,
  });

  return {
    id: row.identificador,
    auctionId,
    itemId: row.item,
    amount: Number(row.importe),
    assistantId: row.asistente,
    paymentMethodId: ctx.medioPago.identificador,
    winner: row.ganador,
  };
}
