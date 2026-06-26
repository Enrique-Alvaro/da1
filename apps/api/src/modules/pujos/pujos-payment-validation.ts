import { isPaymentCurrencyCompatibleWithAuction } from "../../shared/domain/payment-currency";
import { ConflictError, NotFoundError } from "../../shared/errors/httpErrors";

/** Campos mínimos del medio de pago para autorizar una puja. */
export type MedioPagoBidRow = {
  identificador: number;
  cliente: number;
  tipo: string;
  estado: string;
  moneda: string;
  montoDisponible: number | null;
};

export const INSUFFICIENT_FUNDS_MESSAGE =
  "No tenés fondos suficientes para realizar esta puja.";

/**
 * Fondos disponibles = mediosPago.montoDisponible − pujas líderes activas en otros ítems.
 * El ítem en curso se excluye del compromiso porque la nueva puja reemplaza la exposición local.
 */
export function assertPaymentMethodForBid(
  medio: MedioPagoBidRow | null,
  auctionCurrency: string,
  bidAmount: number,
  options?: { committedExposure?: number }
): MedioPagoBidRow {
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
      "PAYMENT_METHOD_CURRENCY_MISMATCH"
    );
  }
  if (medio.montoDisponible == null) {
    throw new ConflictError(INSUFFICIENT_FUNDS_MESSAGE, "PAYMENT_METHOD_INSUFFICIENT_FUNDS");
  }
  const available = Number(medio.montoDisponible);
  if (!Number.isFinite(available) || available <= 0) {
    throw new ConflictError(INSUFFICIENT_FUNDS_MESSAGE, "PAYMENT_METHOD_INSUFFICIENT_FUNDS");
  }
  const exposure = options?.committedExposure ?? 0;
  const totalCommitted = exposure + bidAmount;
  if (totalCommitted > available) {
    throw new ConflictError(INSUFFICIENT_FUNDS_MESSAGE, "PAYMENT_METHOD_INSUFFICIENT_FUNDS");
  }
  return medio;
}
